import { describe, it, expect, beforeAll } from "vitest";
import * as db from "./db";

describe("Driver Assigned Orders with Item Names", () => {
  let testDriver: any;
  let testOrder: any;

  beforeAll(async () => {
    // Ensure database is initialized
    const database = await db.getDb();
    if (!database) {
      throw new Error("Database not available");
    }

    // Get a test driver
    const drivers = await db.getDrivers();
    if (drivers.length > 0) {
      testDriver = drivers[0];
    }

    // Get a test order
    const orders = await db.getOrdersByDateRange(
      new Date().toISOString().split("T")[0],
      new Date().toISOString().split("T")[0],
      testDriver?.id
    );
    if (orders.length > 0) {
      testOrder = orders[0];
    }
  });

  it("should retrieve order items with menu item names", async () => {
    if (!testOrder) {
      console.log("No test order available, skipping test");
      return;
    }

    const items = await db.getOrderItemsWithMenuNames(testOrder.id);
    
    if (items.length > 0) {
      const item = items[0];
      expect(item).toBeDefined();
      expect(item.menuItemName).toBeDefined();
      expect(item.quantity).toBeDefined();
      expect(item.priceAtOrder).toBeDefined();
      
      console.log("Order item with menu name:", {
        menuItemName: item.menuItemName,
        quantity: item.quantity,
        priceAtOrder: item.priceAtOrder,
      });
    }
  });

  it("should return items with correct field structure", async () => {
    if (!testOrder) {
      console.log("No test order available, skipping test");
      return;
    }

    const items = await db.getOrderItemsWithMenuNames(testOrder.id);
    
    items.forEach((item: any) => {
      expect(item).toHaveProperty("menuItemName");
      expect(item).toHaveProperty("quantity");
      expect(item).toHaveProperty("priceAtOrder");
      expect(typeof item.menuItemName).toBe("string");
      expect(typeof item.quantity).toBe("number");
      // priceAtOrder can be string or number from database
      expect(["string", "number"]).toContain(typeof item.priceAtOrder);
    });
  });

  it("should not return items with null menuItemName", async () => {
    if (!testOrder) {
      console.log("No test order available, skipping test");
      return;
    }

    const items = await db.getOrderItemsWithMenuNames(testOrder.id);
    
    items.forEach((item: any) => {
      expect(item.menuItemName).not.toBeNull();
      expect(item.menuItemName).not.toBeUndefined();
      expect(item.menuItemName.length).toBeGreaterThan(0);
    });
  });

  it("should format order items for display correctly", async () => {
    if (!testOrder) {
      console.log("No test order available, skipping test");
      return;
    }

    const items = await db.getOrderItemsWithMenuNames(testOrder.id);
    
    const formattedItems = items.map((item: any) => ({
      name: item.menuItemName || "Unknown Item",
      quantity: item.quantity,
      price: `$${Number(item.priceAtOrder || 0).toFixed(2)}`,
    }));

    formattedItems.forEach((item: any) => {
      expect(item.name).toBeTruthy();
      expect(item.name).not.toBe("Unknown Item");
      expect(item.quantity).toBeGreaterThan(0);
      expect(item.price).toMatch(/^\$[\d.]+$/);
    });

    if (formattedItems.length > 0) {
      console.log("Formatted items for display:", formattedItems);
    }
  });

  it("should retrieve orders with items for a driver", async () => {
    if (!testDriver) {
      console.log("No test driver available, skipping test");
      return;
    }

    const orders = await db.getOrdersByDateRange(
      new Date().toISOString().split("T")[0],
      new Date().toISOString().split("T")[0],
      testDriver.id
    );

    // Fetch items for each order
    const ordersWithItems = await Promise.all(
      orders.map(async (order: any) => {
        const items = await db.getOrderItemsWithMenuNames(order.id);
        return { ...order, items };
      })
    );

    if (ordersWithItems.length > 0) {
      const order = ordersWithItems[0];
      expect(order.items).toBeDefined();
      expect(Array.isArray(order.items)).toBe(true);

      if (order.items.length > 0) {
        const item = order.items[0];
        expect(item.menuItemName).toBeDefined();
        console.log("Order with items:", {
          orderId: order.id,
          itemCount: order.items.length,
          firstItem: item.menuItemName,
        });
      }
    }
  });
});
