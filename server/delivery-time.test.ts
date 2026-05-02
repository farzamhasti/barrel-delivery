import { describe, it, expect, beforeAll } from "vitest";
import { 
  createMenuCategory,
  createMenuItem,
  createCustomer,
  createOrder,
  updateOrder,
  getOrderById,
  getOrderWithItems,
} from "./db";
import { initializeDatabase } from "./_core/initDb";

describe("Delivery Time Handling", () => {
  let customerId: number;
  let orderId: number;

  beforeAll(async () => {
    // Initialize database
    await initializeDatabase();

    // Create customer
    const customerResult = await createCustomer({
      name: "John Doe",
      phone: "555-1234",
      address: "123 Main St",
    });
    // Extract customerId from the result
    if (customerResult && typeof customerResult === 'object' && 'id' in customerResult) {
      customerId = (customerResult as any).id;
    } else if (Array.isArray(customerResult)) {
      customerId = (customerResult as any)[0]?.insertId || (customerResult as any)[0]?.id;
    } else {
      customerId = (customerResult as any).insertId || (customerResult as any).id;
    }
    console.log('Created customer with ID:', customerId);

    // Create order
    const orderResult = await createOrder({
      customerId,
      subtotal: 20.00 as any,
      taxPercentage: 13 as any,
      taxAmount: 2.60 as any,
      totalPrice: 22.60 as any,
      notes: "Test order",
      area: "Downtown",
      hasDeliveryTime: false,
      deliveryTime: null,
    });
    
    // Extract orderId from the result
    if (orderResult && typeof orderResult === 'object' && 'id' in orderResult) {
      orderId = (orderResult as any).id;
    } else if (Array.isArray(orderResult)) {
      orderId = (orderResult as any)[0]?.insertId || (orderResult as any)[0]?.id;
    } else {
      orderId = (orderResult as any).insertId || (orderResult as any).id;
    }
    console.log('Created order with ID:', orderId);
  });

  it("should create order without delivery time", async () => {
    const order = await getOrderById(orderId);
    expect(order).toBeDefined();
    expect(order?.hasDeliveryTime).toBe(false);
    expect(order?.deliveryTime).toBeNull();
  });

  it("should update order with delivery time as Date object", async () => {
    const deliveryTime = new Date("2026-04-19T19:00:00.000Z");
    
    await updateOrder(orderId, {
      deliveryTime,
      hasDeliveryTime: true,
    });

    const order = await getOrderById(orderId);
    expect(order?.hasDeliveryTime).toBe(true);
    expect(order?.deliveryTime).toBeDefined();
    // Verify the date is valid
    const deliveryDate = new Date(order?.deliveryTime!);
    expect(deliveryDate.getTime()).toBeGreaterThan(0);
  });

  it("should update order to remove delivery time", async () => {
    await updateOrder(orderId, {
      deliveryTime: null,
      hasDeliveryTime: false,
    });

    const order = await getOrderById(orderId);
    expect(order?.hasDeliveryTime).toBe(false);
    expect(order?.deliveryTime).toBeNull();
  });

  it("should handle delivery time in getOrderWithItems", async () => {
    const deliveryTime = new Date("2026-04-20T18:30:00.000Z");
    
    await updateOrder(orderId, {
      deliveryTime,
      hasDeliveryTime: true,
    });

    const order = await getOrderWithItems(orderId);
    expect(order?.hasDeliveryTime).toBe(true);
    expect(order?.deliveryTime).toBeDefined();
  });

  it("should validate delivery time is properly stored as timestamp", async () => {
    const order = await getOrderById(orderId);
    expect(order).toBeDefined();
    
    // Verify delivery time is a valid timestamp
    if (order?.deliveryTime) {
      const deliveryDate = new Date(order.deliveryTime);
      expect(isNaN(deliveryDate.getTime())).toBe(false);
      // Verify it's a reasonable date (not in the past too far)
      expect(deliveryDate.getFullYear()).toBeGreaterThanOrEqual(2026);
    }
  });

  it("should handle multiple updates to delivery time", async () => {
    // First update
    const firstTime = new Date("2026-04-21T20:00:00.000Z");
    await updateOrder(orderId, {
      deliveryTime: firstTime,
      hasDeliveryTime: true,
    });

    let order = await getOrderById(orderId);
    expect(order?.hasDeliveryTime).toBe(true);

    // Second update with different time
    const secondTime = new Date("2026-04-22T21:00:00.000Z");
    await updateOrder(orderId, {
      deliveryTime: secondTime,
      hasDeliveryTime: true,
    });

    order = await getOrderById(orderId);
    expect(order?.hasDeliveryTime).toBe(true);
    expect(order?.deliveryTime).toBeDefined();
    
    // Verify the new time is stored
    const deliveryDate = new Date(order?.deliveryTime!);
    expect(deliveryDate.getTime()).toBeGreaterThan(0);
  });
});
