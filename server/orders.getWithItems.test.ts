import { describe, it, expect, beforeAll } from "vitest";
import { getDb } from "./db";
import { getOrderWithItems, createOrder, createOrderItem, createCustomer, createMenuCategory, createMenuItem } from "./db";

describe("getOrderWithItems", () => {
  beforeAll(async () => {
    const db = await getDb();
    if (db) {
      // Clear existing data
      await db.execute("DELETE FROM order_items");
      await db.execute("DELETE FROM orders");
      await db.execute("DELETE FROM customers");
      await db.execute("DELETE FROM menu_items");
      await db.execute("DELETE FROM menu_categories");
    }
  });

  it("should return order with items including menu item names", async () => {
    // Create category
    const categoryResult = await createMenuCategory({
      name: "Test Category",
      description: "Test",
      isActive: true,
    });
    const categoryId = (categoryResult as any)[0]?.insertId || 1;

    // Create menu item
    const itemResult = await createMenuItem({
      categoryId,
      name: "Test Item",
      description: "Test item",
      price: 10.99,
      is_available: true,
    });
    const menuItemId = (itemResult as any)[0]?.insertId || 1;

    // Create customer
    const customerResult = await createCustomer({
      name: "Test Customer",
      address: "123 Test St",
      phone: "1234567890",
    });
    const customerId = (customerResult as any)?.id || (customerResult as any)[0]?.insertId || 1;

    // Create order
    const orderResult = await createOrder({
      customerId,
      totalPrice: 10.99,
      status: "Pending",
    });
    const orderId = (orderResult as any)[0]?.insertId || 1;

    // Create order item
    await createOrderItem({
      orderId,
      menuItemId,
      quantity: 1,
      priceAtOrder: 10.99,
    });

    // Get order with items
    const orderWithItems = await getOrderWithItems(orderId);

    expect(orderWithItems).toBeDefined();
    expect(orderWithItems?.items).toBeDefined();
    expect(Array.isArray(orderWithItems?.items)).toBe(true);
    expect(orderWithItems?.items?.length).toBeGreaterThan(0);

    const item = orderWithItems?.items?.[0];
    expect(item).toBeDefined();
    expect(item?.menuItemName).toBe("Test Item");
    expect(item?.quantity).toBe(1);
    expect(parseFloat(item?.priceAtOrder)).toBe(10.99);
  });

  it("should return order with items even if menu item is soft-deleted", async () => {
    // Create category
    const categoryResult = await createMenuCategory({
      name: "Test Category 2",
      description: "Test",
      isActive: true,
    });
    const categoryId = (categoryResult as any)[0]?.insertId || 1;

    // Create menu item
    const itemResult = await createMenuItem({
      categoryId,
      name: "Deleted Item",
      description: "Test item",
      price: 15.99,
      is_available: true,
    });
    const menuItemId = (itemResult as any)[0]?.insertId || 1;

    // Create customer
    const customerResult = await createCustomer({
      name: "Test Customer 2",
      address: "456 Test St",
      phone: "0987654321",
    });
    const customerId = (customerResult as any)?.id || (customerResult as any)[0]?.insertId || 1;

    // Create order
    const orderResult = await createOrder({
      customerId,
      totalPrice: 15.99,
      status: "Pending",
    });
    const orderId = (orderResult as any)[0]?.insertId || 1;

    // Create order item
    await createOrderItem({
      orderId,
      menuItemId,
      quantity: 2,
      priceAtOrder: 15.99,
    });

    // Soft delete the menu item
    const db = await getDb();
    if (db) {
      await db.execute(`UPDATE menu_items SET is_available = false WHERE id = ${menuItemId}`);
    }

    // Get order with items - should still return the item with name
    const orderWithItems = await getOrderWithItems(orderId);

    expect(orderWithItems?.items?.length).toBeGreaterThan(0);
    const item = orderWithItems?.items?.[0];
    expect(item?.menuItemName).toBe("Deleted Item"); // Name should still be there
    expect(item?.quantity).toBe(2);
  });

  it("should return empty items array for order with no items", async () => {
    // Create customer
    const customerResult = await createCustomer({
      name: "Test Customer 3",
      address: "789 Test St",
      phone: "5555555555",
    });
    const customerId = (customerResult as any)?.id || (customerResult as any)[0]?.insertId || 1;

    // Create order without items
    const orderResult = await createOrder({
      customerId,
      totalPrice: 0,
      status: "Pending",
    });
    const orderId = (orderResult as any)[0]?.insertId || 1;

    // Get order with items
    const orderWithItems = await getOrderWithItems(orderId);

    expect(orderWithItems?.items).toBeDefined();
    expect(Array.isArray(orderWithItems?.items)).toBe(true);
    expect(orderWithItems?.items?.length).toBe(0);
  });
});
