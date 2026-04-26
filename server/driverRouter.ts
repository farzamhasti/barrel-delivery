import { publicProcedure, router } from "./_core/trpc";
import { getSessionCookieOptions } from "./_core/cookies";
import { z } from "zod";
import * as db from "./db";
import crypto from "crypto";
import { TRPCError } from "@trpc/server";
import { calculateReturnTime } from "./returnTime";
import { calculateReturnTimeWithGoogleMaps } from "./googleMapsRouting";

export const driverRouter = router({
  login: publicProcedure
    .input(z.object({
      name: z.string().min(1, "Driver name is required"),
      licenseNumber: z.string().min(1, "License number is required"),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        // Find driver by name and license number
        const driver = await db.getDriverByNameAndLicense(input.name, input.licenseNumber);
        
        if (!driver) {
          throw new Error("Invalid driver name or license number");
        }
        
        // Create session token
        const sessionToken = crypto.randomBytes(32).toString("hex");
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
        
        // Save session to database
        await db.createDriverSession(driver.id, sessionToken, expiresAt);
        
        // Set session cookie (for server-side validation)
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie("driver_session", sessionToken, {
          ...cookieOptions,
          maxAge: 24 * 60 * 60 * 1000, // 24 hours
          httpOnly: false, // Allow frontend to read for localStorage
        });
        
        // Return session token for frontend to store in localStorage
        return {
          success: true,
          sessionToken,
          driverId: driver.id,
          driverName: driver.name,
          phone: driver.phone,
        };
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Login failed",
        });
      }
    }),

  me: publicProcedure
    .input(z.object({
      sessionToken: z.string().optional(),
    }).optional())
    .query(async ({ input, ctx }) => {
      try {
        // Try to get session token from cookie first, then from input (localStorage)
        let sessionToken = ctx.req.cookies?.driver_session;
        if (!sessionToken && input?.sessionToken) {
          sessionToken = input.sessionToken;
        }
        
        if (!sessionToken) return null;
        
        const driver = await db.getDriverBySessionToken(sessionToken);
        return driver || null;
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to fetch driver info",
        });
      }
    }),

  logout: publicProcedure
    .input(z.object({
      sessionToken: z.string().optional(),
    }).optional())
    .mutation(async ({ input, ctx }) => {
      try {
        // Try to get session token from cookie first, then from input
        let sessionToken = ctx.req.cookies?.driver_session;
        if (!sessionToken && input?.sessionToken) {
          sessionToken = input.sessionToken;
        }
        
        if (sessionToken) {
          await db.deleteDriverSession(sessionToken);
        }
        
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.clearCookie("driver_session", { ...cookieOptions, maxAge: -1 });
        
        return { success: true };
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Logout failed",
        });
      }
    }),

  getAssignedOrders: publicProcedure
    .input(z.object({
      sessionToken: z.string().optional(),
    }).optional())
    .query(async ({ input, ctx }) => {
      try {
        // Try to get session token from cookie first, then from input
        let sessionToken = ctx.req.cookies?.driver_session;
        if (!sessionToken && input?.sessionToken) {
          sessionToken = input.sessionToken;
        }
        
        if (!sessionToken) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Session token is required",
          });
        }
        
        const driver = await db.getDriverBySessionToken(sessionToken);
        if (!driver) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Driver not found",
          });
        }
        
        // Get all orders assigned to this driver with full details including items
        const orders = await db.getOrdersByDateRange(new Date().toISOString().split("T")[0], new Date().toISOString().split("T")[0], driver.id);
        
        // Fetch items for each order with menu item names
        const ordersWithItems = await Promise.all(
          orders.map(async (order: any) => {
            const items = await db.getOrderItemsWithMenuNames(order.id);
            return { ...order, items };
          })
        );
        
        return ordersWithItems;
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to fetch assigned orders",
        });
      }
    }),

  updateStatus: publicProcedure
    .input(z.object({
      sessionToken: z.string().optional(),
      status: z.enum(["online", "offline"]),
    }))
    .mutation(async ({ input }) => {
      try {
        let sessionToken = input.sessionToken;
        if (!sessionToken) {
          throw new Error("Session token is required");
        }
        
        const driver = await db.getDriverBySessionToken(sessionToken);
        if (!driver) {
          throw new Error("Driver not found");
        }
        
        // Update driver status
        await db.updateDriverStatus(driver.id, input.status);
        
        return {
          success: true,
          status: input.status,
          driverId: driver.id,
        };
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to update driver status",
        });
      }
    }),

  getActiveDrivers: publicProcedure
    .query(async () => {
      try {
        return db.getActiveDrivers();
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to fetch active drivers",
        });
      }
    }),

  markOrderDelivered: publicProcedure
    .input(z.object({
      sessionToken: z.string(),
      orderId: z.number(),
    }))
    .mutation(async ({ input }) => {
      try {
        const driver = await db.getDriverBySessionToken(input.sessionToken);
        if (!driver) {
          throw new Error("Driver not found");
        }

        // Update order status to "Delivered"
        const result = await db.updateOrderStatus(input.orderId, "Delivered");
        
        return {
          success: true,
          orderId: input.orderId,
          status: "Delivered",
        };
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to mark order as delivered",
        });
      }
    }),

  getPerformanceMetrics: publicProcedure
    .input(z.object({
      sessionToken: z.string().optional(),
    }).optional())
    .query(async ({ input, ctx }) => {
      try {
        let sessionToken = ctx.req.cookies?.driver_session;
        if (!sessionToken && input?.sessionToken) {
          sessionToken = input.sessionToken;
        }
        
        if (!sessionToken) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Session token is required",
          });
        }
        
        // Driver sessions not implemented in new schema
        // const driver = await db.getDriverBySessionToken(sessionToken);
        // if (!driver) {
        //   throw new TRPCError({
        //     code: "NOT_FOUND",
        //     message: "Driver not found",
        //   });
        // }
        
        // const metrics = await db.getDriverPerformanceMetrics(driver.id);
        const metrics = null;
        return metrics;
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to fetch performance metrics",
        });
      }
    }),

  calculateReturnTime: publicProcedure
    .input(z.object({
      sessionToken: z.string().optional(),
      restaurantLatitude: z.number().optional(),
      restaurantLongitude: z.number().optional(),
    }).optional())
    .mutation(async ({ input, ctx }) => {
      try {
        let sessionToken = ctx.req.cookies?.driver_session;
        if (!sessionToken && input?.sessionToken) {
          sessionToken = input.sessionToken;
        }
        
        if (!sessionToken) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Session token is required",
          });
        }
        
        const driver = await db.getDriverBySessionToken(sessionToken);
        if (!driver) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Driver not found",
          });
        }
        
        // Get driver's assigned orders
        const orders = await db.getOrdersWithCustomer(driver.id);
        
        // Filter for orders that are currently on the way (not delivered)
        const onTheWayOrders = orders.filter(
          (order) => order.status === "On the Way"
        );
        
        // If no on_the_way orders, return zero time
        if (onTheWayOrders.length === 0) {
          return {
            success: true,
            driverId: driver.id,
            ordersCount: 0,
            pickupTime: 0,
            deliveryTime: 0,
            travelTime: 0,
            totalSeconds: 0,
            totalMinutes: 0,
            breakdown: {
              pickupMinutes: 0,
              deliveryMinutes: 0,
              travelMinutes: 0,
            },
          };
        }
        
        // Restaurant coordinates: 224 Garrison Rd, Fort Erie, ON L2A 1M7
        const restaurantLat = input?.restaurantLatitude ?? 42.905191;
        const restaurantLng = input?.restaurantLongitude ?? -78.9225479;
        
        // Restaurant address for Google Maps
        const restaurantAddress = "224 Garrison Rd, Fort Erie, ON L2A 1M7";
        
        // Calculate return time using Google Maps Directions API
        const calculation = await calculateReturnTimeWithGoogleMaps(
          onTheWayOrders.map((order) => ({
            id: order.id,
            address: order.customerAddress || "",
            latitude: 0,
            longitude: 0,
          })),
          restaurantAddress,
          restaurantLat,
          restaurantLng
        );
        
        return {
          success: true,
          driverId: driver.id,
          ordersCount: onTheWayOrders.length,
          ...calculation,
        };
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to calculate return time",
        });
      }
    }),
});
