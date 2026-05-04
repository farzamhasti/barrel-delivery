import { publicProcedure, protectedProcedure, router } from './_core/trpc';
import { z } from 'zod';
import path from 'path';
import fs from 'fs';
import { eq } from 'drizzle-orm';
import { convertOntarioTimeToUTC } from './timezoneHelper';
import * as db from './db';
import { getDb } from './db';
import { createNotification } from './notifications';
import { storePushSubscription, removePushSubscription, sendPushNotification } from './push-service';

export const appRouter = router({
  places: router({
    autocomplete: publicProcedure
      .input(z.object({
        input: z.string(),
        sessionToken: z.string().optional(),
      }))
      .query(async ({ input }) => {
        try {
          const apiKey = process.env.VITE_FRONTEND_FORGE_API_KEY;
          const response = await fetch(
            `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
              input.input
            )}&key=${apiKey}&components=country:ca&sessionToken=${input.sessionToken || ''}`
          );

          if (!response.ok) {
            throw new Error(`Google Places API error: ${response.statusText}`);
          }

          const data = await response.json();
          return data;
        } catch (error) {
          console.error('[places.autocomplete] Error:', error);
          throw new Error('Failed to fetch autocomplete suggestions');
        }
      }),
    placeDetails: publicProcedure
      .input(z.object({
        placeId: z.string(),
        sessionToken: z.string().optional(),
      }))
      .query(async ({ input }) => {
        try {
          const apiKey = process.env.VITE_FRONTEND_FORGE_API_KEY;
          const response = await fetch(
            `https://maps.googleapis.com/maps/api/place/details/json?place_id=${input.placeId}&fields=geometry&key=${apiKey}&sessionToken=${input.sessionToken || ''}`
          );

          if (!response.ok) {
            throw new Error(`Google Places API error: ${response.statusText}`);
          }

          const data = await response.json();
          return data;
        } catch (error) {
          console.error('[places.placeDetails] Error:', error);
          throw new Error('Failed to fetch place details');
        }
      }),
  }),

  orders: router({
    create: publicProcedure
      .input(z.object({
        customerName: z.string(),
        customerPhone: z.string(),
        address: z.string(),
        items: z.array(z.object({
          name: z.string(),
          quantity: z.number().int().positive(),
          price: z.number().positive(),
        })),
        specialInstructions: z.string().optional(),
        customerLatitude: z.number().optional(),
        customerLongitude: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        console.log('[Orders.create] Creating new order...');
        const order = await db.createOrder({
          orderNumber: `ORD-${Date.now()}`,
          customerPhone: input.customerPhone,
          customerAddress: input.address,
          status: 'Pending',
        });
        
        console.log('[Orders.create] Order created:', (order as any)?.orderNumber);
        // Send notification to kitchen
        if (order) {
          const { createNotification } = await import('./notifications');
          createNotification({
            recipientRole: 'kitchen',
            type: 'order_created',
            message: `Order #${(order as any).orderNumber} has been saved`,
            orderId: (order as any)?.id || 0,
          });
          
          // Send push notification to kitchen dashboard
          await sendPushNotification('barrel_kitchen', 'kitchen', undefined, {
            title: 'New Order',
            body: `Order #${(order as any).orderNumber} has been created`,
            url: '/kitchen-dashboard',
            tag: `order-${(order as any).id}`,
            data: { orderId: (order as any).id },
          }).catch(err => console.error('[Push] Failed to send kitchen notification:', err));
        }
        
        return order;
      }),

    getAll: publicProcedure
      .query(async () => {
        return await db.getOrders();
      }),

    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getOrderById(input.id);
      }),

    updateStatus: publicProcedure
      .input(z.object({
        orderId: z.number(),
        status: z.enum(['Pending', 'Confirmed', 'Preparing', 'Ready', 'Out for Delivery', 'Delivered', 'Cancelled']),
      }))
      .mutation(async ({ input }) => {
        const updatedOrder = await db.updateOrderStatus(input.orderId, input.status);
        // Send push notifications for order status changes
        if (updatedOrder && input.status === "Ready") {
          await sendPushNotification("barrel_admin", "admin", undefined, {
            title: "Order Ready",
            body: `Order #${(updatedOrder as any).orderNumber} is ready for delivery`,
            url: "/admin/order-tracking",
            tag: `order-${updatedOrder.id}`,
            data: { orderId: updatedOrder.id },
          }).catch(err => console.error("[Push] Failed to send ready notification:", err));
        }
        if (updatedOrder && input.status === "Delivered") {
          await sendPushNotification("barrel_admin", "admin", undefined, {
            title: "Order Delivered",
            body: `Order #${(updatedOrder as any).orderNumber} has been delivered`,
            url: "/admin/order-tracking",
            tag: `order-${updatedOrder.id}`,
            data: { orderId: updatedOrder.id },
          }).catch(err => console.error("[Push] Failed to send delivered notification:", err));
        }
        
        // Send notifications based on status changes
        if (updatedOrder) {
          const { createNotification } = await import('./notifications');
          
          // Notify admin when order is ready (kitchen marked it ready)
          if (input.status === 'Ready') {
          createNotification({
            recipientRole: 'admin',
            type: 'order_ready',
            message: `Order #${(updatedOrder as any).orderNumber} is ready`,
            orderId: (updatedOrder as any).id,
          });
          }
          
          // Notify admin when order is delivered (driver marked it delivered)
          if (input.status === 'Delivered') {
          createNotification({
            recipientRole: 'admin',
            type: 'order_delivered',
            message: `Order #${(updatedOrder as any).orderNumber} has been delivered`,
            orderId: updatedOrder.id,
          });
          }
        }
        
        return updatedOrder;
      }),

    assignDriver: publicProcedure
      .input(z.object({
        orderId: z.number(),
        driverId: z.number(),
      }))
      .mutation(async ({ input }) => {
        return await db.assignOrderToDriver(input.orderId, input.driverId);
      }),

    sendToDriver: protectedProcedure
      .input(z.object({
        orderId: z.number(),
        driverId: z.number(),
      }))
      .mutation(async ({ input }) => {
        // Assign order to driver by ID and send notification
        console.log('[sendToDriver] Received input:', JSON.stringify(input));
        console.log('[sendToDriver] Assigning order', input.orderId, 'to driver:', input.driverId);
        
        try {
          const result = await db.assignOrderToDriver(input.orderId, input.driverId);
          console.log('[sendToDriver] Assignment result:', result);
          
          // Send notification to the specific driver
          const order = await db.getOrderById(input.orderId);
          console.log('[sendToDriver] Order fetched:', order);
          
          if (order) {
            const { createNotification } = await import('./notifications');
            createNotification({
              recipientRole: 'driver',
              recipientId: input.driverId,
              type: 'driver_assignment',
              message: `Order ${(order as any).orderNumber} has been sent to you`,
              orderId: input.orderId,
              driverId: input.driverId,
            });
            console.log('[sendToDriver] Notification created for driver', input.driverId);
            // Send push notification to driver
            // Get driver username from context or use a generic driver identifier
            const driverUsername = `driver_${input.driverId}`;
            await sendPushNotification(driverUsername, "driver", input.driverId, {
              title: "New Order Assigned",
              body: `Order #${(order as any).orderNumber} has been assigned to you`,
              url: "/driver-dashboard",
              tag: `order-${order.id}`,
              data: { orderId: order.id },
            }).catch(err => console.error("[Push] Failed to send driver assignment notification:", err));
          }
          
          return { success: true, orderId: input.orderId, driverId: input.driverId };
        } catch (error) {
          console.error('[sendToDriver] Error:', error);
          throw error;
        }
      }),

    getByStatus: publicProcedure
      .input(z.object({ status: z.string() }))
      .query(async ({ input }) => {
        return await db.getOrdersByStatus([input.status]);
      }),

    getByDriver: publicProcedure
      .input(z.object({ driverId: z.number() }))
      .query(async ({ input }) => {
        return await db.getOrdersByDriver(input.driverId);
      }),

    // calculateReturnTime: publicProcedure
    //   .input(z.object({
    //     driverId: z.number(),
    //     restaurantAddress: z.string(),
    //   }))
    //   .mutation(async ({ input }) => {
    //     const orders = await db.getOrdersByDriver(input.driverId);
    //     const { calculateTravelTime } = await import('./googleMapsRouting');
    //     const travelTime = await calculateTravelTime(
    //       input.restaurantAddress,
    //       orders,
    //       input.driverId
    //     );
    //     return { travelTime, orders };
    //   }),

    getTodayWithItems: publicProcedure
      .input(z.object({ driverId: z.number().optional() }).optional())
      .query(async ({ input }) => {
        // Get all orders for today
        const allOrders = await db.getTodayOrdersWithItems(undefined);
        // If driverId is provided, filter by driver ID and "On the Way" status
        if (input?.driverId) {
          return allOrders.filter((order: any) => 
            order.driverId === input.driverId && order.status === "On the Way"
          );
        }
        // Return all orders with items
        return allOrders;
      }),

    createFromReceipt: publicProcedure
      .input(z.object({
        orderNumber: z.string(),
        customerAddress: z.string(),
        customerPhone: z.string().optional(),
        area: z.enum(['Downtown', 'Central Park', 'Both']).optional(),
        deliveryTime: z.string().optional(),
        receiptImage: z.string().optional(),
        customerLatitude: z.number().optional(),
        customerLongitude: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        let receiptImageUrl: string | undefined = undefined;
        
        if (input.receiptImage && input.receiptImage.startsWith('data:')) {
          try {
            const { storagePut } = await import('./storage');
            const base64Data = input.receiptImage.split(',')[1];
            const buffer = Buffer.from(base64Data, 'base64');
            const fileKey = `receipts/${input.orderNumber}-${Date.now()}.png`;
            const result = await storagePut(fileKey, buffer, 'image/png');
            receiptImageUrl = result.url;
            console.log('[createFromReceipt] Receipt image uploaded to S3:', receiptImageUrl);
          } catch (error) {
            console.error('[createFromReceipt] Error storing receipt image:', error);
            // Don't pass the base64 data to the database if upload fails
            receiptImageUrl = undefined;
          }
        }
        
        const order = await db.createOrder({
          orderNumber: input.orderNumber,
          customerAddress: input.customerAddress,
          customerPhone: input.customerPhone || '',
          area: input.area as any,
          deliveryTime: input.deliveryTime,
          receiptImage: receiptImageUrl,
          customerLatitude: input.customerLatitude as any,
          customerLongitude: input.customerLongitude as any,
          status: 'Pending',
        });
        
        // Send notification to kitchen
          createNotification({
            recipientRole: 'kitchen',
            type: 'order_created',
            // @ts-ignore - order type is properly inferred from createOrder
      // @ts-ignore - order type properly inferred from createOrder
            message: `Order #${(order as any).orderNumber} has received`,
            orderId: order.id,
          });
          
          // Send push notification to kitchen dashboard
          await sendPushNotification('barrel_kitchen', 'kitchen', undefined, {
            title: 'New Order from Receipt',
            body: `Order #${(order as any).orderNumber} has been registered`,
            url: '/kitchen-dashboard',
            tag: `order-${(order as any).id}`,
            data: { orderId: (order as any).id },
          }).catch(err => console.error('[Push] Failed to send receipt order notification:', err));
        
        return order;
      }),

    getWithItems: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getOrderWithItems(input.id);
      }),

    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return await db.deleteOrder(input.id);
      }),

    update: publicProcedure
      .input(z.object({
        orderId: z.number(),
        customerAddress: z.string().optional(),
        customerPhone: z.string().optional(),
        status: z.enum(['Pending', 'Ready', 'On the Way', 'Delivered']).optional(),
        area: z.enum(['Downtown', 'Central Park', 'Both']).optional(),
        deliveryTime: z.string().optional().nullable(),
        receiptImage: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        let receiptImageUrl: string | undefined = undefined;
        
        // Handle receipt image upload if provided
        if (input.receiptImage && input.receiptImage.startsWith('data:')) {
          try {
            const { storagePut } = await import('./storage');
            const base64Data = input.receiptImage.split(',')[1];
            const buffer = Buffer.from(base64Data, 'base64');
            const fileKey = `receipts/order-${input.orderId}-${Date.now()}.png`;
            const result = await storagePut(fileKey, buffer, 'image/png');
            receiptImageUrl = result.url;
            console.log('[orders.update] Receipt image uploaded to S3:', receiptImageUrl);
          } catch (error) {
            console.error('[orders.update] Error storing receipt image:', error);
            receiptImageUrl = undefined;
          }
        }
        
        const updateData: any = {};
        if (input.customerAddress !== undefined) updateData.customerAddress = input.customerAddress;
        if (input.customerPhone !== undefined) updateData.customerPhone = input.customerPhone;
        if (input.status !== undefined) updateData.status = input.status;
        if (input.area !== undefined) updateData.area = input.area;
        if (input.deliveryTime !== undefined) {
          updateData.deliveryTime = input.deliveryTime ? new Date(input.deliveryTime) : null;
        }
        if (receiptImageUrl !== undefined) updateData.receiptImage = receiptImageUrl;
        
        const updatedOrder = await db.updateOrder(input.orderId, updateData);
        
        // Send notification to kitchen that order was edited
        if (updatedOrder) {
          const { createNotification } = await import('./notifications');
          createNotification({
            recipientRole: 'kitchen',
            type: 'order_edited',
            message: `Order #${(updatedOrder as any).orderNumber} has been edited`,
            orderId: updatedOrder.id,
          });
        }
        
        return updatedOrder;
      }),
  }),

  drivers: router({
    list: publicProcedure
      .query(async () => {
        return await db.getDrivers();
      }),
    create: publicProcedure
      .input(z.object({
        name: z.string(),
        licenseNumber: z.string(),
        phone: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return await db.createDriver({
          name: input.name,
          licenseNumber: input.licenseNumber,
          phone: input.phone,
          status: 'offline',
          isActive: true,
        });
      }),

    update: publicProcedure
      .input(z.object({
        id: z.number(),
        name: z.string(),
        licenseNumber: z.string(),
        phone: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return await db.updateDriver(input.id, {
          name: input.name,
          licenseNumber: input.licenseNumber,
          phone: input.phone,
        });
      }),

    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return await db.deleteDriver(input.id);
      }),

    setStatus: publicProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(['online', 'offline']),
      }))
      .mutation(async ({ input }) => {
        return await db.updateDriverStatus(input.id, input.status);
      }),

    updateStatus: publicProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(['online', 'offline']),
      }))
      .mutation(async ({ input }) => {
        return await db.updateDriverStatus(input.id, input.status);
      }),

    getAll: publicProcedure
      .query(async () => {
        return await db.getDrivers();
      }),

    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const drivers = await db.getDrivers();
        return drivers.find(d => d.id === input.id);
      }),



    login: publicProcedure
      .input(z.object({
        name: z.string(),
        licenseNumber: z.string(),
      }))
      .mutation(async ({ input }) => {
        const driver = await db.getDriverByNameAndLicense(input.name, input.licenseNumber);
        if (!driver) {
          throw new Error('Invalid credentials. Driver not found.');
        }
        return {
          sessionToken: `driver_${driver.id}_${Date.now()}`,
          driverId: driver.id,
          driverName: driver.name,
        };
      }),

    logout: publicProcedure
      .mutation(async () => {
        return { success: true };
      }),

    getDeliveredOrdersCountByDate: publicProcedure
      .input(z.object({
        driverId: z.number(),
        date: z.string(), // ISO date string (YYYY-MM-DD)
      }))
      .query(async ({ input }) => {
        const date = new Date(input.date);
        const count = await db.getDeliveredOrdersCountByDate(input.driverId, date);
        return { count, date: input.date };
      }),

    calculateReturnTime: publicProcedure
      .input(z.object({
        driverId: z.number(),
        restaurantAddress: z.string(),
      }))
      .mutation(async ({ input }) => {
        try {
          const { calculateReturnTime, formatReturnTimeMinutes } = await import('./routeOptimization');
          
          // Get all orders assigned to this driver with "On the Way" status
          const orders = await db.getOrders(input.driverId);
          const onTheWayOrders = orders.filter((order: any) => order.status === 'On the Way');

          if (onTheWayOrders.length === 0) {
            return {
              totalReturnTime: 0,
              formattedTime: '0 minutes',
              deliverySequence: [],
              breakdown: {
                pickupTime: 0,
                deliveryHandlingTime: 0,
                travelTime: 0,
              },
              message: 'No active deliveries',
            };
          }

          // Use the server-side Forge API key for Google Maps Directions API
          const apiKey = process.env.BUILT_IN_FORGE_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY;
          if (!apiKey) {
            throw new Error('Google Maps API key not configured. Please check BUILT_IN_FORGE_API_KEY or VITE_GOOGLE_MAPS_API_KEY environment variables.');
          }
          console.log('[drivers.calculateReturnTime] Using API key, orders found:', onTheWayOrders.length);

          console.log('[drivers.calculateReturnTime] Calculating route for', onTheWayOrders.length, 'orders');
          const result = await calculateReturnTime(
            input.restaurantAddress,
            onTheWayOrders,
            apiKey
          );
          console.log('[drivers.calculateReturnTime] Route calculation complete. Total time:', result.totalReturnTime, 'seconds');

          return {
            totalReturnTime: result.totalReturnTime,
            formattedTime: formatReturnTimeMinutes(result.totalReturnTime),
            deliverySequence: result.deliverySequence,
            breakdown: result.breakdown,
            orderCount: onTheWayOrders.length,
          };
        } catch (error) {
          console.error('[drivers.calculateReturnTime] Error:', error);
          console.error('[drivers.calculateReturnTime] Full error details:', JSON.stringify(error, null, 2));
          throw new Error(`Failed to calculate return time: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }),

    saveReturnTime: publicProcedure
      .input(z.object({
        driverId: z.number(),
        returnTimeSeconds: z.number(),
      }))
      .mutation(async ({ input }) => {
        try {
          const database = await getDb();
          const { drivers } = await import('../drizzle/schema');
          if (!database) throw new Error('Database connection failed');
          const result = await database
            .update(drivers)
            .set({
              estimatedReturnTime: input.returnTimeSeconds,
              estimatedReturnTimeUpdatedAt: new Date(),
              timerStartTime: Date.now() as any,
            } as any)
            .where(eq(drivers.id, input.driverId))
            .execute();
          return { success: true, timerStartTime: Date.now() };
        } catch (error) {
          console.error('[drivers.saveReturnTime] Error:', error);
          throw new Error(`Failed to save return time: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }),

    clearReturnTime: publicProcedure
      .input(z.object({ driverId: z.number() }))
      .mutation(async ({ input }) => {
        try {
          const database = await getDb();
          const { drivers } = await import('../drizzle/schema');
          if (!database) throw new Error('Database connection failed');
          const result = await database
            .update(drivers)
            .set({
              estimatedReturnTime: null,
              estimatedReturnTimeUpdatedAt: new Date(),
            })
            .where(eq(drivers.id, input.driverId))
            .execute();
          return { success: true };
        } catch (error) {
          console.error('[drivers.clearReturnTime] Error:', error);
          throw new Error(`Failed to clear return time: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }),

    getReturnTime: publicProcedure
      .input(z.object({ driverId: z.number() }))
      .query(async ({ input }) => {
        try {
          const database = await getDb();
          const { drivers } = await import('../drizzle/schema');
          if (!database) throw new Error('Database connection failed');
          const result = await database
            .select({
              estimatedReturnTime: drivers.estimatedReturnTime,
              estimatedReturnTimeUpdatedAt: drivers.estimatedReturnTimeUpdatedAt,
            })
            .from(drivers)
            .where(eq(drivers.id, input.driverId))
            .execute();
          return result[0] || { estimatedReturnTime: null, estimatedReturnTimeUpdatedAt: null };
        } catch (error) {
          console.error('[drivers.getReturnTime] Error:', error);
          throw new Error(`Failed to get return time: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }),
  }),

  system: router({
    login: publicProcedure
      .input(z.object({
        username: z.string(),
        password: z.string(),
        role: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Simple credential check - in production, use proper authentication
        const validCredentials = [
          { username: 'barrel_admin', password: 'Barrel_1981@', role: 'admin' },
          { username: 'barrel_kitchen', password: '1111', role: 'kitchen' },
        ];
        
        const user = validCredentials.find(
          u => u.username === input.username && u.password === input.password && (!input.role || u.role === input.role)
        );
        
        if (!user) {
          throw new Error('Invalid credentials');
        }
        
        return {
          sessionToken: `token_${Date.now()}`,
          role: user.role,
          username: user.username,
        };
      }),

    checkSession: publicProcedure
      .query(async ({ ctx }) => {
        // Check if user has valid session
        return {
          isAuthenticated: false,
          role: null,
          username: null,
        };
      }),

    seedDrivers: publicProcedure
      .mutation(async () => {
        try {
          const dbInstance = await getDb();
          if (!dbInstance) return { success: false, error: 'No database connection' };
          
          const { drivers: driversTable } = await import('../drizzle/schema');
          
          const testDrivers = [
            { name: 'Farzam Hasti', licenseNumber: 'FH123456' },
            { name: 'John Driver', licenseNumber: 'D1234567' },
            { name: 'Jane Smith', licenseNumber: 'D7654321' },
            { name: 'Mike Johnson', licenseNumber: 'D1111111' },
            { name: 'Sarah Williams', licenseNumber: 'D2222222' },
          ];
          
          const results = [];
          for (const driver of testDrivers) {
            try {
              await dbInstance.insert(driversTable).values({
                name: driver.name,
                licenseNumber: driver.licenseNumber,
                status: 'offline',
                isActive: true,
              });
              results.push({ name: driver.name, success: true });
            } catch (e: any) {
              // If insert fails (duplicate), that's ok
              results.push({ name: driver.name, success: true, message: 'Already exists' });
            }
          }
          
          return { success: true, drivers: results };
        } catch (error: any) {
          return { success: false, error: error.message };
        }
      }),
  }),

  reservations: router({
    create: publicProcedure
      .input(z.object({
        eventType: z.string(),
        numberOfPeople: z.number().int().positive(),
        dateTime: z.date(),
        description: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const reservation = await db.createReservation({
          eventType: input.eventType,
          numberOfPeople: input.numberOfPeople,
          dateTime: input.dateTime,
          description: input.description || '',
          status: 'Pending',
        });
        
        // Send notification to kitchen
        if (reservation) {
          const { createNotification } = await import('./notifications');
          createNotification({
            recipientRole: 'kitchen',
            type: 'reservation_created',
            message: `New reservation: ${input.eventType} for ${input.numberOfPeople} people`,
            reservationId: reservation.id,
          });
        }
        
        return reservation;
      }),

    getAll: publicProcedure
      .query(async () => {
        return await db.getReservations();
      }),

    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getReservationById(input.id);
      }),

    updateStatus: publicProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(['Pending', 'Done']),
      }))
      .mutation(async ({ input }) => {
        return await db.updateReservationStatus(input.id, input.status);
      }),

    markDone: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const updatedReservation = await db.updateReservationStatus(input.id, 'Done');
        
        // Send notification to admin that reservation is done
        if (updatedReservation) {
          const { createNotification } = await import('./notifications');
          createNotification({
            recipientRole: 'admin',
            type: 'reservation_done',
            message: `Reservation #${updatedReservation.id} (${(updatedReservation as any).eventType}) has been completed`,
            reservationId: (updatedReservation as any).id,
          });
        }
        // Send push notification to admin
            await sendPushNotification("barrel_admin", "admin", undefined, {
              title: "Reservation Completed",
              body: `Reservation #${updatedReservation.id} (${(updatedReservation as any).eventType}) has been completed`,
              url: "/admin/reservations",
              tag: `reservation-${updatedReservation.id}`,
              data: { reservationId: updatedReservation.id },
            }).catch(err => console.error("[Push] Failed to send reservation completion notification:", err));
        
        return updatedReservation;
      }),

    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return await db.deleteReservation(input.id);
      }),

    update: publicProcedure
      .input(z.object({
        id: z.number(),
        eventType: z.string().optional(),
        numberOfPeople: z.number().optional(),
        dateTime: z.date().optional(),
        description: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...updateData } = input;
        // Only include fields that are actually provided (not undefined)
        const cleanUpdateData = Object.fromEntries(
          Object.entries(updateData).filter(([, v]) => v !== undefined)
        );
        const updatedReservation = await db.updateReservation(id, cleanUpdateData);
        
        // Send notification to kitchen that reservation was edited
        if (updatedReservation) {
          const { createNotification } = await import('./notifications');
          createNotification({
            recipientRole: 'kitchen',
            type: 'reservation_edited',
            message: `Reservation #${(updatedReservation as any).id} (${(updatedReservation as any).eventType}) has been edited`,
            reservationId: updatedReservation.id,
          });
        }
        
        return updatedReservation;
      }),
  }),

  maps: router({
    geocode: publicProcedure
      .input(z.object({
        address: z.string(),
      }))
      .mutation(async ({ input }) => {
        try {
          const { geocodeAddress } = await import('./geocoding');
          const result = await geocodeAddress(input.address);
          
          if ('error' in result) {
            return { error: result.error };
          }
          
          return {
            lat: result.latitude,
            lng: result.longitude,
            formattedAddress: result.formattedAddress,
            placeId: result.placeId,
          };
        } catch (error) {
          console.error('[maps.geocode] Error:', error);
          return { error: 'Failed to geocode address' };
        }
      }),
  }),

  auth: router({
    me: publicProcedure
      .query(async ({ ctx }) => {
        // Return null if no authenticated user
        return null;
      }),

    logout: publicProcedure
      .mutation(async ({ ctx }) => {
        // Logout logic
        return { success: true };
      }),
  }),

  notifications: router({
    getUnread: publicProcedure
      .input(z.object({
        role: z.enum(['admin', 'kitchen', 'driver']),
        driverId: z.number().optional(),
      }))
      .query(async ({ input }) => {
        const { getUnreadNotifications } = await import('./notifications');
        return getUnreadNotifications(input.role, input.driverId);
      }),

    getAll: publicProcedure
      .input(z.object({
        role: z.enum(['admin', 'kitchen', 'driver']),
        driverId: z.number().optional(),
      }))
      .query(async ({ input }) => {
        const { getNotifications } = await import('./notifications');
        return getNotifications(input.role, input.driverId);
      }),

    getUnreadCount: publicProcedure
      .input(z.object({
        role: z.enum(['admin', 'kitchen', 'driver']),
        driverId: z.number().optional(),
      }))
      .query(async ({ input }) => {
        const { getUnreadCount } = await import('./notifications');
        return getUnreadCount(input.role, input.driverId);
      }),

    markAsRead: publicProcedure
      .input(z.object({
        notificationId: z.number(),
      }))
      .mutation(async ({ input }) => {
        const { markNotificationAsRead } = await import('./notifications');
        return await markNotificationAsRead(input.notificationId);
      }),

    markAllAsRead: publicProcedure
      .input(z.object({
        role: z.enum(['admin', 'kitchen', 'driver']),
        driverId: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { markAllNotificationsAsRead } = await import('./notifications');
        const count = await markAllNotificationsAsRead(input.role, input.driverId);
        return { markedCount: count };
      }),
  }),
  push: router({
    subscribe: publicProcedure
      .input(z.object({
        endpoint: z.string(),
        auth: z.string(),
        p256dh: z.string(),
        dashboardType: z.enum(['admin', 'kitchen', 'driver']),
        driverId: z.number().optional(),
        userAgent: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Get username from system session
        const username = ctx.systemSession?.username;
        if (!username) {
          console.error('[Push] No system session found - cannot subscribe without username');
          return { success: false };
        }
        
        const success = await storePushSubscription(
          input.endpoint,
          input.auth,
          input.p256dh,
          username,
          input.dashboardType,
          input.driverId,
          input.userAgent
        );
        return { success };
      }),
    unsubscribe: publicProcedure
      .input(z.object({
        endpoint: z.string(),
      }))
      .mutation(async ({ input }) => {
        const success = await removePushSubscription(input.endpoint);
        return { success };
      }),
    sendTest: publicProcedure
      .input(z.object({
        dashboardType: z.enum(['admin', 'kitchen', 'driver']),
        driverId: z.number().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Get username from system session
        const username = ctx.systemSession?.username;
        if (!username) {
          return { sent: 0 };
        }
        
        const count = await sendPushNotification(
          username,
          input.dashboardType,
          input.driverId,
          {
            title: 'Test Notification',
            body: 'This is a test push notification from Barrel Delivery',
            url: '/',
          }
        );
        return { sent: count };
      }),
  }),
});
