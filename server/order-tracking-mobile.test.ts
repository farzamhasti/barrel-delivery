import { describe, it, expect, beforeAll } from "vitest";
import * as db from "./db";

describe("Order Tracking Mobile Layout", () => {
  beforeAll(async () => {
    // Ensure database is initialized
    const database = await db.getDb();
    if (!database) {
      throw new Error("Database not available");
    }
  });

  it("should return active orders for display", async () => {
    const orders = await db.getTodayOrdersWithItems();
    
    // Filter to active orders (same logic as component)
    const activeOrders = orders.filter((o: any) =>
      ["Pending", "Ready", "On the Way"].includes(o.status)
    );

    expect(Array.isArray(activeOrders)).toBe(true);
    console.log(`Found ${activeOrders.length} active orders`);
  });

  it("should return orders with customer location data for map", async () => {
    const orders = await db.getTodayOrdersWithItems();
    
    const activeOrders = orders.filter((o: any) =>
      ["Pending", "Ready", "On the Way"].includes(o.status)
    );

    activeOrders.forEach((order: any) => {
      expect(order).toHaveProperty("customer");
      if (order.customer) {
        expect(order.customer).toHaveProperty("latitude");
        expect(order.customer).toHaveProperty("longitude");
      }
    });
  });

  it("should return orders with complete details for list display", async () => {
    const orders = await db.getTodayOrdersWithItems();
    
    const activeOrders = orders.filter((o: any) =>
      ["Pending", "Ready", "On the Way"].includes(o.status)
    );

    if (activeOrders.length > 0) {
      const order = activeOrders[0];
      
      expect(order).toHaveProperty("id");
      expect(order).toHaveProperty("status");
      expect(order).toHaveProperty("totalPrice");
      expect(order).toHaveProperty("customer");
      expect(order).toHaveProperty("items");
      
      console.log("Sample active order:", {
        id: order.id,
        status: order.status,
        totalPrice: order.totalPrice,
        itemCount: order.items?.length || 0,
      });
    }
  });

  it("should return orders with status values for filtering", async () => {
    const orders = await db.getTodayOrdersWithItems();
    
    const statuses = new Set(orders.map((o: any) => o.status));
    console.log("Available order statuses:", Array.from(statuses));
    
    // Verify we have the expected status values
    const expectedStatuses = ["Pending", "Ready", "On the Way", "Delivered"];
    expectedStatuses.forEach((status) => {
      // At least one of these statuses should exist
      expect(Array.from(statuses).some((s: any) => 
        expectedStatuses.includes(s)
      )).toBe(true);
    });
  });

  it("should handle empty orders list gracefully", async () => {
    const orders = await db.getTodayOrdersWithItems();
    
    expect(Array.isArray(orders)).toBe(true);
    
    // Empty list should still be an array
    if (orders.length === 0) {
      console.log("No orders available today");
    }
  });

  it("should return orders with items for mobile display", async () => {
    const orders = await db.getTodayOrdersWithItems();
    
    const activeOrders = orders.filter((o: any) =>
      ["Pending", "Ready", "On the Way"].includes(o.status)
    );

    activeOrders.forEach((order: any) => {
      expect(order.items).toBeDefined();
      expect(Array.isArray(order.items)).toBe(true);
      
      if (order.items.length > 0) {
        const item = order.items[0];
        expect(item).toHaveProperty("menuItemName");
        expect(item).toHaveProperty("quantity");
        expect(item).toHaveProperty("priceAtOrder");
      }
    });
  });

  it("should format order data for mobile list rendering", async () => {
    const orders = await db.getTodayOrdersWithItems();
    
    const activeOrders = orders.filter((o: any) =>
      ["Pending", "Ready", "On the Way"].includes(o.status)
    );

    const formattedOrders = activeOrders.map((order: any) => ({
      id: order.id,
      status: order.status,
      customerName: order.customer?.name || "Unknown",
      totalPrice: `$${Number(order.totalPrice || 0).toFixed(2)}`,
      itemCount: order.items?.length || 0,
    }));

    formattedOrders.forEach((order: any) => {
      expect(order.id).toBeDefined();
      expect(order.status).toBeDefined();
      expect(order.customerName).toBeDefined();
      expect(order.totalPrice).toMatch(/^\$[\d.]+$/);
      expect(order.itemCount).toBeGreaterThanOrEqual(0);
    });

    if (formattedOrders.length > 0) {
      console.log("Sample formatted order for mobile:", formattedOrders[0]);
    }
  });
});
