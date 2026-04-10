import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";

export const appRouter = router({
  system: systemRouter,
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
          isAvailable: z.boolean().optional(),
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
          return db.updateMenuItem(id, data as any);
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
        userId: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        return db.createDriver({
          ...input,
          userId: input.userId as any,
        });
      }),
    updateLocation: publicProcedure
      .input(z.object({
        driverId: z.number(),
        latitude: z.number(),
        longitude: z.number(),
      }))
      .mutation(async ({ input }) => {
        return db.updateDriverLocation(input.driverId, input.latitude, input.longitude);
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
  }),

  // Orders
  orders: router({
    list: publicProcedure
      .input(z.object({ driverId: z.number().optional() }).optional())
      .query(async ({ input }) => {
        return db.getOrders(input?.driverId);
      }),
    create: publicProcedure
      .input(z.object({
        customerId: z.number(),
        totalPrice: z.number(),
        notes: z.string().optional(),
        items: z.array(z.object({
          menuItemId: z.number(),
          quantity: z.number(),
          priceAtOrder: z.number(),
        })),
      }))
      .mutation(async ({ input }) => {
        const order = await db.createOrder({
          customerId: input.customerId,
          totalPrice: input.totalPrice as any,
          notes: input.notes,
        });
        
        // Create order items
        for (const item of input.items) {
          await db.createOrderItem({
            orderId: (order as any).insertId,
            menuItemId: item.menuItemId,
            quantity: item.quantity,
            priceAtOrder: item.priceAtOrder as any,
          });
        }
        
        return order;
      }),
    updateStatus: protectedProcedure
      .input(z.object({
        orderId: z.number(),
        status: z.enum(["Pending", "On the Way", "Delivered"]),
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
  }),
});

export type AppRouter = typeof appRouter;
