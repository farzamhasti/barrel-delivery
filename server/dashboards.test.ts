import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getDb } from "./db";
import * as db from "./db";
import { orders, customers, menuItems, menuCategories, orderItems } from "../drizzle/schema";

describe("Dashboard Features - Order Tracking, Kitchen, and Driver", () => {
  let connection: any;

  beforeAll(async () => {
    connection = await getDb();
    if (!connection) throw new Error("Database connection failed");

    // Clear test data
    await connection.delete(orderItems);
    await connection.delete(orders);
    await connection.delete(customers);
    await connection.delete(menuItems);
    await connection.delete(menuCategories);
  });

  afterAll(async () => {
    // Cleanup
    await connection.delete(orderItems);
    await connection.delete(orders);
    await connection.delete(customers);
    await connection.delete(menuItems);
    await connection.delete(menuCategories);
  });

  it("should create orders with new statuses (Pending, Ready, On the Way, Delivered)", async () => {
    // Create test data
    const categoryResult = await connection.insert(menuCategories).values({
      name: "Pizza",
      description: "Delicious pizzas",
      isActive: true,
    });

    const menuItemResult = await connection.insert(menuItems).values({
      categoryId: 1,
      name: "Margherita Pizza",
      description: "Classic pizza",
      price: "12.99",
      isAvailable: true,
    });

    const customerResult = await connection.insert(customers).values({
      name: "John Doe",
      phone: "555-1234",
      address: "123 Main St, Fort Erie, ON",
      latitude: "42.8711",
      longitude: "-79.2477",
    });

    // Create order with Pending status
    const orderResult = await connection.insert(orders).values({
      customerId: 1,
      status: "Pending",
      totalPrice: "12.99",
      notes: "No onions",
    });

    const createdOrder = await db.getOrderById(1);
    expect(createdOrder).toBeDefined();
    expect(createdOrder?.status).toBe("Pending");
  });

  it("should support Ready status transition", async () => {
    // Update order to Ready status
    await db.updateOrderStatus(1, "Ready");

    const updatedOrder = await db.getOrderById(1);
    expect(updatedOrder?.status).toBe("Ready");
  });

  it("should support On the Way status transition", async () => {
    // Update order to On the Way status
    await db.updateOrderStatus(1, "On the Way");

    const updatedOrder = await db.getOrderById(1);
    expect(updatedOrder?.status).toBe("On the Way");
  });

  it("should support Delivered status transition", async () => {
    // Update order to Delivered status
    await db.updateOrderStatus(1, "Delivered");

    const updatedOrder = await db.getOrderById(1);
    expect(updatedOrder?.status).toBe("Delivered");
  });

  it("should support Returning to Restaurant status", async () => {
    // Create a new order for this test
    await connection.insert(orders).values({
      customerId: 1,
      status: "On the Way",
      totalPrice: "12.99",
      notes: "Test order",
    });

    // Update to Returning to Restaurant
    await db.updateOrderStatus(2, "Returning to Restaurant");

    const updatedOrder = await db.getOrderById(2);
    expect(updatedOrder?.status).toBe("Returning to Restaurant");
  });

  it("should support At Restaurant status", async () => {
    // Create a new order for this test
    await connection.insert(orders).values({
      customerId: 1,
      status: "Delivered",
      totalPrice: "12.99",
      notes: "Test order",
    });

    // Update to At Restaurant
    await db.updateOrderStatus(3, "At Restaurant");

    const updatedOrder = await db.getOrderById(3);
    expect(updatedOrder?.status).toBe("At Restaurant");
  });

  it("should retrieve orders with items for Kitchen Dashboard", async () => {
    // Create order with items
    await connection.insert(orders).values({
      customerId: 1,
      status: "Pending",
      totalPrice: "25.98",
      notes: "Kitchen test",
    });

    await connection.insert(orderItems).values({
      orderId: 4,
      menuItemId: 1,
      quantity: 2,
      priceAtOrder: "12.99",
    });

    const order = await db.getOrderById(4);
    expect(order).toBeDefined();
    expect(order?.items).toBeDefined();
    expect(order?.items?.length).toBe(1);
    expect(order?.items?.[0]?.quantity).toBe(2);
  });

  it("should retrieve all active orders for Order Tracking", async () => {
    // Create multiple orders with different statuses
    await connection.insert(orders).values([
      {
        customerId: 1,
        status: "Pending",
        totalPrice: "12.99",
        notes: "Tracking test 1",
      },
      {
        customerId: 1,
        status: "Ready",
        totalPrice: "15.99",
        notes: "Tracking test 2",
      },
      {
        customerId: 1,
        status: "On the Way",
        totalPrice: "18.99",
        notes: "Tracking test 3",
      },
    ]);

    const allOrders = await db.getOrders();
    expect(allOrders.length).toBeGreaterThan(0);

    // Filter active orders (not Delivered)
    const activeOrders = allOrders.filter(
      (o: any) => o.status !== "Delivered"
    );
    expect(activeOrders.length).toBeGreaterThan(0);
  });

  it("should display customer information for all dashboards", async () => {
    const order = await db.getOrderById(1);
    expect(order?.customerId).toBeDefined();

    // Verify customer data is accessible
    expect(order?.id).toBeDefined();
    expect(order?.totalPrice).toBeDefined();
    expect(order?.notes).toBeDefined();
  });

  it("should handle order assignment to drivers", async () => {
    // Create a new order
    await connection.insert(orders).values({
      customerId: 1,
      driverId: 1,
      status: "Ready",
      totalPrice: "12.99",
      notes: "Driver assignment test",
    });

    const order = await db.getOrderById(8);
    expect(order?.driverId).toBe(1);
  });

  it("should support real-time order status updates", async () => {
    const orderId = 1;

    // Simulate status progression
    const statuses = ["Pending", "Ready", "On the Way", "Delivered"];

    for (const status of statuses) {
      await db.updateOrderStatus(orderId, status);
      const order = await db.getOrderById(orderId);
      expect(order?.status).toBe(status);
    }
  });

  it("should retrieve orders with customer details", async () => {
    const order = await db.getOrderById(1);
    expect(order).toBeDefined();
    expect(order?.id).toBe(1);
    expect(order?.customerId).toBe(1);
    expect(order?.status).toBe("Delivered");
  });
});
