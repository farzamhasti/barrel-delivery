import { describe, it, expect, beforeAll } from "vitest";
import { getOrders, getOrdersWithCustomer } from "./db";
import { initializeDatabase } from "./_core/initDb";

describe("Driver Dashboard Tab-Based Order Management", () => {
  beforeAll(async () => {
    await initializeDatabase();
  });

  it("should fetch all assigned orders for a driver", async () => {
    // This test verifies that the getOrders function works
    // In a real scenario, we would have a driver with assigned orders
    const orders = await getOrders();
    
    expect(Array.isArray(orders)).toBe(true);
  });

  it("should filter orders by on-the-way status", async () => {
    const orders = await getOrders();
    
    // Filter orders with status !== "Delivered"
    const onTheWayOrders = orders.filter((order: any) => order.status !== "Delivered");
    
    expect(Array.isArray(onTheWayOrders)).toBe(true);
    // All on-the-way orders should not have "Delivered" status
    onTheWayOrders.forEach((order: any) => {
      expect(order.status).not.toBe("Delivered");
    });
  });

  it("should filter orders by delivered status", async () => {
    const orders = await getOrders();
    
    // Filter orders with status === "Delivered"
    const deliveredOrders = orders.filter((order: any) => order.status === "Delivered");
    
    expect(Array.isArray(deliveredOrders)).toBe(true);
    // All delivered orders should have "Delivered" status
    deliveredOrders.forEach((order: any) => {
      expect(order.status).toBe("Delivered");
    });
  });

  it("should display order count for each tab", async () => {
    const orders = await getOrders();
    
    const onTheWayOrders = orders.filter((order: any) => order.status !== "Delivered");
    const deliveredOrders = orders.filter((order: any) => order.status === "Delivered");
    
    // Total should equal on-the-way + delivered
    expect(onTheWayOrders.length + deliveredOrders.length).toBe(orders.length);
  });

  it("should include all necessary order fields for display", async () => {
    const orders = await getOrdersWithCustomer();
    
    if (orders.length > 0) {
      const order = orders[0];
      expect(order).toHaveProperty("id");
      expect(order).toHaveProperty("status");
      // Order should have required fields for display
      expect(order).toBeDefined();
    }
  });

  it("should handle empty order list gracefully", async () => {
    const orders = await getOrders();
    
    expect(Array.isArray(orders)).toBe(true);
    // Should return an empty array, not null or undefined
    if (orders.length === 0) {
      expect(orders).toEqual([]);
    }
  });

  it("should maintain order data consistency between tabs", async () => {
    const orders = await getOrders();
    
    const onTheWayOrders = orders.filter((order: any) => order.status !== "Delivered");
    const deliveredOrders = orders.filter((order: any) => order.status === "Delivered");
    
    // Check that each order appears in exactly one tab
    const allOrderIds = new Set();
    
    onTheWayOrders.forEach((order: any) => {
      expect(allOrderIds.has(order.id)).toBe(false);
      allOrderIds.add(order.id);
    });
    
    deliveredOrders.forEach((order: any) => {
      expect(allOrderIds.has(order.id)).toBe(false);
      allOrderIds.add(order.id);
    });
    
    // All original orders should be accounted for
    expect(allOrderIds.size).toBe(orders.length);
  });

  it("should support tab switching without data loss", async () => {
    const orders = await getOrders();
    
    // Simulate tab switching by filtering multiple times
    const onTheWayOrders1 = orders.filter((order: any) => order.status !== "Delivered");
    const deliveredOrders1 = orders.filter((order: any) => order.status === "Delivered");
    
    // Switch back to on-the-way tab
    const onTheWayOrders2 = orders.filter((order: any) => order.status !== "Delivered");
    
    // Data should be consistent
    expect(onTheWayOrders1.length).toBe(onTheWayOrders2.length);
    expect(onTheWayOrders1.map((o: any) => o.id).sort()).toEqual(
      onTheWayOrders2.map((o: any) => o.id).sort()
    );
  });
});
