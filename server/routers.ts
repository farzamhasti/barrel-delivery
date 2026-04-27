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
            
            // Upload original receipt image to S3
            const { storagePut } = await import('./storage');
            if (!storagePut) {
              throw new Error('storagePut function not available');
            }
            const timestamp = Date.now();
            const fileKey = `receipts/${input.orderNumber || 'order'}-${timestamp}.jpg`;
            const { url: originalReceiptUrl } = await storagePut(fileKey, imageBuffer, 'image/jpeg');
            processedReceiptImage = originalReceiptUrl;
            console.log('[orders.createFromReceipt] Receipt image uploaded to S3:', originalReceiptUrl);
            
            // Analyze receipt with OCR to extract check number and items
            try {
              console.log('[orders.createFromReceipt] Starting OCR analysis...');
              const { analyzeReceiptImage } = await import('./receiptAnalyzer');
              const receiptData = await analyzeReceiptImage(originalReceiptUrl);
              console.log('[orders.createFromReceipt] OCR analysis complete:', receiptData);
              
              // Generate formatted receipt image from extracted data
              console.log('[orders.createFromReceipt] Generating formatted receipt image...');
              const { generateFormattedReceipt } = await import('./receiptGenerator');
              const formattedReceiptBuffer = await generateFormattedReceipt({
                checkNumber: receiptData.checkNumber || input.orderNumber || 'N/A',
                items: receiptData.items || [],
              });
              
              // Upload formatted receipt to S3
              const formattedFileKey = `receipts/${input.orderNumber || 'order'}-formatted-${timestamp}.png`;
              const { url: formattedReceiptUrl } = await storagePut(formattedFileKey, formattedReceiptBuffer, 'image/png');
              console.log('[orders.createFromReceipt] Formatted receipt uploaded to S3:', formattedReceiptUrl);
              
              formattedReceiptImage = formattedReceiptUrl;
              
              // Use extracted check number if not provided
              if (receiptData.checkNumber && !input.orderNumber) {
                extractedCheckNumber = receiptData.checkNumber;
              }
            } catch (ocrError) {
              console.error('[orders.createFromReceipt] OCR analysis failed:', ocrError);
              // Continue without OCR if analysis fails - the original receipt is still saved
            }
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
          formattedReceiptImage: formattedReceiptImage,
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

    getTodayWithItems: publicProcedure
      .query(async () => {
        return db.getTodayOrdersWithItems();
      }),

    getReadyOrders: publicProcedure
      .query(async () => {
        return db.getOrdersByDateRange(new Date(), new Date());
      }),
  }),

  system: router({
    login: publicProcedure
      .input(z.object({
        username: z.string(),
        password: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Simple credential check - in production, use proper authentication
        const validCredentials = [
          { username: 'barrel_admin', password: 'admin123', role: 'admin' },
          { username: 'barrel_kitchen', password: 'kitchen123', role: 'kitchen' },
        ];
        
        const user = validCredentials.find(
          u => u.username === input.username && u.password === input.password
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
