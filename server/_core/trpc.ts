import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

// Ensure all numbers are properly serialized through Superjson
// This prevents Decimal objects from being corrupted during serialization
const transformer = superjson;

const t = initTRPC.context<TrpcContext>().create({
  transformer,
});

export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== 'admin') {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);

// System admin procedure for dashboard operations using system session tokens
export const systemAdminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.systemSession || ctx.systemSession.role !== 'admin') {
      throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        systemSession: ctx.systemSession,
      },
    });
  }),
);

// Hybrid admin procedure that accepts either OAuth admin or system session admin
export const adminOrSystemAdminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    const isOAuthAdmin = ctx.user && ctx.user.role === 'admin';
    const isSystemAdmin = ctx.systemSession && ctx.systemSession.role === 'admin';

    if (!isOAuthAdmin && !isSystemAdmin) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
        systemSession: ctx.systemSession,
      },
    });
  }),
);
