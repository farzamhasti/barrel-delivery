import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { getSystemSessionByToken } from "../db";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  systemSession?: { username: string; role: string } | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;
  let systemSession: { username: string; role: string } | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  // Check for system session token in cookies or headers
  const systemSessionToken = (opts.req.cookies?.systemSessionToken || opts.req.headers['x-system-session-token']) as string | undefined;
  
  if (systemSessionToken) {
    console.log('[Context] System session token found:', systemSessionToken.substring(0, 20) + '...');
    try {
      const session = await getSystemSessionByToken(systemSessionToken);
      console.log('[Context] Session lookup result:', session ? `Found - role: ${session.role}` : 'Not found');
      if (session) {
        systemSession = {
          username: session.username,
          role: session.role,
        };
        console.log('[Context] System session set - username:', session.username, 'role:', session.role);
      } else {
        console.log('[Context] Session token not found in database or expired');
      }
    } catch (error) {
      console.error('[Context] Error retrieving system session:', error);
      systemSession = null;
    }
  } else {
    console.log('[Context] No system session token in request');
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
    systemSession,
  };
}
