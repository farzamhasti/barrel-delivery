import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router, systemAdminProcedure, adminOrSystemAdminProcedure } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { geocodeAddress, reverseGeocodeCoordinates, calculateDistance, isValidCoordinates } from "./geocoding";
import { processReceiptImage } from "./_core/imageEnhancement";
// Driver router removed - using simplified tracking model

export const appRouter = router({
  system: systemRouter,
  // driver: driverRouter, // Removed - using simplified tracking model
  kitchen: router({
    getDeliveryReportMetrics: protectedProcedure
      .input(z.object({
        startDate: z.date(),
        endDate: z.date(),
      }))
      .query(async ({ input }) => {
        return db.getDeliveryReportMetrics(input.startDate, input.endDate);
      }),
    getOrderTimelines: protectedProcedure
      .input(z.object({
        startDate: z.date(),
        endDate: z.date(),
      }))
      .query(async ({ input }) => {
        return db.getOrderTimelinesForReport(input.startDate, input.endDate);
      }),
  }),
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),


  // Drivers
  drivers: router({
    list: publicProcedure.query(async () => {
      return db.getDrivers();
    }),
    create: protectedProcedure
      .input(z.object({
        name: z.string(),
        phone: z.string(),
        email: z.string().optional(),
        licenseNumber: z.string().optional(),
        vehicleType: z.string().optional(),
        latitude: z.number().optional(),
        longitude: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { latitude, longitude, ...driverData } = input;
        return db.createDriver(driverData);
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().optional(),
        licenseNumber: z.string().optional(),
        vehicleType: z.string().optional(),
        isActive: z.boolean().optional(),
        latitude: z.number().optional(),
        longitude: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, latitude, longitude, ...data } = input;
        return db.updateDriver(id, data);
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return db.deleteDriver(input.id);
      }),
    saveReturnTime: protectedProcedure
      .input(z.object({
        driverId: z.number(),
        totalSeconds: z.number(),
      }))
      .mutation(async ({ input }) => {
        return db.saveReturnTime(input.driverId, input.totalSeconds);
      }),
    getReturnTime: publicProcedure
      .input(z.object({ driverId: z.number() }))
      .query(async ({ input }) => {
        return db.getReturnTime(input.driverId);
      }),
    clearReturnTime: protectedProcedure
      .input(z.object({
        driverId: z.number(),
        reason: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return db.clearReturnTime(input.driverId, input.reason);
      }),
    getReturnTimeHistory: protectedProcedure
      .input(z.object({
        driverId: z.number(),
        limit: z.number().optional(),
      }))
      .query(async ({ input }) => {
        return db.getReturnTimeHistory(input.driverId, input.limit || 10);
      }),
  }),



  // Orders
  orders: router({
    createFromReceipt: publicProcedure
      .input(z.object({
        orderNumber: z.string(),
        customerAddress: z.string(),
        customerPhone: z.string(),
        area: z.enum(['DN', 'CP', 'B']),
        deliveryTime: z.string().optional(),
        hasDeliveryTime: z.boolean().default(false),
        receiptText: z.string().optional(),
        receiptImage: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        // Convert time string (HH:MM format) to proper timestamp
        let deliveryTimeValue: Date | null = null;
        if (input.hasDeliveryTime && input.deliveryTime) {
          const today = new Date();
          const [hours, minutes] = input.deliveryTime.split(':');
          today.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
          deliveryTimeValue = today;
        }
        
        // Process receipt image if provided
        let processedReceiptImage = input.receiptImage;
        if (input.receiptImage) {
          try {
            // Convert base64 to buffer
            const base64Data = input.receiptImage.replace(/^data:image\/[a-z]+;base64,/, '');
            const imageBuffer = Buffer.from(base64Data, 'base64');
            
            // Process the image (enhance quality)
            const enhancedBuffer = await processReceiptImage(imageBuffer);
            
            // Convert back to base64
            processedReceiptImage = 'data:image/jpeg;base64,' + enhancedBuffer.toString('base64');
            console.log('[orders.createFromReceipt] Receipt image processed successfully');
          } catch (error) {
            console.error('[orders.createFromReceipt] Error processing receipt image:', error);
            // Continue with original image if processing fails
          }
        }
        
        // Build order data with new schema fields
        const orderData: any = {
          orderNumber: input.orderNumber,
          customerAddress: input.customerAddress,
          customerPhone: input.customerPhone,
          area: input.area,
          deliveryTime: deliveryTimeValue,
          hasDeliveryTime: input.hasDeliveryTime,
          receiptText: input.receiptText,
          receiptImage: processedReceiptImage,
          status: 'Pending',
          driverId: null,
          subtotal: 0,
          taxPercentage: 0,
          taxAmount: 0,
          totalPrice: 0,
        };
        
        console.log('[orders.createFromReceipt] Order data:', JSON.stringify(orderData, null, 2));
        const order = await db.createOrder(orderData);
        console.log('[orders.createFromReceipt] Order created successfully:', order)
        
        return order;
      }),

    list: publicProcedure
      .input(z.object({ driverId: z.number().optional() }).optional())
      .query(async ({ input }) => {
        return db.getOrdersWithCustomer(input?.driverId);
      }),

    getByDateRange: publicProcedure
      .input(z.object({
        startDate: z.string().or(z.date()),
        endDate: z.string().or(z.date()),
        driverId: z.number().optional(),
      }))
      .query(async ({ input }) => {
        const startDate = typeof input.startDate === 'string' ? new Date(input.startDate) : input.startDate;
        const endDate = typeof input.endDate === 'string' ? new Date(input.endDate) : input.endDate;
        return db.getOrdersByDateRange(startDate, endDate, input.driverId);
      }),

    getTodayOrdersWithItems: publicProcedure
      .query(async () => {
        console.log('[getTodayOrdersWithItems procedure] Query called');
        const result = await db.getTodayOrdersWithItems();
        console.log('[getTodayOrdersWithItems procedure] Returning', result.length, 'orders');
        return result;
      }),
    getActiveOrders: publicProcedure
      .query(async () => {
        const today = new Date();
        const startOfDay = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 0, 0, 0, 0));
        const endOfDay = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + 1, 0, 0, 0, 0));
        return db.getOrdersByDateRange(startOfDay, endOfDay);
      }),


    getTodayOrdersForDriver: publicProcedure
      .input(z.object({ driverId: z.number() }))
      .query(async ({ input }) => {
        const today = new Date();
        const startOfDay = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 0, 0, 0, 0));
        const endOfDay = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + 1, 0, 0, 0, 0));
        return db.getOrdersByDateRange(startOfDay, endOfDay, input.driverId);
      }),
    create: publicProcedure
      .input(z.object({
        customerId: z.number(),
        subtotal: z.number(),
        taxPercentage: z.number().default(13),
        taxAmount: z.number(),
        totalPrice: z.number(),
        notes: z.string().optional(),
        area: z.string().optional(),
        deliveryTime: z.date().optional(),
        hasDeliveryTime: z.boolean().default(false),
        items: z.array(z.object({
          menuItemId: z.number(),
          quantity: z.number(),
          priceAtOrder: z.number(),
        })),
      }))
      .mutation(async ({ input }) => {
        // Build order data, only including area if it has a value
        const orderData: any = {
          customerId: input.customerId,
          subtotal: input.subtotal as any,
          taxPercentage: input.taxPercentage as any,
          taxAmount: input.taxAmount as any,
          totalPrice: input.totalPrice as any,
          notes: input.notes,
          deliveryTime: input.hasDeliveryTime ? input.deliveryTime : null,
          hasDeliveryTime: input.hasDeliveryTime,
        };
        
        // Only include area if it's not empty
        if (input.area && typeof input.area === 'string' && input.area.trim()) {
          orderData.area = input.area.trim();
        }
        
        console.log('[orders.create] Order data:', JSON.stringify(orderData, null, 2));
        const order = await db.createOrder(orderData);
        console.log('[orders.create] Order created successfully:', order)
        
        // Create order items
        // Extract orderId from the order object
        let orderId: number | undefined;
        if (order && typeof order === 'object') {
          // New format: full order object with id property
          orderId = (order as any)?.id || (order as any)?.insertId;
        }
        if (!orderId && Array.isArray(order)) {
          // Fallback for array format: [ResultSetHeader, undefined]
          orderId = (order as any)[0]?.insertId;
        }
        
        // Only create items if we have a valid orderId
        if (orderId) {
          for (const item of input.items) {
            await db.createOrderItem({
              orderId,
              menuItemId: item.menuItemId,
              quantity: item.quantity,
              priceAtOrder: item.priceAtOrder as any,
            });
          }
        } else {
          console.error('[Orders] Failed to extract orderId from insert response:', order);
        }
        
        return order;
      }),
    updateStatus: adminOrSystemAdminProcedure
      .input(z.object({
        orderId: z.number(),
        status: z.enum(["Pending", "Ready", "On the Way", "Delivered", "Returning to Restaurant", "At Restaurant"]),
      }))
      .mutation(async ({ input }) => {
        return db.updateOrderStatus(input.orderId, input.status);
      }),
    assignDriver: adminOrSystemAdminProcedure
      .input(z.object({
        orderId: z.number(),
        driverId: z.number(),
      }))
      .mutation(async ({ input }) => {
        return db.assignOrderToDriver(input.orderId, input.driverId);
      }),
    getById: publicProcedure
      .input(z.object({ orderId: z.number() }))
      .query(async ({ input }) => {
        return db.getOrderWithItems(input.orderId);
      }),
    update: protectedProcedure
      .input(z.object({
        orderId: z.number(),
        customerId: z.number().optional(),
        totalPrice: z.number().optional(),
        notes: z.string().optional(),
        status: z.enum(["Pending", "Ready", "On the Way", "Delivered"]).optional(),
        customerName: z.string().optional(),
        customerPhone: z.string().optional(),
        customerAddress: z.string().optional(),
        area: z.string().optional(),
        deliveryTime: z.string().nullable().optional(),
        hasDeliveryTime: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { orderId, customerId, customerName, customerPhone, customerAddress, deliveryTime, hasDeliveryTime, ...updateData } = input;
        
        // Customer info is now stored directly in orders table
        
        // Convert deliveryTime string to Date if provided
        const processedData = { ...updateData } as any;
        if (deliveryTime !== undefined) {
          if (deliveryTime) {
            const parsedDate = new Date(deliveryTime);
            // Validate that the date is valid
            if (!isNaN(parsedDate.getTime())) {
              processedData.deliveryTime = parsedDate;
              processedData.hasDeliveryTime = true;
            } else {
              throw new Error('Invalid delivery time format');
            }
          } else {
            processedData.deliveryTime = null;
            processedData.hasDeliveryTime = false;
          }
        }
        
        // Also handle hasDeliveryTime if provided separately
        if (hasDeliveryTime !== undefined) {
          processedData.hasDeliveryTime = hasDeliveryTime;
        }
        
        // Update order
        return db.updateOrder(orderId, processedData);
      }),
    updateItem: protectedProcedure
      .input(z.object({
        itemId: z.number(),
        quantity: z.number().optional(),
        priceAtOrder: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { itemId, quantity, priceAtOrder } = input;
        if (quantity === undefined || priceAtOrder === undefined) {
          throw new Error("Both quantity and priceAtOrder are required");
        }
        return db.updateOrderItem(itemId, quantity, priceAtOrder);
      }),
    deleteItem: protectedProcedure
      .input(z.object({ itemId: z.number() }))
      .mutation(async ({ input }) => {
        return db.deleteOrderItem(input.itemId);
      }),
    delete: protectedProcedure
      .input(z.object({ orderId: z.number() }))
      .mutation(async ({ input }) => {
        return db.deleteOrder(input.orderId);
      }),
    createItem: protectedProcedure
      .input(z.object({
        orderId: z.number(),
        menuItemId: z.number(),
        quantity: z.number().min(1),
        priceAtOrder: z.number().min(0),
      }))
      .mutation(async ({ input }) => {
        return db.createOrderItem(input as any);
      }),
  }),

  // Reservations
  reservations: router({
    create: adminOrSystemAdminProcedure
      .input(z.object({
        customerName: z.string(),
        customerPhone: z.string(),
        customerEmail: z.string().optional(),
        reservationDate: z.string(),
        partySize: z.number().min(1),
        specialRequests: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return db.createReservation({
          customerName: input.customerName,
          customerPhone: input.customerPhone,
          customerEmail: input.customerEmail,
          reservationDate: new Date(input.reservationDate),
          partySize: input.partySize,
          specialRequests: input.specialRequests,
          status: "Pending",
        } as any);
      }),
    list: protectedProcedure.query(async () => {
      return db.getReservations();
    }),
    updateStatus: adminOrSystemAdminProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["Pending", "Confirmed", "Cancelled"]),
      }))
      .mutation(async ({ input }) => {
        return db.updateReservationStatus(input.id, input.status);
      }),
  }),
  // Geocoding and Maps
  maps: router({
    geocode: protectedProcedure
        .input(z.object({ address: z.string() }))
        .mutation(async ({ input }) => {
          return geocodeAddress(input.address);
        }),
    reverseGeocode: protectedProcedure
        .input(z.object({
          latitude: z.number(),
          longitude: z.number(),
        }))
        .mutation(async ({ input }) => {
          return reverseGeocodeCoordinates(input.latitude, input.longitude);
        }),
    calculateDistance: publicProcedure
        .input(z.object({
          lat1: z.number(),
          lng1: z.number(),
          lat2: z.number(),
          lng2: z.number(),
        }))
        .query(({ input }) => {
          return {
            distance: calculateDistance(input.lat1, input.lng1, input.lat2, input.lng2),
          };
        }),
    validateCoordinates: publicProcedure
        .input(z.object({
          latitude: z.number(),
          longitude: z.number(),
        }))
        .query(({ input }) => {
          return {
            valid: isValidCoordinates(input.latitude, input.longitude),
          };
        }),
  }),
});

export type AppRouter = typeof appRouter;
