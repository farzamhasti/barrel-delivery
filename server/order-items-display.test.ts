import { describe, it, expect, beforeAll } from "vitest";
import * as db from "./db";

describe("Order Items Display in Driver Dashboard", () => {
  beforeAll(async () => {
    // Ensure database is initialized
    const database = await db.getDb();
    if (!database) {
      throw new Error("Database not available");
    }
  });

  it("should retrieve order with items including menuItemName", async () => {
    // Get a sample order with items
    const orders = await db.getTodayOrdersWithItems();
    
    if (orders.length > 0) {
      const order = orders[0];
      expect(order).toBeDefined();
      expect(order.id).toBeDefined();
      expect(order.items).toBeDefined();
      expect(Array.isArray(order.items)).toBe(true);
      
      if (order.items.length > 0) {
        const item = order.items[0];
        expect(item.menuItemName).toBeDefined();
        expect(item.quantity).toBeDefined();
        expect(item.priceAtOrder).toBeDefined();
        console.log("Sample order item:", {
          menuItemName: item.menuItemName,
          quantity: item.quantity,
          priceAtOrder: item.priceAtOrder,
        });
      }
    }
  });

  it("should format order item price correctly", () => {
    const price = 22.60;
    const formatted = Number(price).toFixed(2);
    expect(formatted).toBe("22.60");
    expect(parseFloat(formatted)).toBe(22.60);
  });

  it("should handle missing item fields gracefully", () => {
    const item = {
      quantity: 1,
      priceAtOrder: 22.60,
      // menuItemName is missing
    };
    
    const displayName = item.menuItemName || "Unknown Item";
    const displayPrice = Number(item.priceAtOrder || 0).toFixed(2);
    
    expect(displayName).toBe("Unknown Item");
    expect(displayPrice).toBe("22.60");
  });

  it("should handle NaN price values", () => {
    const item = {
      menuItemName: "Test Item",
      quantity: 1,
      price: undefined, // This would cause NaN
    };
    
    const displayPrice = Number(item.price || 0).toFixed(2);
    expect(displayPrice).toBe("0.00");
    expect(displayPrice).not.toBe("NaN");
  });

  it("should retrieve order items with correct field names", async () => {
    const orders = await db.getTodayOrdersWithItems();
    
    if (orders.length > 0) {
      const order = orders[0];
      
      if (order.items && order.items.length > 0) {
        order.items.forEach((item: any) => {
          // Verify required fields exist
          expect(item).toHaveProperty("quantity");
          expect(item).toHaveProperty("priceAtOrder");
          
          // At least one of these should exist
          const hasItemName = item.menuItemName || item.itemName;
          expect(hasItemName).toBeDefined();
          
          // Verify types
          expect(typeof item.quantity).toBe("number");
          expect(typeof item.priceAtOrder).toBe("number");
        });
      }
    }
  });

  it("should display order items in correct format", async () => {
    const orders = await db.getTodayOrdersWithItems();
    
    if (orders.length > 0) {
      const order = orders[0];
      
      if (order.items && order.items.length > 0) {
        const item = order.items[0];
        
        // Simulate the display format
        const displayItem = {
          name: item.menuItemName || item.itemName || "Unknown Item",
          quantity: item.quantity,
          price: `$${Number(item.priceAtOrder || item.price || 0).toFixed(2)}`,
        };
        
        expect(displayItem.name).toBeTruthy();
        expect(displayItem.quantity).toBeGreaterThan(0);
        expect(displayItem.price).toMatch(/^\$[\d.]+$/);
        
        console.log("Formatted item for display:", displayItem);
      }
    }
  });
});
