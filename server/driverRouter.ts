import { publicProcedure, router } from "./_core/trpc";
import { getSessionCookieOptions } from "./_core/cookies";
import { z } from "zod";
import * as db from "./db";
import crypto from "crypto";

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
        
        // Set session cookie
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie("driver_session", sessionToken, {
          ...cookieOptions,
          maxAge: 24 * 60 * 60 * 1000, // 24 hours
        });
        
        return {
          success: true,
          driverId: driver.id,
          driverName: driver.name,
        };
      } catch (error: any) {
        throw new Error(error.message || "Login failed");
      }
    }),

  me: publicProcedure.query(async ({ ctx }) => {
    try {
      const sessionToken = ctx.req.cookies?.driver_session;
      if (!sessionToken) return null;
      
      const driver = await db.getDriverBySessionToken(sessionToken);
      return driver || null;
    } catch (error) {
      return null;
    }
  }),

  logout: publicProcedure.mutation(async ({ ctx }) => {
    try {
      const sessionToken = ctx.req.cookies?.driver_session;
      if (sessionToken) {
        await db.deleteDriverSession(sessionToken);
      }
      
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie("driver_session", { ...cookieOptions, maxAge: -1 });
      
      return { success: true };
    } catch (error) {
      return { success: false };
    }
  }),

  getAssignedOrders: publicProcedure.query(async ({ ctx }) => {
    try {
      const sessionToken = ctx.req.cookies?.driver_session;
      if (!sessionToken) return [];
      
      const driver = await db.getDriverBySessionToken(sessionToken);
      if (!driver) return [];
      
      // Get all orders assigned to this driver
      return db.getOrdersByDateRange(new Date().toISOString().split("T")[0], new Date().toISOString().split("T")[0], driver.id);
    } catch (error) {
      return [];
    }
  }),
});
