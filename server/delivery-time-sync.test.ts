import { describe, it, expect, beforeAll } from "vitest";
import { 
  createCustomer,
  createOrder,
  getOrderWithItems,
  getTodayOrdersWithItems,
} from "./db";
import { initializeDatabase } from "./_core/initDb";

describe("Delivery Time Synchronization", () => {
  let testOrderId: number;
  let testCustomerId: number;

  beforeAll(async () => {
    // Initialize database
    await initializeDatabase();

    // Create test customer
    const customerResult = await createCustomer({
      name: "Sync Test Customer",
      phone: "555-9999",
      address: "999 Sync St",
    });
    
    // Extract customerId
    if (customerResult && typeof customerResult === 'object' && 'id' in customerResult) {
      testCustomerId = (customerResult as any).id;
    } else if (Array.isArray(customerResult)) {
      testCustomerId = (customerResult as any)[0]?.insertId || (customerResult as any)[0]?.id;
    } else {
      testCustomerId = (customerResult as any).insertId || (customerResult as any).id;
    }

    // Create test order with delivery time
    const deliveryTime = new Date("2026-04-19T21:00:00");
    const orderResult = await createOrder({
      customerId: testCustomerId,
      subtotal: 10.0 as any,
      taxPercentage: 10 as any,
      taxAmount: 1.0 as any,
      totalPrice: 11.0 as any,
      notes: "Sync test order",
      area: "DT",
      hasDeliveryTime: true,
      deliveryTime: deliveryTime,
    });

    // Extract orderId
    if (orderResult && typeof orderResult === 'object' && 'id' in orderResult) {
      testOrderId = (orderResult as any).id;
    } else if (Array.isArray(orderResult)) {
      testOrderId = (orderResult as any)[0]?.insertId || (orderResult as any)[0]?.id;
    } else {
      testOrderId = (orderResult as any).insertId || (orderResult as any).id;
    }
  });

  it("getTodayOrdersWithItems should include deliveryTime and hasDeliveryTime", async () => {
    const todayOrders = await getTodayOrdersWithItems();
    
    // Find our test order
    const testOrder = todayOrders.find((o) => o.id === testOrderId);
    
    expect(testOrder).toBeDefined();
    if (testOrder) {
      expect(testOrder.hasDeliveryTime).toBe(true);
      expect(testOrder.deliveryTime).toBeDefined();
      expect(testOrder.deliveryTime).toBeInstanceOf(Date);
    }
  });

  it("getOrderWithItems should include deliveryTime and hasDeliveryTime", async () => {
    const orderData = await getOrderWithItems(testOrderId);
    
    expect(orderData).toBeDefined();
    if (orderData) {
      expect(orderData.hasDeliveryTime).toBe(true);
      expect(orderData.deliveryTime).toBeDefined();
      expect(orderData.deliveryTime).toBeInstanceOf(Date);
    }
  });

  it("Delivery time should be properly formatted when displayed", async () => {
    const orderData = await getOrderWithItems(testOrderId);
    
    expect(orderData).toBeDefined();
    if (orderData?.deliveryTime) {
      const formatted = orderData.deliveryTime.toLocaleString();
      expect(formatted).toBeTruthy();
      expect(formatted.length).toBeGreaterThan(0);
    }
  });

  it("Order without delivery time should have hasDeliveryTime=false", async () => {
    // Create customer
    const customerResult = await createCustomer({
      name: "No Delivery Time Customer",
      phone: "555-8888",
      address: "888 No Delivery St",
    });
    
    let customerId: number;
    if (customerResult && typeof customerResult === 'object' && 'id' in customerResult) {
      customerId = (customerResult as any).id;
    } else if (Array.isArray(customerResult)) {
      customerId = (customerResult as any)[0]?.insertId || (customerResult as any)[0]?.id;
    } else {
      customerId = (customerResult as any).insertId || (customerResult as any).id;
    }

    // Create order without delivery time
    const orderResult = await createOrder({
      customerId,
      subtotal: 10.0 as any,
      taxPercentage: 10 as any,
      taxAmount: 1.0 as any,
      totalPrice: 11.0 as any,
      notes: "No delivery time order",
      area: "DT",
      hasDeliveryTime: false,
      deliveryTime: null,
    });

    let orderId: number;
    if (orderResult && typeof orderResult === 'object' && 'id' in orderResult) {
      orderId = (orderResult as any).id;
    } else if (Array.isArray(orderResult)) {
      orderId = (orderResult as any)[0]?.insertId || (orderResult as any)[0]?.id;
    } else {
      orderId = (orderResult as any).insertId || (orderResult as any).id;
    }

    const orderData = await getOrderWithItems(orderId);
    
    expect(orderData).toBeDefined();
    if (orderData) {
      expect(orderData.hasDeliveryTime).toBe(false);
      expect(orderData.deliveryTime).toBeNull();
    }
  });
});
