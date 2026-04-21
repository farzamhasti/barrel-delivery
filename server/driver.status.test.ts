import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as db from "./db";

describe("Driver Status Management", () => {
  let testDriverId: number;

  beforeAll(async () => {
    // Create a test driver
    const result = await db.createDriver({
      name: "Test Driver Status",
      phone: "5551234567",
      licenseNumber: "DL123456",
      vehicleType: "Motorcycle",
      isActive: true,
      status: "offline",
    });
    
    // Extract driver ID from result
    if (Array.isArray(result) && result.length > 0) {
      testDriverId = (result[0] as any).id;
    } else if ((result as any).id) {
      testDriverId = (result as any).id;
    }
  });

  afterAll(async () => {
    // Clean up test driver
    if (testDriverId) {
      await db.deleteDriver(testDriverId);
    }
  });

  it("should update driver status to online", async () => {
    if (!testDriverId) {
      throw new Error("Test driver not created");
    }

    await db.updateDriverStatus(testDriverId, "online");
    
    // Verify status was updated
    const drivers = await db.getDrivers();
    const updatedDriver = drivers.find((d: any) => d.id === testDriverId);
    
    expect(updatedDriver).toBeDefined();
    expect(updatedDriver?.status).toBe("online");
  });

  it("should update driver status to offline", async () => {
    if (!testDriverId) {
      throw new Error("Test driver not created");
    }

    await db.updateDriverStatus(testDriverId, "offline");
    
    // Verify status was updated
    const drivers = await db.getDrivers();
    const updatedDriver = drivers.find((d: any) => d.id === testDriverId);
    
    expect(updatedDriver).toBeDefined();
    expect(updatedDriver?.status).toBe("offline");
  });

  it("should retrieve only online drivers", async () => {
    if (!testDriverId) {
      throw new Error("Test driver not created");
    }

    // Set driver to online
    await db.updateDriverStatus(testDriverId, "online");
    
    // Get active drivers
    const activeDrivers = await db.getActiveDrivers();
    
    // Verify the test driver is in the active drivers list
    const testDriver = activeDrivers.find((d: any) => d.id === testDriverId);
    expect(testDriver).toBeDefined();
    expect(testDriver?.status).toBe("online");
  });

  it("should not include offline drivers in active drivers list", async () => {
    if (!testDriverId) {
      throw new Error("Test driver not created");
    }

    // Set driver to offline
    await db.updateDriverStatus(testDriverId, "offline");
    
    // Get active drivers
    const activeDrivers = await db.getActiveDrivers();
    
    // Verify the test driver is NOT in the active drivers list
    const testDriver = activeDrivers.find((d: any) => d.id === testDriverId);
    expect(testDriver).toBeUndefined();
  });

  it("should count active drivers correctly", async () => {
    if (!testDriverId) {
      throw new Error("Test driver not created");
    }

    // Set driver to online
    await db.updateDriverStatus(testDriverId, "online");
    
    // Get active drivers
    const activeDrivers = await db.getActiveDrivers();
    
    // Verify count is at least 1 (our test driver)
    expect(activeDrivers.length).toBeGreaterThanOrEqual(1);
    
    // Set driver to offline
    await db.updateDriverStatus(testDriverId, "offline");
    
    // Get active drivers again
    const offlineActiveDrivers = await db.getActiveDrivers();
    
    // Verify count decreased by 1
    expect(offlineActiveDrivers.length).toBeLessThan(activeDrivers.length);
  });

  it("should persist status changes to database", async () => {
    if (!testDriverId) {
      throw new Error("Test driver not created");
    }

    // Update to online
    await db.updateDriverStatus(testDriverId, "online");
    let drivers = await db.getDrivers();
    let driver = drivers.find((d: any) => d.id === testDriverId);
    expect(driver?.status).toBe("online");

    // Update to offline
    await db.updateDriverStatus(testDriverId, "offline");
    drivers = await db.getDrivers();
    driver = drivers.find((d: any) => d.id === testDriverId);
    expect(driver?.status).toBe("offline");
  });
});
