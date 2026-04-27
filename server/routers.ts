import { getSessionCookieOptions } from "./_core/cookies";
import { COOKIE_NAME } from "../shared/const";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router, systemAdminProcedure, adminOrSystemAdminProcedure } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { geocodeAddress, reverseGeocodeCoordinates, calculateDistance, isValidCoordinates } from "./geocoding";
import { processReceiptImage } from "./_core/imageEnhancement";
import { analyzeReceipt } from "./receiptOCR";
import * as fs from "fs";
import * as path from "path";
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
        return db.clearReturnTime(input.driverId);
      }),
  }),

  // Orders
  orders: router({
    createFromReceipt: publicProcedure
      .input(z.object({
        orderNumber: z.string(),
        customerAddress: z.string(),
        customerPhone: z.string().optional(),
        area: z.enum(['DN', 'CP', 'B']).optional(),
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
        let processedReceiptImage = null;
        let receiptTextExtracted = input.receiptText;
        let extractedCheckNumber = input.orderNumber;
        
        if (input.receiptImage) {
          try {
            // Convert base64 to buffer
            const base64Data = input.receiptImage.replace(/^data:image\/[a-z]+;base64,/, '');
            const imageBuffer = Buffer.from(base64Data, 'base64');
            
            // Save temporary image file for OCR analysis
            const tempDir = path.join('/tmp', `receipt-${Date.now()}`);
            if (!fs.existsSync(tempDir)) {
              fs.mkdirSync(tempDir, { recursive: true });
            }
            const tempImagePath = path.join(tempDir, 'receipt.jpg');
            fs.writeFileSync(tempImagePath, imageBuffer);
            
            // Upload original receipt image to S3
            const { storagePut } = await import('./storage');
            if (!storagePut) {
              throw new Error('storagePut function not available');
            }
            const timestamp = Date.now();
            const fileKey = `receipts/${input.orderNumber || 'order'}-${timestamp}.jpg`;
            const { url } = await storagePut(fileKey, imageBuffer, 'image/jpeg');
            processedReceiptImage = url;
            console.log('[orders.createFromReceipt] Receipt image uploaded to S3:', url);
            

            
            // Cleanup temp directory
            fs.rmSync(tempDir, { recursive: true, force: true });
          } catch (error) {
            console.error('[orders.createFromReceipt] Error processing receipt image:', error);
            // Continue without image if processing fails
          }
        }
        
        // Build order data with new schema fields
        const orderData: any = {
          orderNumber: extractedCheckNumber,
          customerAddress: input.customerAddress,
          customerPhone: input.customerPhone,
          area: input.area,
          deliveryTime: deliveryTimeValue,
          hasDeliveryTime: input.hasDeliveryTime,
          receiptText: receiptTextExtracted,
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
        startDate: z.date(),
        endDate: z.date(),
      }))
      .query(async ({ input }) => {
        return db.getOrdersByDateRange(input.startDate, input.endDate);
      }),

    updateStatus: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(['Pending', 'Ready', 'On the Way', 'Delivered']),
      }))
      .mutation(async ({ input }) => {
        return db.updateOrderStatus(input.id, input.status);
      }),

    assignDriver: protectedProcedure
      .input(z.object({
        orderId: z.number(),
        driverId: z.number(),
      }))
      .mutation(async ({ input }) => {
        return db.assignOrderToDriver(input.orderId, input.driverId);
      }),

    getWithItems: publicProcedure
      .input(z.object({ orderId: z.number() }))
      .query(async ({ input }) => {
        return db.getOrderWithItems(input.orderId);
      }),

    getTodayWithItems: publicProcedure
      .query(async () => {
        return db.getTodayOrdersWithItems();
      }),

    getReadyOrders: publicProcedure
      .query(async () => {
        return db.getOrdersByDateRange(new Date(), new Date());
      }),
  }),
});

export type AppRouter = typeof appRouter;
