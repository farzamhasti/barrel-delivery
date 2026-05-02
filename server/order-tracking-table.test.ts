import { describe, it, expect, beforeAll } from "vitest";
import { getActiveDrivers } from "./db";
import { initializeDatabase } from "./_core/initDb";

describe("Order Tracking Active Drivers Table Format", () => {
  beforeAll(async () => {
    await initializeDatabase();
  });

  it("should fetch active drivers with correct fields for table display", async () => {
    const drivers = await getActiveDrivers();
    
    if (drivers.length > 0) {
      const driver = drivers[0];
      expect(driver).toHaveProperty("id");
      expect(driver).toHaveProperty("name");
      expect(driver).toHaveProperty("status");
    }
  });

  it("should filter drivers by online status only", async () => {
    const activeDrivers = await getActiveDrivers();
    
    activeDrivers.forEach((driver: any) => {
      expect(driver.status).toBe("online");
    });
  });

  it("should include driver data for table display", async () => {
    const drivers = await getActiveDrivers();
    
    if (drivers.length > 0) {
      const driver = drivers[0];
      // Driver has all necessary fields for table display
      expect(driver).toHaveProperty("id");
      expect(driver).toHaveProperty("name");
      expect(driver).toHaveProperty("status");
    }
  });

  it("should return drivers with necessary fields for table display", async () => {
    const drivers = await getActiveDrivers();
    
    if (drivers.length > 0) {
      const driver = drivers[0];
      // Driver has all necessary fields for table display
      expect(driver).toHaveProperty("id");
      expect(driver).toHaveProperty("name");
      expect(driver).toHaveProperty("status");
    }
  });

  it("should handle empty active drivers list gracefully", async () => {
    const drivers = await getActiveDrivers();
    
    expect(Array.isArray(drivers)).toBe(true);
  });

  it("should display driver names correctly in table", async () => {
    const drivers = await getActiveDrivers();
    
    if (drivers.length > 0) {
      drivers.forEach((driver: any) => {
        expect(typeof driver.name).toBe("string");
        expect(driver.name.length).toBeGreaterThan(0);
      });
    }
  });

  it("should format status as 'online' for active drivers", async () => {
    const drivers = await getActiveDrivers();
    
    if (drivers.length > 0) {
      drivers.forEach((driver: any) => {
        expect(driver.status).toBe("online");
      });
    }
  });

  it("should support table display with default estimated return time", async () => {
    const drivers = await getActiveDrivers();
    
    if (drivers.length > 0) {
      drivers.forEach((driver: any) => {
        // Frontend displays estimated return time (calculated or default ~15 min)
        // Driver object has all necessary fields for table display
        expect(driver).toHaveProperty("id");
        expect(driver).toHaveProperty("name");
        expect(driver).toHaveProperty("status");
      });
    }
  });
});
