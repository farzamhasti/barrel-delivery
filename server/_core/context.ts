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
    try {
      const session = await getSystemSessionByToken(systemSessionToken);
      if (session) {
        systemSession = {
          username: session.username,
          role: session.role,
        };
      }
    } catch (error) {
      // System session is optional
      systemSession = null;
    }
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
    systemSession,
  };
}
