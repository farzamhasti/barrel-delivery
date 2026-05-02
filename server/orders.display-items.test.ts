import { describe, it, expect, beforeAll } from "vitest";
import * as db from "./db";

describe("Order Items Display", () => {
  let customerId: number;
  let orderId: number;
  let menuItemId: number;

  beforeAll(async () => {
    // Create a customer
    const customerResult = await db.createCustomer({
      name: "Test Customer",
      address: "123 Test St",
      phone: "555-1234",
    });
    customerId = (customerResult as any)[0]?.insertId || 1;

    // Create an order
    const orderResult = await db.createOrder({
      customerId,
      totalPrice: 50.0,
      status: "Pending",
    });
    orderId = (orderResult as any)[0]?.insertId || 1;

    // Create a menu item
    const menuResult = await db.createMenuItem({
      name: "Test Item",
      description: "Test Description",
      price: 25.0,
      categoryId: 1,
      isAvailable: true,
    });
    menuItemId = (menuResult as any)[0]?.insertId || 1;

    // Create order items
    await db.createOrderItem({
      orderId,
      menuItemId,
      quantity: 2,
      priceAtOrder: 25.0,
    });
  });

  it("should fetch order with items", async () => {
    const orderWithItems = await db.getOrderWithItems(orderId);
    expect(orderWithItems).toBeDefined();
    expect(orderWithItems?.id).toBe(orderId);
    expect(orderWithItems?.items).toBeDefined();
    expect(Array.isArray(orderWithItems?.items)).toBe(true);
  });

  it("should display order items correctly", async () => {
    const orderWithItems = await db.getOrderWithItems(orderId);
    expect(orderWithItems?.items?.length).toBeGreaterThan(0);
    
    const firstItem = orderWithItems?.items?.[0];
    expect(firstItem?.menuItemId).toBe(menuItemId);
    expect(firstItem?.quantity).toBe(2);
    expect(parseFloat(firstItem?.priceAtOrder)).toBe(25.0);
  });

  it("should calculate order total from items", async () => {
    const orderWithItems = await db.getOrderWithItems(orderId);
    const items = orderWithItems?.items || [];
    
    const total = items.reduce((sum: number, item: any) => {
      return sum + (parseFloat(item.priceAtOrder) * item.quantity);
    }, 0);
    
    expect(total).toBe(50.0);
  });

  it("should handle orders with multiple items", async () => {
    // Create another order item
    await db.createOrderItem({
      orderId,
      menuItemId,
      quantity: 1,
      priceAtOrder: 15.0,
    });

    const orderWithItems = await db.getOrderWithItems(orderId);
    expect(orderWithItems?.items?.length).toBeGreaterThanOrEqual(2);
  });

  it("should return empty items array for order with no items", async () => {
    // Create an order without items
    const emptyOrderResult = await db.createOrder({
      customerId,
      totalPrice: 0,
      status: "Pending",
    });
    const emptyOrderId = (emptyOrderResult as any)[0]?.insertId || 1;

    const orderWithItems = await db.getOrderWithItems(emptyOrderId);
    expect(orderWithItems?.items).toBeDefined();
    expect(Array.isArray(orderWithItems?.items)).toBe(true);
    expect(orderWithItems?.items?.length).toBe(0);
  });
});
