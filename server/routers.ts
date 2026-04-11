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
        // Drizzle ORM returns an array [ResultSetHeader, undefined]
        const orderId = Array.isArray(order) ? (order as any)[0]?.insertId : (order as any).insertId;
        for (const item of input.items) {
          await db.createOrderItem({
            orderId,
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
        status: z.enum(["Pending", "On the Way", "Delivered"]).optional(),
      }))
      .mutation(async ({ input }) => {
        const { orderId, ...updateData } = input;
        return db.updateOrder(orderId, updateData as any);
      }),
    updateItem: protectedProcedure
      .input(z.object({
        itemId: z.number(),
        quantity: z.number().optional(),
        priceAtOrder: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { itemId, ...updateData } = input;
        return db.updateOrderItem(itemId, updateData as any);
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
  }),
});

export type AppRouter = typeof appRouter;
