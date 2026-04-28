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
        area: z.enum(['DT', 'CP', 'B']),
        deliveryTime: z.string().optional(),
        hasDeliveryTime: z.boolean().default(false),
        receiptText: z.string().optional(),
        receiptImage: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        // Convert datetime-local string (YYYY-MM-DDTHH:MM format) to proper timestamp
        let deliveryTimeValue: Date | null = null;
        if (input.deliveryTime) {
          try {
            // Handle both formats: datetime-local (YYYY-MM-DDTHH:MM) and ISO string
            if (input.deliveryTime.includes('T')) {
              // datetime-local format: YYYY-MM-DDTHH:MM
              deliveryTimeValue = new Date(input.deliveryTime);
            } else if (input.deliveryTime.includes(':')) {
              // HH:MM format (legacy)
              const today = new Date();
              const [hours, minutes] = input.deliveryTime.split(':');
              today.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
              deliveryTimeValue = today;
            }
          } catch (error) {
            console.error('[orders.createFromReceipt] Error parsing delivery time:', error);
          }
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
            
            // Upload original receipt image to S3 for storage
            const { storagePut } = await import('./storage');
            if (!storagePut) {
              throw new Error('storagePut function not available');
            }
            const timestamp = Date.now();
            const fileKey = `receipts/temp-${timestamp}.jpg`;
            const { url: s3ReceiptUrl } = await storagePut(fileKey, imageBuffer, 'image/jpeg');
            processedReceiptImage = s3ReceiptUrl;
            console.log('[orders.createFromReceipt] Receipt image uploaded to S3:', s3ReceiptUrl);
            
            // Analyze receipt with OCR using base64 data (more reliable for LLM)
            try {
              console.log('[orders.createFromReceipt] Starting OCR extraction with base64 data...');
              const { extractReceiptData, formatReceiptText } = await import('./ocrReceiptExtractor');
              // Pass the base64 data directly for LLM processing
              const receiptData = await extractReceiptData(base64Data);
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

    updateReceipt: publicProcedure
      .input(z.object({
        orderId: z.number(),
        receiptImage: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { storagePut } = await import('./storage');
        let receiptImageUrl = null;
        let formattedReceiptImageUrl = null;

        if (input.receiptImage) {
          try {
            const base64Data = input.receiptImage.replace(/^data:image\/[a-z]+;base64,/, '');
            const imageBuffer = Buffer.from(base64Data, 'base64');
            const timestamp = Date.now();
            const { url: s3ReceiptUrl } = await storagePut(
              `receipts/updated-${input.orderId}-${timestamp}.jpg`,
              imageBuffer,
              'image/jpeg'
            );
            receiptImageUrl = s3ReceiptUrl;
            console.log('[orders.updateReceipt] Receipt image uploaded to S3:', s3ReceiptUrl);
            
            // Analyze receipt with OCR using base64 data (more reliable for LLM)
            try {
              console.log('[orders.updateReceipt] Starting OCR extraction with base64 data...');
              const { extractReceiptData, formatReceiptText } = await import('./ocrReceiptExtractor');
              // Pass the base64 data directly for LLM processing
              const receiptData = await extractReceiptData(base64Data);
              console.log('[orders.updateReceipt] OCR extraction complete');
              
              // Store formatted receipt text
              formattedReceiptImageUrl = formatReceiptText(receiptData);
            } catch (ocrError) {
              console.error('[orders.updateReceipt] OCR extraction failed:', ocrError);
              // Continue without OCR if analysis fails
            }
          } catch (error) {
            console.error('Error uploading receipt image:', error);
          }
        }

        const updateData: any = {};
        if (receiptImageUrl !== null) updateData.receiptImage = receiptImageUrl;
        if (formattedReceiptImageUrl !== null) updateData.formattedReceiptImage = formattedReceiptImageUrl;
        return db.updateOrder(input.orderId, updateData);
      }),

    update: publicProcedure
      .input(z.object({
        orderId: z.number(),
        customerAddress: z.string().optional(),
        customerPhone: z.string().optional(),
        status: z.enum(['Pending', 'Ready', 'On the Way', 'Delivered']).optional(),
        area: z.enum(['DT', 'CP', 'B']).optional(),
        deliveryTime: z.string().nullable().optional(),
        receiptImage: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { orderId, deliveryTime, receiptImage, ...data } = input;
        
        let deliveryTimeValue: Date | null | undefined = undefined;
        if (deliveryTime === null) {
          deliveryTimeValue = null;
        } else if (deliveryTime) {
          deliveryTimeValue = new Date(deliveryTime);
        }
        
        const updateData: any = { ...data };
        if (deliveryTimeValue !== undefined) {
          updateData.deliveryTime = deliveryTimeValue;
        }
        
        // Process receipt image if provided
        if (receiptImage) {
          try {
            // Convert base64 to buffer
            const base64Data = receiptImage.replace(/^data:image\/[a-z]+;base64,/, '');
            const imageBuffer = Buffer.from(base64Data, 'base64');
            
            // Optimize image: compress and enhance for better OCR accuracy
            console.log('[orders.update] Optimizing image for processing...');
            const { processReceiptImage } = await import('./_core/imageEnhancement');
            const optimizedBuffer = await processReceiptImage(imageBuffer);
            console.log('[orders.update] Image optimization complete');
            
            // Upload optimized image to S3 temporarily for LLM analysis
            const { storagePut } = await import('./storage');
            const tempFileKey = `receipts/temp-${orderId}-${Date.now()}.jpg`;
            const { url: tempReceiptUrl } = await storagePut(tempFileKey, optimizedBuffer, 'image/jpeg');
            console.log('[orders.update] Optimized image uploaded to S3:', tempReceiptUrl);
            
            // Use accurate receipt extraction (same as order creation)
            console.log('[orders.update] Starting accurate receipt extraction...');
            const { extractReceiptData, formatReceiptText } = await import('./ocrReceiptExtractor');
            const receiptData = await extractReceiptData(base64Data);
            console.log('[orders.update] Receipt extraction complete');
            
            // Format receipt text with all extracted data
            const formattedReceiptText = formatReceiptText(receiptData);
            
            // Upload original receipt for reference
            const originalFileKey = `receipts/original-${orderId}-${Date.now()}.jpg`;
            const { url: originalReceiptUrl } = await storagePut(originalFileKey, optimizedBuffer, 'image/jpeg');
            
            // Update with formatted receipt text and extracted data
            updateData.receiptImage = originalReceiptUrl;
            updateData.formattedReceiptImage = formattedReceiptText;
            updateData.receiptText = formattedReceiptText;
            
            console.log('[orders.update] Receipt processing complete');
          } catch (error) {
            console.error('[orders.update] Error processing receipt image:', error);
            throw new Error('Failed to process receipt image');
          }
        }
        
        return db.updateOrder(orderId, updateData);
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
            latitude: result.latitude,
            longitude: result.longitude,
            formattedAddress: result.formattedAddress,
            placeId: result.placeId,
          };
        } catch (error) {
          console.error('[maps.geocode] Error:', error);
          return { error: 'Failed to geocode address' };
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
  }),
});

export type AppRouter = typeof appRouter;
