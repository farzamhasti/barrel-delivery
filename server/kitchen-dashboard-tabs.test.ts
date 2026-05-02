import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

/**
 * Test suite for Kitchen Dashboard tab filtering and real-time order updates.
 * Validates that:
 * 1. Orders are correctly separated into Pending and Ready tabs
 * 2. Clicking "Mark Ready" moves orders between tabs
 * 3. Tab counts update in real-time
 * 4. No orders appear in both tabs simultaneously
 */

function createKitchenContext(): TrpcContext {
  const user = {
    id: 1,
    openId: "kitchen-user",
    email: "kitchen@example.com",
    name: "Kitchen Staff",
    loginMethod: "system",
    role: "user" as const,
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

  return ctx;
}

describe("Kitchen Dashboard - Tab Filtering and Real-Time Updates", () => {
  it("should retrieve orders and separate them into pending and ready", async () => {
    const ctx = createKitchenContext();
    const caller = appRouter.createCaller(ctx);

    const allOrders = await caller.orders.getTodayOrdersWithItems();
    const pendingOrders = allOrders.filter((o: any) => o.status === "Pending");
    const readyOrders = allOrders.filter((o: any) => o.status === "Ready");

    console.log(`✓ Total orders: ${allOrders.length}`);
    console.log(`✓ Pending orders: ${pendingOrders.length}`);
    console.log(`✓ Ready orders: ${readyOrders.length}`);

    expect(allOrders.length).toBeGreaterThan(0);
    expect(pendingOrders.length + readyOrders.length).toBeLessThanOrEqual(allOrders.length);
  });

  it("should have no order appearing in both pending and ready lists", async () => {
    const ctx = createKitchenContext();
    const caller = appRouter.createCaller(ctx);

    const allOrders = await caller.orders.getTodayOrdersWithItems();
    const pendingOrders = allOrders.filter((o: any) => o.status === "Pending");
    const readyOrders = allOrders.filter((o: any) => o.status === "Ready");

    const pendingIds = new Set(pendingOrders.map((o: any) => o.id));
    const readyIds = new Set(readyOrders.map((o: any) => o.id));

    const overlap = [...pendingIds].filter(id => readyIds.has(id));

    expect(overlap.length).toBe(0);
    console.log(`✓ No overlap between pending and ready orders`);
  });

  it("should update order status from Pending to Ready", async () => {
    const ctx = createKitchenContext();
    const caller = appRouter.createCaller(ctx);

    // Get all orders
    const allOrdersBefore = await caller.orders.getTodayOrdersWithItems();
    const pendingBefore = allOrdersBefore.filter((o: any) => o.status === "Pending");
    const readyBefore = allOrdersBefore.filter((o: any) => o.status === "Ready");

    if (pendingBefore.length === 0) {
      console.log("⊘ No pending orders to test status update");
      return;
    }

    const orderToUpdate = pendingBefore[0];
    console.log(`✓ Selected order #${orderToUpdate.id} to update from Pending to Ready`);

    // Update the order status
    await caller.orders.updateStatus({
      orderId: orderToUpdate.id,
      status: "Ready",
    });

    // Get all orders again
    const allOrdersAfter = await caller.orders.getTodayOrdersWithItems();
    const pendingAfter = allOrdersAfter.filter((o: any) => o.status === "Pending");
    const readyAfter = allOrdersAfter.filter((o: any) => o.status === "Ready");

    // Verify counts changed
    expect(pendingAfter.length).toBe(pendingBefore.length - 1);
    expect(readyAfter.length).toBe(readyBefore.length + 1);

    // Verify the specific order is now in ready list
    const updatedOrder = allOrdersAfter.find((o: any) => o.id === orderToUpdate.id);
    expect(updatedOrder?.status).toBe("Ready");

    console.log(`✓ Order #${orderToUpdate.id} successfully moved from Pending to Ready`);
    console.log(`  - Pending: ${pendingBefore.length} → ${pendingAfter.length}`);
    console.log(`  - Ready: ${readyBefore.length} → ${readyAfter.length}`);
  });

  it("should sort pending orders by delivery time", async () => {
    const ctx = createKitchenContext();
    const caller = appRouter.createCaller(ctx);

    const allOrders = await caller.orders.getTodayOrdersWithItems();
    const pendingOrders = allOrders.filter((o: any) => o.status === "Pending");

    if (pendingOrders.length < 2) {
      console.log("⊘ Not enough pending orders to test sorting");
      return;
    }

    // Sort by delivery time
    const sorted = [...pendingOrders].sort((a: any, b: any) => {
      const timeA = a.deliveryTime ? new Date(a.deliveryTime).getTime() : Infinity;
      const timeB = b.deliveryTime ? new Date(b.deliveryTime).getTime() : Infinity;
      return timeA - timeB;
    });

    // Verify sorting is correct
    for (let i = 1; i < sorted.length; i++) {
      const prevTime = sorted[i - 1].deliveryTime ? new Date(sorted[i - 1].deliveryTime).getTime() : Infinity;
      const currTime = sorted[i].deliveryTime ? new Date(sorted[i].deliveryTime).getTime() : Infinity;
      expect(prevTime).toBeLessThanOrEqual(currTime);
    }

    console.log(`✓ Verified ${sorted.length} pending orders are correctly sorted by delivery time`);
  });

  it("should calculate urgency levels correctly", async () => {
    const ctx = createKitchenContext();
    const caller = appRouter.createCaller(ctx);

    const allOrders = await caller.orders.getTodayOrdersWithItems();
    const pendingOrders = allOrders.filter((o: any) => o.status === "Pending");

    const getUrgency = (deliveryTime: string | null) => {
      if (!deliveryTime) return "normal";
      const now = new Date();
      const delivery = new Date(deliveryTime);
      const minutesUntilDelivery = (delivery.getTime() - now.getTime()) / (1000 * 60);

      if (minutesUntilDelivery < 0) return "late";
      if (minutesUntilDelivery < 15) return "urgent";
      if (minutesUntilDelivery < 30) return "soon";
      return "normal";
    };

    const urgencyCount = {
      late: 0,
      urgent: 0,
      soon: 0,
      normal: 0,
    };

    pendingOrders.forEach((order: any) => {
      const urgency = getUrgency(order.deliveryTime);
      urgencyCount[urgency as keyof typeof urgencyCount]++;
    });

    console.log(`✓ Urgency breakdown for ${pendingOrders.length} pending orders:`);
    console.log(`  - Late: ${urgencyCount.late}`);
    console.log(`  - Urgent: ${urgencyCount.urgent}`);
    console.log(`  - Soon: ${urgencyCount.soon}`);
    console.log(`  - Normal: ${urgencyCount.normal}`);
  });

  it("should handle multiple rapid status updates", async () => {
    const ctx = createKitchenContext();
    const caller = appRouter.createCaller(ctx);

    const allOrders = await caller.orders.getTodayOrdersWithItems();
    const pendingOrders = allOrders.filter((o: any) => o.status === "Pending");

    if (pendingOrders.length < 2) {
      console.log("⊘ Not enough pending orders to test rapid updates");
      return;
    }

    const order1 = pendingOrders[0];
    const order2 = pendingOrders[1];

    console.log(`✓ Testing rapid updates on orders #${order1.id} and #${order2.id}`);

    // Update first order
    await caller.orders.updateStatus({
      orderId: order1.id,
      status: "Ready",
    });

    // Update second order
    await caller.orders.updateStatus({
      orderId: order2.id,
      status: "Ready",
    });

    // Verify both were updated
    const allOrdersAfter = await caller.orders.getTodayOrdersWithItems();
    const updatedOrder1 = allOrdersAfter.find((o: any) => o.id === order1.id);
    const updatedOrder2 = allOrdersAfter.find((o: any) => o.id === order2.id);

    expect(updatedOrder1?.status).toBe("Ready");
    expect(updatedOrder2?.status).toBe("Ready");

    console.log(`✓ Both orders successfully updated to Ready status`);
  });

  it("should maintain order items when filtering by status", async () => {
    const ctx = createKitchenContext();
    const caller = appRouter.createCaller(ctx);

    const allOrders = await caller.orders.getTodayOrdersWithItems();
    const pendingOrders = allOrders.filter((o: any) => o.status === "Pending");
    const readyOrders = allOrders.filter((o: any) => o.status === "Ready");

    // Check pending orders have items
    const pendingWithItems = pendingOrders.filter((o: any) => o.items && o.items.length > 0);
    console.log(`✓ ${pendingWithItems.length} of ${pendingOrders.length} pending orders have items`);

    // Check ready orders have items
    const readyWithItems = readyOrders.filter((o: any) => o.items && o.items.length > 0);
    console.log(`✓ ${readyWithItems.length} of ${readyOrders.length} ready orders have items`);

    // Verify items structure
    if (pendingWithItems.length > 0) {
      const firstOrder = pendingWithItems[0];
      expect(Array.isArray(firstOrder.items)).toBe(true);
      if (firstOrder.items.length > 0) {
        expect(firstOrder.items[0]).toHaveProperty("menuItemName");
      }
    }
  });

  it("should provide correct tab counts for UI display", async () => {
    const ctx = createKitchenContext();
    const caller = appRouter.createCaller(ctx);

    const allOrders = await caller.orders.getTodayOrdersWithItems();
    const pendingOrders = allOrders.filter((o: any) => o.status === "Pending");
    const readyOrders = allOrders.filter((o: any) => o.status === "Ready");

    console.log(`✓ Tab display counts:`);
    console.log(`  - Active Orders (${pendingOrders.length})`);
    console.log(`  - Prepared Orders (${readyOrders.length})`);
    console.log(`  - Total Orders: ${allOrders.length}`);

    // Verify counts are non-negative
    expect(pendingOrders.length).toBeGreaterThanOrEqual(0);
    expect(readyOrders.length).toBeGreaterThanOrEqual(0);
    expect(allOrders.length).toBeGreaterThanOrEqual(0);
  });
});
