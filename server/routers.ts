import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { geocodeAddress, reverseGeocodeCoordinates, calculateDistance, isValidCoordinates } from "./geocoding";
import { driverRouter } from "./driverRouter";

export const appRouter = router({
  system: systemRouter,
  driver: driverRouter,
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

  // Menu Categories
  menu: router({
    categories: router({
      list: publicProcedure.query(async () => {
        return db.getMenuCategories();
      }),
      create: protectedProcedure
        .input(z.object({
          name: z.string(),
          description: z.string().optional(),
          displayOrder: z.number().optional(),
        }))
        .mutation(async ({ input }) => {
          return db.createMenuCategory(input);
        }),
      update: protectedProcedure
        .input(z.object({
          id: z.number(),
          name: z.string().optional(),
          description: z.string().optional(),
          displayOrder: z.number().optional(),
          isActive: z.boolean().optional(),
        }))
        .mutation(async ({ input }) => {
          const { id, ...data } = input;
          return db.updateMenuCategory(id, data);
        }),
      delete: protectedProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input }) => {
          return db.deleteMenuCategory(input.id);
        }),
    }),
    items: router({
      list: publicProcedure
        .input(z.object({ categoryId: z.number().optional() }).optional())
        .query(async ({ input }) => {
          return db.getMenuItems(input?.categoryId);
        }),
      create: protectedProcedure
        .input(z.object({
          categoryId: z.number(),
          name: z.string(),
          description: z.string().optional(),
          price: z.number(),
          imageUrl: z.string().optional(),
          displayOrder: z.number().optional(),
        }))
        .mutation(async ({ input }) => {
          return db.createMenuItem({
            ...input,
            price: input.price as any,
          });
        }),
      update: protectedProcedure
        .input(z.object({
          id: z.number(),
          categoryId: z.number().optional(),
          name: z.string().optional(),
          description: z.string().optional(),
          price: z.number().optional(),
          imageUrl: z.string().optional(),
          isAvailable: z.boolean().optional(),
          displayOrder: z.number().optional(),
        }))
        .mutation(async ({ input }) => {
          const { id, ...data } = input;
          return db.updateMenuItem(id, {
            ...data,
            price: data.price as any,
          });
        }),
      delete: protectedProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input }) => {
          return db.deleteMenuItem(input.id);
        }),
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
        return db.createDriver({
          ...input,
          currentLatitude: input.latitude as any,
          currentLongitude: input.longitude as any,
        });
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
        const { id, ...data } = input;
        return db.updateDriver(id, {
          ...data,
          currentLatitude: data.latitude as any,
          currentLongitude: data.longitude as any,
        });
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return db.deleteDriver(input.id);
      }),
  }),

  // Customers
  customers: router({
    create: publicProcedure
      .input(z.object({
        name: z.string(),
        phone: z.string(),
        address: z.string(),
        latitude: z.number().optional(),
        longitude: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        return db.createCustomer({
          ...input,
          latitude: input.latitude as any,
          longitude: input.longitude as any,
        });
      }),
    getById: publicProcedure
      .input(z.object({ customerId: z.number() }))
      .query(async ({ input }) => {
        return db.getCustomerById(input.customerId);
      }),
    update: protectedProcedure
      .input(z.object({
        customerId: z.number(),
        name: z.string().optional(),
        phone: z.string().optional(),
        address: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { customerId, ...updateData } = input;
        return db.updateCustomer(customerId, updateData as any);
      }),
  }),

  // Orders
  orders: router({
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
        const order = await db.createOrder({
          customerId: input.customerId,
          subtotal: input.subtotal as any,
          taxPercentage: input.taxPercentage as any,
          taxAmount: input.taxAmount as any,
          totalPrice: input.totalPrice as any,
          notes: input.notes,
          area: input.area,
          deliveryTime: input.hasDeliveryTime ? input.deliveryTime : null,
          hasDeliveryTime: input.hasDeliveryTime,
        });
        
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
    updateStatus: protectedProcedure
      .input(z.object({
        orderId: z.number(),
        status: z.enum(["Pending", "Ready", "On the Way", "Delivered", "Returning to Restaurant", "At Restaurant"]),
      }))
      .mutation(async ({ input }) => {
        return db.updateOrderStatus(input.orderId, input.status);
      }),
    assignDriver: protectedProcedure
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
        
        // Update customer information if provided
        if (customerId && (customerName || customerPhone || customerAddress)) {
          await db.updateCustomer(customerId, {
            name: customerName,
            phone: customerPhone,
            address: customerAddress,
          } as any);
        }
        
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
