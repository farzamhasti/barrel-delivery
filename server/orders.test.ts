import { describe, it, expect, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

describe("orders", () => {
  it("should list orders", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.orders.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("should create a customer", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.customers.create({
      name: "John Doe",
      phone: "+1234567890",
      address: "123 Main St",
    });

    expect(result).toBeDefined();
    expect(result.name).toBe("John Doe");
  });

  it("should list drivers", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.drivers.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("should create a driver", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.drivers.create({
      name: "Driver One",
      phone: "+1234567890",
    });

    expect(result).toBeDefined();
    expect(result.name).toBe("Driver One");
  });

  it("should list menu categories", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.menu.categories.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("should list menu items", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.menu.items.list();
    expect(Array.isArray(result)).toBe(true);
  });
});
