import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as db from "./db";

describe("Driver Deletion - Soft Delete Implementation", () => {
  let driverId: number;
  let customerId: number;
  let orderId: number;

  beforeAll(async () => {
    // Create a test driver
    const driver = await db.createDriver({
      name: "Test Driver for Deletion",
      phone: "555-0099",
      email: "delete-test@test.com",
      licenseNumber: "DL999999",
      vehicleType: "Van",
      currentLatitude: 43.6532 as any,
      currentLongitude: -79.3832 as any,
      status: "online",
    });

    driverId = (driver as any).id || (driver as any)[0]?.insertId;

    // Create a test customer
    const customer = await db.createCustomer({
      name: "Test Customer for Deletion",
      phone: "555-0098",
      address: "999 Delete St, Toronto, ON",
      latitude: 43.6532 as any,
      longitude: -79.3832 as any,
    });

    customerId = (customer as any).id || (customer as any)[0]?.insertId;

    // Create a test order assigned to the driver
    const order = await db.createOrder({
      customerId,
      subtotal: 50.00 as any,
      taxPercentage: 13 as any,
      taxAmount: 6.50 as any,
      totalPrice: 56.50 as any,
      notes: "Test order",
      area: "Downtown",
      deliveryTime: new Date(),
      hasDeliveryTime: true,
    });

    orderId = (order as any).id || (order as any)[0]?.insertId;

    // Assign order to driver
    await db.assignOrderToDriver(orderId, driverId);
  });

  it("should create a driver successfully", async () => {
    const drivers = await db.getDrivers();
    const testDriver = drivers.find((d: any) => d.id === driverId);
    expect(testDriver).toBeDefined();
    expect(testDriver?.name).toBe("Test Driver for Deletion");
    expect(testDriver?.isActive).toBe(true);
  });

  it("should assign order to driver", async () => {
    const order = await db.getOrderWithItems(orderId);
    expect(order).toBeDefined();
    expect(order?.driverId).toBe(driverId);
  });

  it("should delete driver (soft delete) without foreign key error", async () => {
    // This should not throw a foreign key constraint error
    const result = await db.deleteDriver(driverId);
    expect(result).toBeDefined();
  });

  it("should mark driver as inactive after deletion", async () => {
    // Get all drivers (including inactive ones from raw query)
    const allDriversDb = await db.getDb();
    if (!allDriversDb) throw new Error("Database not available");
    
    const { drivers } = await import("../drizzle/schema");
    const { eq } = await import("drizzle-orm");
    
    const deletedDriver = await allDriversDb
      .select()
      .from(drivers)
      .where(eq(drivers.id, driverId));
    
    expect(deletedDriver.length).toBe(1);
    expect(deletedDriver[0].isActive).toBe(false);
  });

  it("should not return deleted driver in getDrivers list", async () => {
    const activeDrivers = await db.getDrivers();
    const deletedDriver = activeDrivers.find((d: any) => d.id === driverId);
    expect(deletedDriver).toBeUndefined();
  });

  it("should preserve order reference to deleted driver", async () => {
    // Order should still reference the driver (for historical tracking)
    const order = await db.getOrderWithItems(orderId);
    expect(order).toBeDefined();
    expect(order?.driverId).toBe(driverId);
  });

  it("should not return deleted driver in getActiveDrivers", async () => {
    const activeDrivers = await db.getActiveDrivers();
    const deletedDriver = activeDrivers.find((d: any) => d.id === driverId);
    expect(deletedDriver).toBeUndefined();
  });

  it("should allow creating new driver with same name after deletion", async () => {
    const newDriver = await db.createDriver({
      name: "Test Driver for Deletion", // Same name as deleted driver
      phone: "555-0097",
      email: "new-delete-test@test.com",
      licenseNumber: "DL888888",
      vehicleType: "Car",
      currentLatitude: 43.6532 as any,
      currentLongitude: -79.3832 as any,
      status: "offline",
    });

    const newDriverId = (newDriver as any).id || (newDriver as any)[0]?.insertId;
    expect(newDriverId).toBeDefined();
    expect(newDriverId).not.toBe(driverId);

    // Clean up
    await db.deleteDriver(newDriverId);
  });
});
