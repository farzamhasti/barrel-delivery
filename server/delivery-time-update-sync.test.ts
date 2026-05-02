import { describe, it, expect, beforeAll } from "vitest";
import { 
  createCustomer,
  createOrder,
  getOrderWithItems,
  updateOrder,
  getTodayOrdersWithItems,
} from "./db";
import { initializeDatabase } from "./_core/initDb";

describe("Delivery Time Update Synchronization", () => {
  let customerId: number;
  let orderId: number;

  beforeAll(async () => {
    // Initialize database
    await initializeDatabase();

    // Create test customer
    const customerResult = await createCustomer({
      name: "Test Customer",
      phone: "555-0000",
      address: "123 Test St",
    });
    customerId = (customerResult as any)[0]?.insertId || (customerResult as any)[0]?.id || (customerResult as any).id;

    // Create test order WITHOUT delivery time
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
    orderId = (orderResult as any)[0]?.insertId || (orderResult as any)[0]?.id || (orderResult as any).id;
  });

  it("should add delivery time to existing order without one", async () => {
    // Verify order has no delivery time initially
    let orderData = await getOrderWithItems(orderId);
    expect(orderData?.hasDeliveryTime).toBe(false);
    expect(orderData?.deliveryTime).toBeNull();

    // Add delivery time to the order
    const newDeliveryTime = new Date("2026-04-20T18:00:00");
    await updateOrder(orderId, {
      deliveryTime: newDeliveryTime,
      hasDeliveryTime: true,
    });

    // Verify delivery time was added
    orderData = await getOrderWithItems(orderId);
    expect(orderData?.hasDeliveryTime).toBe(true);
    expect(orderData?.deliveryTime).toEqual(newDeliveryTime);
  });

  it("should update existing delivery time", async () => {
    // First, add a delivery time
    const initialDeliveryTime = new Date("2026-04-20T18:00:00");
    await updateOrder(orderId, {
      deliveryTime: initialDeliveryTime,
      hasDeliveryTime: true,
    });

    // Verify it was added
    let orderData = await getOrderWithItems(orderId);
    expect(orderData?.hasDeliveryTime).toBe(true);
    expect(orderData?.deliveryTime).toEqual(initialDeliveryTime);

    // Now update to a different delivery time
    const updatedDeliveryTime = new Date("2026-04-20T20:00:00");
    await updateOrder(orderId, {
      deliveryTime: updatedDeliveryTime,
      hasDeliveryTime: true,
    });

    // Verify delivery time was updated
    orderData = await getOrderWithItems(orderId);
    expect(orderData?.hasDeliveryTime).toBe(true);
    expect(orderData?.deliveryTime).toEqual(updatedDeliveryTime);
  });

  it("should remove delivery time from order", async () => {
    // First, add a delivery time
    const deliveryTime = new Date("2026-04-20T18:00:00");
    await updateOrder(orderId, {
      deliveryTime,
      hasDeliveryTime: true,
    });

    // Verify it was added
    let orderData = await getOrderWithItems(orderId);
    expect(orderData?.hasDeliveryTime).toBe(true);
    expect(orderData?.deliveryTime).toEqual(deliveryTime);

    // Now remove the delivery time
    await updateOrder(orderId, {
      deliveryTime: null,
      hasDeliveryTime: false,
    });

    // Verify delivery time was removed
    orderData = await getOrderWithItems(orderId);
    expect(orderData?.hasDeliveryTime).toBe(false);
    expect(orderData?.deliveryTime).toBeNull();
  });

  it("should include delivery time in getTodayOrdersWithItems", async () => {
    // Add delivery time to order
    const deliveryTime = new Date();
    deliveryTime.setHours(18, 0, 0, 0);
    await updateOrder(orderId, {
      deliveryTime,
      hasDeliveryTime: true,
    });

    // Get today's orders
    const todayOrders = await getTodayOrdersWithItems();

    // Find our test order
    const testOrder = todayOrders.find((o: any) => o.id === orderId);

    // Verify delivery time is included
    expect(testOrder).toBeDefined();
    expect(testOrder?.hasDeliveryTime).toBe(true);
    expect(testOrder?.deliveryTime).toEqual(deliveryTime);
  });

  it("should properly sync hasDeliveryTime flag when updating deliveryTime", async () => {
    // Update with deliveryTime but without explicit hasDeliveryTime
    // The server should automatically set hasDeliveryTime=true
    const deliveryTime = new Date("2026-04-21T15:30:00");
    await updateOrder(orderId, {
      deliveryTime,
      // Note: not setting hasDeliveryTime explicitly
    });

    // Verify hasDeliveryTime is correctly set
    const orderData = await getOrderWithItems(orderId);
    expect(orderData?.hasDeliveryTime).toBe(true);
    expect(orderData?.deliveryTime).toEqual(deliveryTime);
  });
});
