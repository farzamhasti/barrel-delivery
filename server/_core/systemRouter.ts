import { router, publicProcedure } from "./trpc";
import { z } from "zod";
import bcrypt from "bcrypt";
import { TRPCError } from "@trpc/server";
import { getSystemCredentialByUsername, createSystemSession, getSystemCredentialBySessionToken, deleteSystemSession } from "../db";
import { v4 as uuidv4 } from "uuid";

type SystemLoginInput = {
  username: string;
  password: string;
};

type SystemMeInput = {
  sessionToken?: string;
};

const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export const systemRouter = router({
  login: publicProcedure
    .input(z.object({
      username: z.string().min(1, "Username is required"),
      password: z.string().min(1, "Password is required"),
    }))
    .mutation(async ({ input }: { input: SystemLoginInput }) => {
      const credential = await getSystemCredentialByUsername(input.username);
      
      if (!credential) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid username or password",
        });
      }
      
      const passwordMatch = await bcrypt.compare(input.password, credential.passwordHash);
      
      if (!passwordMatch) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid username or password",
        });
      }
      
      // Create session token
      const sessionToken = uuidv4();
      const expiresAt = new Date(Date.now() + SESSION_DURATION);
      
      await createSystemSession(credential.id, sessionToken, expiresAt);
      
      return {
        sessionToken,
        role: credential.role,
        username: credential.username,
        expiresAt,
      };
    }),

  me: publicProcedure
    .input(z.object({
      sessionToken: z.string().optional(),
    }).optional())
    .query(async ({ input }: { input: SystemMeInput | undefined }) => {
      if (!input?.sessionToken) {
        return null;
      }
      
      const credential = await getSystemCredentialBySessionToken(input.sessionToken);
      
      if (!credential) {
        return null;
      }
      
      return {
        id: credential.id,
        username: credential.username,
        role: credential.role,
      };
    }),

  logout: publicProcedure
    .input(z.object({
      sessionToken: z.string(),
    }))
    .mutation(async ({ input }: { input: { sessionToken: string } }) => {
      await deleteSystemSession(input.sessionToken);
      return { success: true };
    }),
});
