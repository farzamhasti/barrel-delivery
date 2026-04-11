import { describe, it, expect, beforeAll } from "vitest";
import * as db from "./db";

describe("Add Items to Existing Orders", () => {
  let customerId: number;
  let orderId: number;
  let menuItemId: number;

  beforeAll(async () => {
    // Create a test customer
    const customerResult = await db.createCustomer({
      name: "Add Item Test Customer",
      phone: "555-1111",
      address: "123 Add Item St",
    });
    customerId = (customerResult as any)[0]?.insertId;

    // Create a test order
    const orderResult = await db.createOrder({
      customerId,
      totalPrice: 25.00 as any,
      notes: "Test order for adding items",
    });
    orderId = (orderResult as any)[0]?.insertId;

    // Create a test menu item
    const categoryResult = await db.createMenuCategory({
      name: "Test Category",
      description: "Test",
    });
    const categoryId = (categoryResult as any)[0]?.insertId;

    const menuItemResult = await db.createMenuItem({
      categoryId,
      name: "Test Menu Item",
      description: "Test item",
      price: 15.00 as any,
    });
    menuItemId = (menuItemResult as any)[0]?.insertId;
  });

  it("should add a single item to an existing order", async () => {
    const result = await db.createOrderItem({
      orderId,
      menuItemId,
      quantity: 2,
      priceAtOrder: 15.00 as any,
    });
    expect(result).toBeDefined();
    expect((result as any)[0]?.insertId).toBeDefined();
  });

  it("should add multiple items to the same order", async () => {
    // Create another menu item
    const categoryResult = await db.createMenuCategory({
      name: "Test Category 2",
      description: "Test",
    });
    const categoryId = (categoryResult as any)[0]?.insertId;

    const menuItemResult = await db.createMenuItem({
      categoryId,
      name: "Test Menu Item 2",
      description: "Test item 2",
      price: 12.00 as any,
    });
    const menuItemId2 = (menuItemResult as any)[0]?.insertId;

    const result = await db.createOrderItem({
      orderId,
      menuItemId: menuItemId2,
      quantity: 1,
      priceAtOrder: 12.00 as any,
    });
    expect(result).toBeDefined();
    expect((result as any)[0]?.insertId).toBeDefined();
  });

  it("should retrieve order with all added items", async () => {
    const order = await db.getOrderWithItems(orderId);
    expect(order).toBeDefined();
    expect(order?.items.length).toBeGreaterThanOrEqual(2);
  });

  it("should add item with custom price different from menu price", async () => {
    const result = await db.createOrderItem({
      orderId,
      menuItemId,
      quantity: 1,
      priceAtOrder: 12.50 as any, // Different from menu price
    });
    expect(result).toBeDefined();
    expect((result as any)[0]?.insertId).toBeDefined();
  });

  it("should handle adding item with high quantity", async () => {
    const result = await db.createOrderItem({
      orderId,
      menuItemId,
      quantity: 100,
      priceAtOrder: 15.00 as any,
    });
    expect(result).toBeDefined();
    expect((result as any)[0]?.insertId).toBeDefined();
  });
});
