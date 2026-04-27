import { z } from 'zod';
import { publicProcedure, router } from './_core/trpc';
import * as db from './db';
import path from 'path';
import fs from 'fs';

export const appRouter = router({
  orders: router({
    createFromReceipt: publicProcedure
      .input(z.object({
        orderNumber: z.string().optional(),
        customerAddress: z.string(),
        customerPhone: z.string(),
        area: z.enum(['DN', 'DT', 'WE', 'EA']),
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
        let formattedReceiptImage = null;
        let receiptTextExtracted = input.receiptText;
        let extractedCheckNumber = input.orderNumber;
        
        if (input.receiptImage) {
          try {
            // Convert base64 to buffer
            const base64Data = input.receiptImage.replace(/^data:image\/[a-z]+;base64,/, '');
            const imageBuffer = Buffer.from(base64Data, 'base64');
            
            // Analyze receipt with OCR to extract formatted text BEFORE uploading
            try {
              console.log('[orders.createFromReceipt] Starting OCR extraction...');
              const { extractReceiptData, formatReceiptText } = await import('./ocrReceiptExtractor');
              const receiptData = await extractReceiptData(input.receiptImage);
              console.log('[orders.createFromReceipt] OCR extraction complete');
              
              // Store formatted receipt text
              formattedReceiptImage = formatReceiptText(receiptData);
              
              // Extract check number from receipt data if available
              if (receiptData.checkNumber && !input.orderNumber) {
                extractedCheckNumber = receiptData.checkNumber;
              }
            } catch (ocrError) {
              console.error('[orders.createFromReceipt] OCR extraction failed:', ocrError);
              // Continue without OCR if analysis fails - the original receipt is still saved
            }
            
            // Upload original receipt image to S3
            const { storagePut } = await import('./storage');
            if (!storagePut) {
              throw new Error('storagePut function not available');
            }
            const timestamp = Date.now();
            const fileKey = `receipts/${extractedCheckNumber || 'order'}-${timestamp}.jpg`;
            const { url: originalReceiptUrl } = await storagePut(fileKey, imageBuffer, 'image/jpeg');
            processedReceiptImage = originalReceiptUrl;
            console.log('[orders.createFromReceipt] Receipt image uploaded to S3:', originalReceiptUrl);
          } catch (error) {
            console.error('[orders.createFromReceipt] Error processing receipt image:', error);
            // Continue without image if processing fails
          }
        }
        
        // Build order data with only fields that exist in the schema
        const orderData: any = {
          orderNumber: extractedCheckNumber || `order-${Date.now()}`,
          customerAddress: input.customerAddress,
          customerPhone: input.customerPhone,
          area: input.area,
          deliveryTime: deliveryTimeValue ? deliveryTimeValue.toISOString() : null,
          receiptImage: processedReceiptImage,
          formattedReceiptImage: formattedReceiptImage,
          status: 'Pending',
          driverId: null,
          subtotal: 0,
          taxAmount: 0,
          totalPrice: 0,
        };
        
        console.log('[orders.createFromReceipt] Order data:', JSON.stringify(orderData, null, 2));
        const order = await db.createOrder(orderData);
        console.log('[orders.createFromReceipt] Order created successfully:', order)
        
        return order;
      }),

    getTodayWithItems: publicProcedure
      .query(async () => {
        return db.getTodayOrdersWithItems();
      }),

    getReadyOrders: publicProcedure
      .query(async () => {
        return db.getOrdersByDateRange(new Date(), new Date());
      }),

    list: publicProcedure
      .query(async () => {
        return db.getOrders();
      }),

    updateStatus: publicProcedure
      .input(z.object({
        orderId: z.number(),
        status: z.string(),
      }))
      .mutation(async ({ input }) => {
        return db.updateOrderStatus(input.orderId, input.status);
      }),

    delete: publicProcedure
      .input(z.object({
        orderId: z.number(),
      }))
      .mutation(async ({ input }) => {
        return db.deleteOrder(input.orderId);
      }),

    getWithItems: publicProcedure
      .input(z.object({
        orderId: z.number(),
      }))
      .query(async ({ input }) => {
        return db.getOrderWithItems(input.orderId);
      }),

    convertReceiptImage: publicProcedure
      .input(z.object({
        imageData: z.string(),
      }))
      .mutation(async ({ input }) => {
        try {
          const { extractReceiptData, formatReceiptText } = await import("./ocrReceiptExtractor");
          
          // Extract receipt data using OCR + LLM
          const receiptData = await extractReceiptData(input.imageData);
          const formattedText = formatReceiptText(receiptData);
          
          return {
            success: true,
            data: receiptData,
            html: formattedText,
          };
        } catch (error) {
          console.error("[orders.convertReceiptImage] Error:", error);
          throw new Error("Failed to convert receipt image");
        }
      }),

    assignDriver: publicProcedure
      .input(z.object({
        orderId: z.number(),
        driverId: z.number().nullable(),
      }))
      .mutation(async ({ input }) => {
        return db.updateOrder(input.orderId, { driverId: input.driverId });
      }),
  }),

  drivers: router({
    list: publicProcedure
      .query(async () => {
        return db.getDrivers();
      }),

    create: publicProcedure
      .input(z.object({
        name: z.string(),
        phone: z.string().optional(),
        licenseNumber: z.string().optional(),
        vehicleType: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return db.createDriver(input);
      }),

    update: publicProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        phone: z.string().optional(),
        licenseNumber: z.string().optional(),
        vehicleType: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return db.updateDriver(id, data);
      }),

    delete: publicProcedure
      .input(z.object({
        id: z.number(),
      }))
      .mutation(async ({ input }) => {
        return db.deleteDriver(input.id);
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
  }),
});

export type AppRouter = typeof appRouter;
