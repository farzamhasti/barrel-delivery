import { describe, it, expect, beforeAll } from "vitest";
import { createCustomer, createOrder, createOrderItem, getMenuItems } from "./db";
import { initializeDatabase } from "./_core/initDb";

describe("Order Creation Flow", () => {
  beforeAll(async () => {
    // Initialize database and ensure tables exist
    await initializeDatabase();
  });

  it("should create a customer and order successfully", async () => {
    // Step 1: Create a customer
    const customerData = {
      name: "Test Customer",
      phone: "+1 (555) 123-4567",
      address: "123 Test St, Test City, TC 12345",
    };

    const customerResult = await createCustomer(customerData);
    
    // Extract customerId from the array result [ResultSetHeader, undefined]
    const customerId = (customerResult as any)?.id || (Array.isArray(customerResult) 
      ? (customerResult as any)[0]?.insertId 
      : (customerResult as any).insertId);
    
    expect(customerId).toBeDefined();
    expect(typeof customerId).toBe("number");
    expect(customerId).toBeGreaterThan(0);

    // Step 2: Create an order with the customer
    const orderData = {
      customerId,
      totalPrice: 45.99 as any,
    };

    const orderResult = await createOrder(orderData);
    
    // Extract orderId from the array result
    const orderId = Array.isArray(orderResult) 
      ? (orderResult as any)[0]?.insertId 
      : (orderResult as any).insertId;
    
    expect(orderId).toBeDefined();
    expect(typeof orderId).toBe("number");
    expect(orderId).toBeGreaterThan(0);
  });

  it("should extract customerId correctly from customer creation result", async () => {
    const customerData = {
      name: "Another Customer",
      phone: "+1 (555) 987-6543",
      address: "456 Another St, Another City, AC 54321",
    };

    const customerResult = await createCustomer(customerData);
    
    // Simulate the frontend extraction logic
    const customerId = (customerResult as any)?.id || (Array.isArray(customerResult) 
      ? (customerResult as any)[0]?.insertId 
      : (customerResult as any).insertId);
    
    // Verify customerId is a valid number
    expect(customerId).toBeDefined();
    expect(typeof customerId).toBe("number");
    expect(customerId).toBeGreaterThan(0);
    
    // Verify it can be used to create an order
    const orderData = {
      customerId,
      totalPrice: 29.99 as any,
    };

    const orderResult = await createOrder(orderData);
    expect(orderResult).toBeDefined();
    
    // Verify orderId is extracted correctly
    const orderId = Array.isArray(orderResult) 
      ? (orderResult as any)[0]?.insertId 
      : (orderResult as any).insertId;
    
    expect(orderId).toBeDefined();
    expect(typeof orderId).toBe("number");
  });

  it("should handle order creation with optional notes", async () => {
    const customerData = {
      name: "Customer With Notes",
      address: "789 Notes St, Notes City, NC 98765",
    } as any;

    const customerResult = await createCustomer(customerData);
    
    const customerId = (customerResult as any)?.id || (Array.isArray(customerResult) 
      ? (customerResult as any)[0]?.insertId 
      : (customerResult as any).insertId);
    
    expect(customerId).toBeGreaterThan(0);

    const orderData = {
      customerId,
      totalPrice: 59.99 as any,
      notes: "Special delivery instructions",
    };

    const orderResult = await createOrder(orderData);
    expect(orderResult).toBeDefined();
  });
});
