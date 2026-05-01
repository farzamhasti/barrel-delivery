import { publicProcedure, protectedProcedure, router } from './_core/trpc';
import { z } from 'zod';
import path from 'path';
import fs from 'fs';
import { convertOntarioTimeToUTC } from './timezoneHelper';
import * as db from './db';
import { getDb } from './db';

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
        return await db.updateOrderStatus(input.orderId, input.status);
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
        driverName: z.string(),
      }))
      .mutation(async ({ input }) => {
        // Use driver name for assignment to avoid ID serialization issues
        console.log('[sendToDriver] Received input:', JSON.stringify(input));
        console.log('[sendToDriver] Assigning order', input.orderId, 'to driver:', input.driverName);
        return await db.assignOrderToDriverByName(input.orderId, input.driverName);
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
        area: z.string().optional(),
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
          area: input.area,
          deliveryTime: input.deliveryTime,
          receiptImage: receiptImageUrl,
          status: 'Pending',
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
        
        return await db.updateOrder(input.orderId, updateData);
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
          customerName: input.eventType,
          customerPhone: '',
          customerEmail: '',
          reservationDate: input.dateTime,
          partySize: input.numberOfPeople,
          specialRequests: input.description,
          status: 'Pending',
        });
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
        return await db.updateReservationStatus(input.id, 'Done');
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
        return await db.updateReservation(id, updateData);
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
});
