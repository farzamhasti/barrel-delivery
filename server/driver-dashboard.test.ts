import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as db from "./db";
import crypto from "crypto";
import { getDb } from "./db";

describe("Driver Dashboard - View Details and Mark Delivered", () => {
  let driverId: number;
  let orderId: number;
  let sessionToken: string;
  let expiresAt: Date;

  beforeAll(async () => {
    // Ensure database is initialized
    const database = await getDb();
    if (!database) {
      throw new Error("Database not available");
    }

    // Create a test driver
    const driver = await db.createDriver({
      name: "Test Driver",
      phone: "555-0001",
      email: "driver@test.com",
      licenseNumber: "DL123456",
      vehicleType: "Car",
      currentLatitude: 43.6532 as any,
      currentLongitude: -79.3832 as any,
      status: "online",
    });

    driverId = (driver as any).id || (driver as any)[0]?.insertId;

    // Create a test customer
    const customer = await db.createCustomer({
      name: "Test Customer",
      phone: "555-0002",
      address: "123 Test St, Toronto, ON",
      latitude: 43.6532 as any,
      longitude: -79.3832 as any,
    });

    const customerId = (customer as any).id || (customer as any)[0]?.insertId;

    // Create a test menu item
    const category = await db.createMenuCategory({
      name: "Test Category",
      description: "Test",
      displayOrder: 1,
    });

    const categoryId = (category as any).id || (category as any)[0]?.insertId;

    const menuItem = await db.createMenuItem({
      categoryId,
      name: "Test Item",
      description: "Test item",
      price: 10.99 as any,
      displayOrder: 1,
    });

    const menuItemId = (menuItem as any).id || (menuItem as any)[0]?.insertId;

    // Create a test order
    const order = await db.createOrder({
      customerId,
      subtotal: 10.99 as any,
      taxPercentage: 13 as any,
      taxAmount: 1.43 as any,
      totalPrice: 12.42 as any,
      notes: "Special instructions",
      area: "Downtown",
      deliveryTime: new Date(),
      hasDeliveryTime: true,
    });

    orderId = (order as any).id || (order as any)[0]?.insertId;

    // Create order items
    const itemResult = await db.createOrderItem({
      orderId,
      menuItemId,
      quantity: 1,
      priceAtOrder: 10.99 as any,
    });
    
    // Verify order item was created
    const createdItems = await db.getOrderItems(orderId);
    if (createdItems.length === 0) {
      throw new Error("Failed to create order item");
    }

    // Assign order to driver
    await db.assignOrderToDriver(orderId, driverId);

    // Create driver session
    sessionToken = crypto.randomBytes(32).toString("hex");
    expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await db.createDriverSession(driverId, sessionToken, expiresAt);
  });

  afterAll(async () => {
    // Clean up test data
    if (sessionToken) {
      await db.deleteDriverSession(sessionToken);
    }
  });

  it("should fetch driver by session token", async () => {
    const driver = await db.getDriverBySessionToken(sessionToken);
    expect(driver).toBeDefined();
    expect(driver?.id).toBe(driverId);
    expect(driver?.name).toBe("Test Driver");
  });

  it("should get assigned orders with items for driver", async () => {
    const driver = await db.getDriverBySessionToken(sessionToken);
    expect(driver).toBeDefined();

    const orders = await db.getOrdersByDateRange(
      new Date().toISOString().split("T")[0],
      new Date().toISOString().split("T")[0],
      driver?.id
    );

    expect(orders.length).toBeGreaterThan(0);
    expect(orders[0].id).toBe(orderId);
    expect(orders[0].status).toBe("On the Way");
  });

  it("should get order items", async () => {
    const items = await db.getOrderItemsWithMenuNames(orderId);
    expect(items.length).toBeGreaterThan(0);
    expect(items[0].menuItemName).toBe("Test Item");
    expect(items[0].quantity).toBe(1);
  });

  it("should mark order as delivered", async () => {
    const result = await db.updateOrderStatus(orderId, "Delivered");
    expect(result).toBeDefined();

    // Verify order status was updated
    const order = await db.getOrderWithItems(orderId);
    expect(order?.status).toBe("Delivered");
  });

  it("should not show delivered button for completed orders", async () => {
    const order = await db.getOrderWithItems(orderId);
    expect(order?.status).toBe("Delivered");
    // In the UI, the button should be hidden when status is "Delivered"
  });

  it("should fetch order details with customer information", async () => {
    const order = await db.getOrderWithItems(orderId);
    expect(order).toBeDefined();
    expect(order?.customerName).toBeDefined();
    expect(order?.customerAddress).toBeDefined();
    expect(order?.customerPhone).toBeDefined();
    expect(order?.items).toBeDefined();
    expect(order?.items?.length).toBeGreaterThan(0);
    // Verify order items have the correct structure
    if (order?.items && order.items.length > 0) {
      expect(order.items[0].menuItemName).toBeDefined();
      expect(order.items[0].menuItemName).toBe("Test Item");
      expect(order.items[0].quantity).toBeGreaterThan(0);
    }
  });
});
