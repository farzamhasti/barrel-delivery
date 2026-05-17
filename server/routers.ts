import { publicProcedure, protectedProcedure, router } from './_core/trpc';
import { z } from 'zod';
import path from 'path';
import fs from 'fs';
import { eq } from 'drizzle-orm';
import { convertOntarioTimeToUTC } from './timezoneHelper';
import * as db from './db';
import { getDb } from './db';
import { createNotification } from './notifications';
import {
  calculateGeographicDistribution,
  calculateTimeAnalysis,
  calculateDeliveryPerformance,
  calculateDriverPerformance,
  calculateGrowthOpportunities,
  getOrdersWithCoordinates,
} from './geomarketing';

import { getResidentialBoundary } from './residentialBoundary';
import {
  fetchResidentialPolygons,
  calculateBoundingBox,
  clipHeatmapToResidentialAreas,
} from './residentialPolygonClipping';
import {
  refreshCompetitorData,
  getCachedCompetitors,
  getCacheStatus,
  getCompetitorsFromAPI,
} from './competitors';
import { analyzeEmergingZones } from './emergingZonesAnalysis';
import { analyzeDemandChange } from './demandChangeAnalysis';
import { analyzeRelativeDemand } from './relativeDemandAnalysis';
import { analyzeGridHeatmap } from './gridHeatmapAnalysis';
import { calculateRelativeDemand } from './boundaryRasterAnalysis';
import { geoAIRouter } from './routers/geoAI';

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
        const order = await db.createOrder({
          orderNumber: `ORD-${Date.now()}`,
          customerPhone: input.customerPhone,
          customerAddress: input.address,
          status: 'Pending',
        });
        
        // Send notification to kitchen
        if (order) {
          const { createNotification } = await import('./notifications');
          createNotification({
            recipientRole: 'kitchen',
            type: 'order_created',
            message: `Order #${order.orderNumber} has been saved`,
            orderId: order.id,
          });
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
        
        // Send notifications based on status changes
        if (updatedOrder) {
          const { createNotification } = await import('./notifications');
          
          // Notify admin when order is ready (kitchen marked it ready)
          if (input.status === 'Ready') {
          createNotification({
            recipientRole: 'admin',
            type: 'order_ready',
            message: `Order #${updatedOrder.orderNumber} is ready`,
            orderId: updatedOrder.id,
          });
          }
          
          // Notify admin when order is delivered (driver marked it delivered)
          if (input.status === 'Delivered') {
          createNotification({
            recipientRole: 'admin',
            type: 'order_delivered',
            message: `Order #${updatedOrder.orderNumber} has been delivered`,
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
              message: `Order ${order.orderNumber} has been sent to you`,
              orderId: input.orderId,
              driverId: input.driverId,
            });
            console.log('[sendToDriver] Notification created for driver', input.driverId);
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
      .input(z.object({ driverId: z.number().optional(), date: z.string().optional() }).optional())
      .query(async ({ input }) => {
        // Get all orders for the specified date (or today if no date provided)
        const allOrders = await db.getTodayOrdersWithItems(input?.date);
        // If driverId is provided, filter by driver ID and include both "On the Way" and "Delivered" orders
        if (input?.driverId) {
          return allOrders.filter((order: any) => 
            order.driverId === input.driverId && (order.status === "On the Way" || order.status === "Delivered")
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
            message: `Order #${order.orderNumber} has received`,
            orderId: order.id,
          });
        
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
            message: `Order #${updatedOrder.orderNumber} has been edited`,
            orderId: updatedOrder.id,
          });
        }
        
        return updatedOrder;
      }),

    getDeliveryReport: publicProcedure
      .input(z.object({
        startDate: z.date(),
        endDate: z.date(),
      }))
      .query(async ({ input }) => {
        return await db.getDeliveryReport(input.startDate, input.endDate);
      }),
    getLoyalCustomers: publicProcedure
      .input(z.object({
        startDate: z.date(),
        endDate: z.date(),
      }))
      .query(async ({ input }) => {
        return await db.getLoyalCustomers(input.startDate, input.endDate);
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
          { username: 'barrel_manager', password: 'Barrel_geo@', role: 'geomarketing' },
        ];
        
        const user = validCredentials.find(
          u => u.username === input.username && u.password === input.password && (!input.role || u.role === input.role)
        );
        
        if (!user) {
          throw new Error('Invalid credentials');
        }

        // Create system session in database
        const dbInstance = await getDb();
        if (!dbInstance) {
          throw new Error('Database not available');
        }

        // Import schema
        const { systemCredentials, systemSessions } = await import('../drizzle/schema');
        const { createHash } = await import('crypto');

        // Get or create credential
        const credentialResult = await dbInstance
          .select({ id: systemCredentials.id })
          .from(systemCredentials)
          .where(eq(systemCredentials.username, input.username));
        
        let credentialId: number;
        if (credentialResult.length > 0) {
          credentialId = credentialResult[0].id;
        } else {
          // Create new credential with password hash
          const passwordHash = createHash('sha256').update(input.password).digest('hex');
          await dbInstance
            .insert(systemCredentials)
            .values({
              username: input.username,
              passwordHash,
              role: user.role,
            });
          // Get the inserted ID from the result
          const newCredentials = await dbInstance
            .select({ id: systemCredentials.id })
            .from(systemCredentials)
            .where(eq(systemCredentials.username, input.username));
          credentialId = newCredentials[0].id;
        }

        // Create session
        const sessionToken = `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        await dbInstance
          .insert(systemSessions)
          .values({
            credentialId,
            sessionToken,
            expiresAt,
          });
        
        return {
          sessionToken,
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
            message: `The reservation (${updatedReservation.eventType}) has been done`,
            reservationId: updatedReservation.id,
          });
        }
        
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
            message: `Reservation #${updatedReservation.id} (${updatedReservation.eventType}) has been edited`,
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

  // Messaging system
  messaging: router({
    // Get all message templates
    getTemplates: publicProcedure.query(async () => {
      const database = await getDb();
      if (!database) throw new Error('Database not available');
      const { messageTemplates } = await import('../drizzle/schema');
      const templates = await database.select().from(messageTemplates).orderBy(messageTemplates.createdAt);
      return templates;
    }),

    // Create a new message template
    createTemplate: publicProcedure
      .input(z.object({
        name: z.string().min(1),
        templateText: z.string().min(1),
      }))
      .mutation(async ({ input }) => {
        const database = await getDb();
        if (!database) throw new Error('Database not available');
        const { messageTemplates } = await import('../drizzle/schema');
        const result = await database.insert(messageTemplates).values({
          name: input.name,
          templateText: input.templateText,
        });
        return { id: result[0]?.insertId, name: input.name, templateText: input.templateText };
      }),

    // Delete a message template
    deleteTemplate: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const database = await getDb();
        if (!database) throw new Error('Database not available');
        const { messageTemplates } = await import('../drizzle/schema');
        await database.delete(messageTemplates).where(eq(messageTemplates.id, input.id));
        return { success: true };
      }),

    // Send a message to recipients (creates notifications)
    sendMessage: publicProcedure
      .input(z.object({
        messageText: z.string().min(1),
        recipients: z.array(z.object({
          role: z.enum(['kitchen', 'driver']),
          driverId: z.number().optional(),
          driverName: z.string().optional(),
        })),
        templateId: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const database = await getDb();
        if (!database) throw new Error('Database not available');
        const { sentMessages } = await import('../drizzle/schema');
        const results = [];

        for (const recipient of input.recipients) {
          // Save to sent_messages table
          await database.insert(sentMessages).values({
            senderRole: 'admin',
            recipientRole: recipient.role,
            recipientId: recipient.driverId || null,
            recipientName: recipient.role === 'kitchen' ? 'Kitchen' : (recipient.driverName || null),
            messageText: input.messageText,
            templateId: input.templateId || null,
          });

          // Create a notification for the recipient
          await createNotification({
            recipientRole: recipient.role,
            recipientId: recipient.driverId,
            type: 'admin_message',
            message: input.messageText,
            driverId: recipient.driverId,
          });

          results.push({ role: recipient.role, driverId: recipient.driverId, sent: true });
        }

        return { success: true, sentCount: results.length, results };
      }),

    // Get sent message history
    getSentMessages: publicProcedure
      .input(z.object({
        limit: z.number().optional().default(50),
      }))
      .query(async ({ input }) => {
        const database = await getDb();
        if (!database) throw new Error('Database not available');
        const { sentMessages } = await import('../drizzle/schema');
        const { desc } = await import('drizzle-orm');
        const messages = await database.select().from(sentMessages).orderBy(desc(sentMessages.createdAt)).limit(input.limit);
        return messages;
      }),
  }),

  analytics: router({
    getGeographicDistribution: publicProcedure
      .input(z.object({
        startDate: z.date(),
        endDate: z.date(),
      }))
      .query(async ({ input }) => {
        return await calculateGeographicDistribution(input.startDate, input.endDate);
      }),
    
    getTimeAnalysis: publicProcedure
      .input(z.object({
        startDate: z.date(),
        endDate: z.date(),
      }))
      .query(async ({ input }) => {
        return await calculateTimeAnalysis(input.startDate, input.endDate);
      }),
    
    getDeliveryPerformance: publicProcedure
      .input(z.object({
        startDate: z.date(),
        endDate: z.date(),
      }))
      .query(async ({ input }) => {
        return await calculateDeliveryPerformance(input.startDate, input.endDate);
      }),
    
    getDriverPerformance: publicProcedure
      .input(z.object({
        startDate: z.date(),
        endDate: z.date(),
      }))
      .query(async ({ input }) => {
        return await calculateDriverPerformance(input.startDate, input.endDate);
      }),
    
    getGrowthOpportunities: publicProcedure
      .input(z.object({
        startDate: z.date(),
        endDate: z.date(),
      }))
      .query(async ({ input }) => {
        return await calculateGrowthOpportunities(input.startDate, input.endDate);
      }),
    
    // Competitor data procedures
    getCompetitors: publicProcedure
      .input(z.object({
        restaurantId: z.string().default('barrel-delivery'),
      }))
      .query(async ({ input }) => {
        try {
          const result = await getCachedCompetitors(input.restaurantId);
          return result;
        } catch (error) {
          console.error('[analytics.getCompetitors] Error:', error);
          return {
            competitors: [],
            cacheStatus: 'error',
            message: 'Failed to fetch competitors',
          };
        }
      }),
    
    getCacheStatus: publicProcedure
      .input(z.object({
        restaurantId: z.string().default('barrel-delivery'),
      }))
      .query(async ({ input }) => {
        try {
          return await getCacheStatus(input.restaurantId);
        } catch (error) {
          console.error('[analytics.getCacheStatus] Error:', error);
          return {
            status: 'error',
            totalCompetitors: 0,
          };
        }
      }),
    
    refreshCompetitors: publicProcedure
      .input(z.object({
        restaurantId: z.string().default('barrel-delivery'),
        radiusKm: z.number().default(2),
      }))
      .mutation(async ({ input }) => {
        try {
          const result = await refreshCompetitorData(input.restaurantId, input.radiusKm);
          return result;
        } catch (error) {
          console.error('[analytics.refreshCompetitors] Error:', error);
          return {
            success: false,
            competitorCount: 0,
            message: 'Failed to refresh competitors',
          };
        }
      }),
    
    getDeliveryHeatmapData: publicProcedure
      .input(z.object({
        startDate: z.date(),
        endDate: z.date(),
        areaFilter: z.enum(['all', 'Downtown', 'Central Park', 'Both']).default('all'),
      }))
      .query(async ({ input }) => {
        try {
          // Use existing helper to fetch orders with coordinates and geocoding
          const orders = await getOrdersWithCoordinates(input.startDate, input.endDate);
          
          // Filter by area if specified
          let filteredOrders = orders;
          if (input.areaFilter !== 'all') {
            filteredOrders = orders.filter(order => {
              if (input.areaFilter === 'Both') {
                return order.area === 'Downtown' || order.area === 'Central Park';
              }
              return order.area === input.areaFilter;
            });
          }
          
          // Extract coordinates for heatmap (only orders with valid coordinates)
          const heatmapPoints = filteredOrders
            .filter(order => order.customerLatitude && order.customerLongitude)
            .map(order => ({
              lat: Number(order.customerLatitude),
              lng: Number(order.customerLongitude),
              orderId: order.id,
              address: order.customerAddress,
              timestamp: order.createdAt.getTime(),
            }));
          
          return {
            success: true,
            points: heatmapPoints,
            totalOrders: filteredOrders.length,
            ordersWithCoordinates: heatmapPoints.length,
          };
        } catch (error) {
          console.error('[analytics.getDeliveryHeatmapData] Error:', error);
          return {
            success: false,
            points: [],
            totalOrders: 0,
            ordersWithCoordinates: 0,
            message: 'Failed to fetch heatmap data',
          };
        }
      }),
    
    getResidentialPolygons: publicProcedure
      .input(z.object({
        bounds: z.object({
          minLat: z.number(),
          maxLat: z.number(),
          minLng: z.number(),
          maxLng: z.number(),
        }).optional(),
      }).optional())
      .query(async ({ input }) => {
        try {
          // Use default Fort Erie bounds if not provided
          const bounds = input?.bounds || {
            minLat: 42.9,
            maxLat: 43.1,
            minLng: -79.1,
            maxLng: -78.9,
          };
          
          const polygons = await fetchResidentialPolygons(bounds);
          
          return {
            success: true,
            polygons,
            count: polygons.length,
            message: `Fetched ${polygons.length} residential polygons`,
          };
        } catch (error) {
          console.error('[analytics.getResidentialPolygons] Error:', error);
          return {
            success: false,
            polygons: [],
            count: 0,
            message: 'Failed to fetch residential polygons',
          };
        }
      }),
    
    getResidentialBoundary: publicProcedure
      .query(async () => {
        try {
          const boundary = await getResidentialBoundary();
          if (!boundary) {
            return {
              success: false,
              boundary: null,
              message: 'Failed to fetch residential boundary',
            };
          }
          return {
            success: true,
            boundary,
            message: 'Successfully fetched residential boundary',
          };
        } catch (error) {
          console.error('[analytics.getResidentialBoundary] Error:', error);
          return {
            success: false,
            boundary: null,
            message: 'Error fetching residential boundary',
          };
        }
      }),
    
    fetchCompetitorsFromAPI: publicProcedure
      .input(z.object({
        latitude: z.number().default(42.90517),
        longitude: z.number().default(-78.92295),
        radiusKm: z.number().default(2),
      }))
      .query(async ({ input }) => {
        try {
          const competitors = await getCompetitorsFromAPI(input.latitude, input.longitude, input.radiusKm);
          return {
            success: true,
            competitors,
            count: competitors.length,
          };
        } catch (error) {
          console.error('[analytics.fetchCompetitorsFromAPI] Error:', error);
          return {
            success: false,
            competitors: [],
            count: 0,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      }),
    
    analyzeEmergingZones: publicProcedure
      .input(z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        areaFilter: z.string().optional(),
      }))
      .query(async ({ input }) => {
        try {
          // Parse date range if provided
          let dateRange: { startDate: Date; endDate: Date } | undefined;
          if (input.startDate && input.endDate) {
            dateRange = {
              startDate: new Date(input.startDate),
              endDate: new Date(input.endDate),
            };
          }
          
          const zones = await analyzeEmergingZones(dateRange, input.areaFilter);
          return {
            success: true,
            zones,
            count: zones.length,
          };
        } catch (error) {
          console.error('[analytics.analyzeEmergingZones] Error:', error);
          return {
            success: false,
            zones: [],
            count: 0,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
           }),
    analyzeGridHeatmap: publicProcedure
      .input(z.object({
        startDate: z.date(),
        endDate: z.date(),
      }))
      .query(async ({ input }) => {
        try {
          const result = await analyzeGridHeatmap(input.startDate, input.endDate);
          return result;
        } catch (error) {
          console.error('[analytics.analyzeGridHeatmap] Error:', error);
          return {
            cells: [],
            cityStats: {
              totalOrders: 0,
              avgDeliveryTime: 0,
              avgWaitingTime: 0,
              avgDemandScore: 0,
            },
            interpretation: 'Error analyzing grid heatmap',
          };
        }
      }),
    analyzeDemandChange: publicProcedure
      .input(z.object({
        previousStartDate: z.date(),
        previousEndDate: z.date(),
        currentStartDate: z.date(),
        currentEndDate: z.date(),
      }))
      .query(async ({ input }) => {
        try {
          const result = await analyzeDemandChange(
            input.previousStartDate,
            input.previousEndDate,
            input.currentStartDate,
            input.currentEndDate
          );
          return result;
        } catch (error) {
          console.error('[analytics.analyzeDemandChange] Error:', error);
          return {
            zones: [],
            periodComparison: {
              previousPeriod: { startDate: input.previousStartDate, endDate: input.previousEndDate, totalOrders: 0 },
              currentPeriod: { startDate: input.currentStartDate, endDate: input.currentEndDate, totalOrders: 0 },
            },
            spatialInterpretation: 'Error analyzing demand changes.',
            success: false,
          };
        }
      }),
    
    analyzeRelativeDemand: publicProcedure
      .input(z.object({
        startDate: z.date(),
        endDate: z.date(),
      }))
      .query(async ({ input }) => {
        try {
          const result = await analyzeRelativeDemand(input.startDate, input.endDate);
          return result;
        } catch (error) {
          console.error('[analytics.analyzeRelativeDemand] Error:', error);
          return {
            success: false,
            regions: [],
            cityWideStats: {
              totalOrders: 0,
              avgOrderDensity: 0,
              avgDeliveryTime: 0,
              avgWaitingTime: 0,
              avgOperationalIntensity: 0,
            },
            interpretation: 'Error analyzing relative demand',
          };
        }
      }),
    analyzeBoundaryRaster: publicProcedure
      .input(z.object({
        startDate: z.date(),
        endDate: z.date(),
      }))
      .query(async ({ input }) => {
        try {
          const result = await calculateRelativeDemand(input.startDate, input.endDate);
          return result;
        } catch (error) {
          console.error('[analytics.analyzeBoundaryRaster] Error:', error);
          return {
            cells: [],
            totalOrders: 0,
            avgDeliveryTime: 0,
            avgWaitingTime: 0,
          };
        }
      }),
  }),
  gps: router({
    updateDriverPosition: protectedProcedure
      .input(z.object({
        driverId: z.string(),
        latitude: z.number(),
        longitude: z.number(),
      }))
      .mutation(async ({ input }) => {
        try {
          if (!(global as any).driverPositions) {
            (global as any).driverPositions = {};
          }
          const key = `driver_${input.driverId}`;
          (global as any).driverPositions[key] = {
            driverId: input.driverId,
            latitude: input.latitude,
            longitude: input.longitude,
            timestamp: Date.now(),
          };
          return { success: true };
        } catch (error) {
          console.error('[gps.updateDriverPosition] Error:', error);
          throw new Error('Failed to update driver position');
        }
      }),
    getActiveDrivers: publicProcedure
      .query(async () => {
        try {
          // Get all active drivers from database
          const allActiveDrivers = await db.getActiveDrivers();
          
          // Get GPS positions from in-memory storage
          if (!(global as any).driverPositions) {
            (global as any).driverPositions = {};
          }
          const gpsPositions = Object.values((global as any).driverPositions || {});
          const now = Date.now();
          
          // Create a map of recent GPS positions (last 5 minutes)
          const recentPositions: Record<number, any> = {};
          gpsPositions.forEach((pos: any) => {
            if (now - pos.timestamp < 5 * 60 * 1000) {
              recentPositions[pos.driverId] = pos;
            }
          });
          
          // Merge driver data with GPS positions
          // Include all active drivers, but use GPS position if available
          const result = allActiveDrivers.map(driver => {
            const gpsData = recentPositions[driver.id];
            return {
              driverId: driver.id,
              driverName: driver.name,
              status: driver.status,
              latitude: gpsData?.latitude || 42.9052194, // Default to restaurant if no GPS
              longitude: gpsData?.longitude || -78.9232931,
              timestamp: gpsData?.timestamp || now,
            };
          });
          
          return result;
        } catch (error) {
          console.error('[gps.getActiveDrivers] Error:', error);
          return [];
        }
      }),

    // Phase 2: Spatial Intelligence
    getSpatialAnalysis: publicProcedure
      .input(z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        restaurantLat: z.number().default(42.90517),
        restaurantLng: z.number().default(-78.92295),
      }))
      .query(async ({ input }) => {
        try {
          // For now, return empty spatial analysis
          // In production, this would fetch orders and competitors from DB
          return {
            success: true,
            gridCells: [],
            competitors: [],
            insights: [],
            timestamp: new Date(),
          };
        } catch (error) {
          console.error('[analytics.getSpatialAnalysis] Error:', error);
          return {
            success: false,
            gridCells: [],
            competitors: [],
            insights: [],
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      }),
    }),
  
  // Geo AI Spatial Intelligence Router
  geoAI: geoAIRouter,
});
export type AppRouter = typeof appRouter;
