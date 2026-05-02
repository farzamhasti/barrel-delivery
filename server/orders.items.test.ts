import { describe, it, expect, beforeAll } from "vitest";
import { createCustomer, createOrder, createOrderItem, createMenuCategory, createMenuItem, getMenuItems } from "./db";
import { initializeDatabase } from "./_core/initDb";

describe("Order Items Creation", () => {
  let menuItemId: number;

  beforeAll(async () => {
    // Initialize database and ensure tables exist
    await initializeDatabase();

    // Create a menu category and item for testing
    const categoryResult = await createMenuCategory({
      name: "Test Category",
      description: "Test category for order items",
    });
    
    const categoryId = Array.isArray(categoryResult) 
      ? (categoryResult as any)[0]?.insertId 
      : (categoryResult as any).insertId;

    const itemResult = await createMenuItem({
      categoryId,
      name: "Test Menu Item",
      description: "Test item for order",
      price: 24.99 as any,
    });

    menuItemId = Array.isArray(itemResult) 
      ? (itemResult as any)[0]?.insertId 
      : (itemResult as any).insertId;
  });

  it("should create order items with valid orderId and menuItemId", async () => {
    // Create a customer
    const customerResult = await createCustomer({
      name: "Test Customer",
      phone: "+1 (555) 123-4567",
      address: "123 Test St, Test City, TC 12345",
    });

    const customerId = (customerResult as any)?.id || (Array.isArray(customerResult) 
      ? (customerResult as any)[0]?.insertId 
      : (customerResult as any).insertId);

    // Create an order
    const orderResult = await createOrder({
      customerId,
      totalPrice: 24.99 as any,
    });

    const orderId = Array.isArray(orderResult) 
      ? (orderResult as any)[0]?.insertId 
      : (orderResult as any).insertId;

    expect(orderId).toBeGreaterThan(0);

    // Create order item
    const itemResult = await createOrderItem({
      orderId,
      menuItemId,
      quantity: 1,
      priceAtOrder: 24.99 as any,
    });

    expect(itemResult).toBeDefined();
    expect(Array.isArray(itemResult) || itemResult).toBeTruthy();
  });

  it("should create multiple order items for a single order", async () => {
    // Create a customer
    const customerResult = await createCustomer({
      name: "Multi Item Customer",
      phone: "+1 (555) 987-6543",
      address: "456 Multi St, Multi City, MC 54321",
    });

    const customerId = (customerResult as any)?.id || (Array.isArray(customerResult) 
      ? (customerResult as any)[0]?.insertId 
      : (customerResult as any).insertId);

    // Create an order
    const orderResult = await createOrder({
      customerId,
      totalPrice: 49.98 as any,
    });

    const orderId = Array.isArray(orderResult) 
      ? (orderResult as any)[0]?.insertId 
      : (orderResult as any).insertId;

    // Create multiple order items
    const item1Result = await createOrderItem({
      orderId,
      menuItemId,
      quantity: 1,
      priceAtOrder: 24.99 as any,
    });

    const item2Result = await createOrderItem({
      orderId,
      menuItemId,
      quantity: 1,
      priceAtOrder: 24.99 as any,
    });

    expect(item1Result).toBeDefined();
    expect(item2Result).toBeDefined();
  });

  it("should extract orderId correctly from order creation result", async () => {
    const customerResult = await createCustomer({
      name: "Extract Test Customer",
      address: "789 Extract St, Extract City, EC 98765",
    } as any);

    const customerId = (customerResult as any)?.id || (Array.isArray(customerResult) 
      ? (customerResult as any)[0]?.insertId 
      : (customerResult as any).insertId);

    const orderResult = await createOrder({
      customerId,
      totalPrice: 24.99 as any,
    });

    // Simulate the backend extraction logic
    const orderId = Array.isArray(orderResult) 
      ? (orderResult as any)[0]?.insertId 
      : (orderResult as any).insertId;

    // Verify orderId is a valid number
    expect(orderId).toBeDefined();
    expect(typeof orderId).toBe("number");
    expect(orderId).toBeGreaterThan(0);

    // Verify it can be used to create order items
    const itemResult = await createOrderItem({
      orderId,
      menuItemId,
      quantity: 2,
      priceAtOrder: 24.99 as any,
    });

    expect(itemResult).toBeDefined();
  });
});
