import { describe, expect, it, beforeAll, afterAll } from "vitest";
import * as db from "./db";
import { getDb } from "./db";

describe("Driver Assignment by Name", () => {
  let testDriverId: number;
  let testOrderId: number;
  const testDriverName = "Test Driver Assignment";
  const testLicenseNumber = "TEST-LICENSE-12345";

  beforeAll(async () => {
    // Create a test driver
    const driver = await db.createDriver({
      name: testDriverName,
      phone: "555-1234",
      licenseNumber: testLicenseNumber,
      status: "online",
      isActive: true,
    });
    
    if (!driver || !driver.id) {
      throw new Error("Failed to create test driver");
    }
    testDriverId = driver.id;

    // Create a test order
    const order = await db.createOrder({
      orderNumber: `TEST-${Date.now()}`,
      customerName: "Test Customer",
      customerPhone: "555-5678",
      customerAddress: "123 Test St",
      items: [],
      status: "Ready",
      totalPrice: 25.99,
    });
    
    if (!order || !order.id) {
      throw new Error("Failed to create test order");
    }
    testOrderId = order.id;
  });

  afterAll(async () => {
    // Clean up test data
    if (testDriverId) {
      await db.deleteDriver(testDriverId);
    }
    // Note: We don't delete the order as it may be referenced elsewhere
  });

  it("should look up driver by name", async () => {
    const driver = await db.getDriverByName(testDriverName);
    
    expect(driver).toBeDefined();
    expect(driver?.name).toBe(testDriverName);
    expect(driver?.id).toBe(testDriverId);
    expect(typeof driver?.id).toBe("number");
  });

  it("should return null for non-existent driver", async () => {
    const driver = await db.getDriverByName("Non-Existent Driver");
    expect(driver).toBeNull();
  });

  it("should assign order to driver by name", async () => {
    const result = await db.assignOrderToDriverByName(testOrderId, testDriverName);
    
    expect(result).toBeDefined();
    
    // Verify the order was updated
    const updatedOrder = await db.getOrder(testOrderId);
    expect(updatedOrder).toBeDefined();
    expect(updatedOrder?.driverId).toBe(testDriverId);
    expect(updatedOrder?.status).toBe("On the Way");
  });

  it("should throw error for non-existent driver during assignment", async () => {
    const newOrder = await db.createOrder({
      orderNumber: `TEST-ERROR-${Date.now()}`,
      customerName: "Test Customer",
      customerPhone: "555-5678",
      customerAddress: "123 Test St",
      items: [],
      status: "Ready",
      totalPrice: 25.99,
    });

    if (!newOrder || !newOrder.id) {
      throw new Error("Failed to create test order");
    }

    try {
      await db.assignOrderToDriverByName(newOrder.id, "Non-Existent Driver");
      expect.fail("Should have thrown an error");
    } catch (error) {
      expect(error).toBeDefined();
      expect(String(error)).toContain("not found");
    }
  });

  it("should throw error for empty driver name", async () => {
    try {
      await db.assignOrderToDriverByName(testOrderId, "");
      expect.fail("Should have thrown an error");
    } catch (error) {
      expect(error).toBeDefined();
      expect(String(error)).toContain("Driver name is required");
    }
  });

  it("should normalize driver ID as a plain number", async () => {
    const driver = await db.getDriverByName(testDriverName);
    
    expect(driver?.id).toBeDefined();
    expect(typeof driver?.id).toBe("number");
    expect(Number.isInteger(driver?.id)).toBe(true);
    
    // Ensure it's not a Decimal or other type
    const id = driver?.id;
    expect(id).toEqual(expect.any(Number));
  });
});
