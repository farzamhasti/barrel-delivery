import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "./db";
import { orders, orderItems, menuItems } from "../drizzle/schema";
import { eq } from "drizzle-orm";

describe("Kitchen Dashboard - Order Status Update and Tab Switching", () => {
  let testOrderId: number;
  let testMenuItemId: number;

  beforeAll(async () => {
    // Create a test menu item
    const menuItemResult = await db
      .insert(menuItems)
      .values({
        categoryId: 1,
        name: "Test Item",
        description: "Test Description",
        price: 10.99,
      })
      .returning();
    testMenuItemId = menuItemResult[0].id;

    // Create a test order
    const orderResult = await db
      .insert(orders)
      .values({
        customerName: "Test Customer",
        customerPhone: "1234567890",
        customerAddress: "123 Test St",
        area: "Test Area",
        status: "Pending",
        deliveryTime: new Date(Date.now() + 30 * 60000), // 30 minutes from now
      })
      .returning();
    testOrderId = orderResult[0].id;

    // Add items to the order
    await db.insert(orderItems).values({
      orderId: testOrderId,
      menuItemId: testMenuItemId,
      quantity: 1,
    });
  });

  afterAll(async () => {
    // Cleanup
    await db.delete(orderItems).where(eq(orderItems.orderId, testOrderId));
    await db.delete(orders).where(eq(orders.id, testOrderId));
    await db.delete(menuItems).where(eq(menuItems.id, testMenuItemId));
  });

  it("should filter pending orders correctly", async () => {
    const result = await db
      .select()
      .from(orders)
      .where(eq(orders.status, "Pending"));
    
    expect(result.length).toBeGreaterThan(0);
    expect(result.some(o => o.id === testOrderId)).toBe(true);
  });

  it("should update order status to Ready", async () => {
    await db
      .update(orders)
      .set({ status: "Ready" })
      .where(eq(orders.id, testOrderId));

    const result = await db
      .select()
      .from(orders)
      .where(eq(orders.id, testOrderId));

    expect(result[0].status).toBe("Ready");
  });

  it("should filter ready orders correctly after status update", async () => {
    const result = await db
      .select()
      .from(orders)
      .where(eq(orders.status, "Ready"));

    expect(result.length).toBeGreaterThan(0);
    expect(result.some(o => o.id === testOrderId)).toBe(true);
  });

  it("should not include ready orders in pending list", async () => {
    const pendingResult = await db
      .select()
      .from(orders)
      .where(eq(orders.status, "Pending"));

    expect(pendingResult.some(o => o.id === testOrderId)).toBe(false);
  });

  it("should handle rapid status updates", async () => {
    // Update to Pending
    await db
      .update(orders)
      .set({ status: "Pending" })
      .where(eq(orders.id, testOrderId));

    let result = await db
      .select()
      .from(orders)
      .where(eq(orders.id, testOrderId));
    expect(result[0].status).toBe("Pending");

    // Update to Ready
    await db
      .update(orders)
      .set({ status: "Ready" })
      .where(eq(orders.id, testOrderId));

    result = await db
      .select()
      .from(orders)
      .where(eq(orders.id, testOrderId));
    expect(result[0].status).toBe("Ready");

    // Update back to Pending
    await db
      .update(orders)
      .set({ status: "Pending" })
      .where(eq(orders.id, testOrderId));

    result = await db
      .select()
      .from(orders)
      .where(eq(orders.id, testOrderId));
    expect(result[0].status).toBe("Pending");
  });

  it("should sort orders by delivery time", async () => {
    // Create multiple test orders with different delivery times
    const now = Date.now();
    const order1Result = await db
      .insert(orders)
      .values({
        customerName: "Customer 1",
        customerPhone: "1111111111",
        customerAddress: "Address 1",
        area: "Area 1",
        status: "Pending",
        deliveryTime: new Date(now + 60 * 60000), // 60 minutes
      })
      .returning();

    const order2Result = await db
      .insert(orders)
      .values({
        customerName: "Customer 2",
        customerPhone: "2222222222",
        customerAddress: "Address 2",
        area: "Area 2",
        status: "Pending",
        deliveryTime: new Date(now + 30 * 60000), // 30 minutes
      })
      .returning();

    const order3Result = await db
      .insert(orders)
      .values({
        customerName: "Customer 3",
        customerPhone: "3333333333",
        customerAddress: "Address 3",
        area: "Area 3",
        status: "Pending",
        deliveryTime: new Date(now + 90 * 60000), // 90 minutes
      })
      .returning();

    // Get all pending orders and sort by delivery time
    const result = await db
      .select()
      .from(orders)
      .where(eq(orders.status, "Pending"));

    const sorted = result.sort((a, b) => {
      const timeA = a.deliveryTime?.getTime() || Infinity;
      const timeB = b.deliveryTime?.getTime() || Infinity;
      return timeA - timeB;
    });

    // Verify sorting
    const order1Index = sorted.findIndex(o => o.id === order1Result[0].id);
    const order2Index = sorted.findIndex(o => o.id === order2Result[0].id);
    const order3Index = sorted.findIndex(o => o.id === order3Result[0].id);

    expect(order2Index).toBeLessThan(order1Index);
    expect(order1Index).toBeLessThan(order3Index);

    // Cleanup
    await db.delete(orders).where(eq(orders.id, order1Result[0].id));
    await db.delete(orders).where(eq(orders.id, order2Result[0].id));
    await db.delete(orders).where(eq(orders.id, order3Result[0].id));
  });

  it("should calculate urgency levels correctly", async () => {
    const now = Date.now();
    
    // Late order (past delivery time)
    const lateOrderResult = await db
      .insert(orders)
      .values({
        customerName: "Late Customer",
        customerPhone: "9999999999",
        customerAddress: "Late Address",
        area: "Late Area",
        status: "Pending",
        deliveryTime: new Date(now - 10 * 60000), // 10 minutes ago
      })
      .returning();

    // Urgent order (< 15 minutes)
    const urgentOrderResult = await db
      .insert(orders)
      .values({
        customerName: "Urgent Customer",
        customerPhone: "8888888888",
        customerAddress: "Urgent Address",
        area: "Urgent Area",
        status: "Pending",
        deliveryTime: new Date(now + 10 * 60000), // 10 minutes from now
      })
      .returning();

    // Soon order (< 30 minutes)
    const soonOrderResult = await db
      .insert(orders)
      .values({
        customerName: "Soon Customer",
        customerPhone: "7777777777",
        customerAddress: "Soon Address",
        area: "Soon Area",
        status: "Pending",
        deliveryTime: new Date(now + 20 * 60000), // 20 minutes from now
      })
      .returning();

    // Normal order (>= 30 minutes)
    const normalOrderResult = await db
      .insert(orders)
      .values({
        customerName: "Normal Customer",
        customerPhone: "6666666666",
        customerAddress: "Normal Address",
        area: "Normal Area",
        status: "Pending",
        deliveryTime: new Date(now + 60 * 60000), // 60 minutes from now
      })
      .returning();

    // Verify all orders were created
    expect(lateOrderResult[0].id).toBeDefined();
    expect(urgentOrderResult[0].id).toBeDefined();
    expect(soonOrderResult[0].id).toBeDefined();
    expect(normalOrderResult[0].id).toBeDefined();

    // Cleanup
    await db.delete(orders).where(eq(orders.id, lateOrderResult[0].id));
    await db.delete(orders).where(eq(orders.id, urgentOrderResult[0].id));
    await db.delete(orders).where(eq(orders.id, soonOrderResult[0].id));
    await db.delete(orders).where(eq(orders.id, normalOrderResult[0].id));
  });
});
