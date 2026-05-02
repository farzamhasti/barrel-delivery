import { z } from "zod";
import { notifyOwner } from "./notification";
import { adminProcedure, publicProcedure, router } from "./trpc";
import { getSystemCredentials, verifySystemPassword, createSystemSession, getSystemSessionByToken, deleteSystemSession } from "../db";
import crypto from "crypto";

export const systemRouter = router({
  health: publicProcedure
    .input(
      z.object({
        timestamp: z.number().min(0, "timestamp cannot be negative"),
      })
    )
    .query(() => ({
      ok: true,
    })),

  login: publicProcedure
    .input(
      z.object({
        username: z.string().min(1, "username is required"),
        password: z.string().min(1, "password is required"),
        role: z.enum(["admin", "kitchen"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      console.log(`[Login] Attempting login for username: ${input.username}, role: ${input.role}`);
      // Get credentials from database
      const credentials = await getSystemCredentials(input.username);
      
      if (!credentials) {
        console.error(`[Login] User not found: ${input.username}`);
        throw new Error("Invalid username or password");
      }

      console.log(`[Login] User found: ${credentials.username}, role: ${credentials.role}`);

      // Verify password
      const isPasswordValid = await verifySystemPassword(input.password, credentials.passwordHash);
      console.log(`[Login] Password verification result: ${isPasswordValid}`);
      
      if (!isPasswordValid) {
        console.error(`[Login] Invalid password for user: ${input.username}`);
        throw new Error("Invalid username or password");
      }

      // Check role matches
      if (credentials.role !== input.role) {
        console.error(`[Login] Role mismatch. Expected: ${input.role}, Got: ${credentials.role}`);
        throw new Error("Invalid role for this account");
      }

      // Create session
      const sessionToken = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      
      await createSystemSession(credentials.id, sessionToken, expiresAt);

      // Set HTTP-only cookie with session token
      ctx.res.cookie('systemSessionToken', sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        path: '/',
      });

      return {
        sessionToken,
        username: credentials.username,
        role: credentials.role,
      };
    }),

  me: publicProcedure
    .input(
      z.object({
        sessionToken: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      if (!input.sessionToken) {
        return null;
      }

      const session = await getSystemSessionByToken(input.sessionToken);
      
      if (!session) {
        return null;
      }

      return {
        username: session.username,
        role: session.role,
      };
    }),

  checkSession: publicProcedure
    .query(async ({ ctx }) => {
      if (!ctx.systemSession) {
        return null;
      }

      return {
        username: ctx.systemSession.username,
        role: ctx.systemSession.role,
      };
    }),

  logout: publicProcedure
    .input(
      z.object({
        sessionToken: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await deleteSystemSession(input.sessionToken);
      // Clear the HTTP-only cookie
      ctx.res.clearCookie('systemSessionToken', {
        httpOnly: true,
        path: '/',
      });
      return { success: true };
    }),

  createSystemCredentials: adminProcedure
    .input(
      z.object({
        username: z.string().min(1, "username is required"),
        password: z.string().min(6, "password must be at least 6 characters"),
        role: z.enum(["admin", "kitchen"]),
      })
    )
    .mutation(async ({ input }) => {
      const { createSystemCredentials } = await import("../db");
      const result = await createSystemCredentials(input.username, input.password, input.role);
      return {
        success: !!result,
        message: result ? `${input.role} credentials created successfully` : "Failed to create credentials",
      };
    }),

  notifyOwner: adminProcedure
    .input(
      z.object({
        title: z.string().min(1, "title is required"),
        content: z.string().min(1, "content is required"),
      })
    )
    .mutation(async ({ input }) => {
      const delivered = await notifyOwner(input);
      return {
        success: delivered,
      } as const;
    }),
});
