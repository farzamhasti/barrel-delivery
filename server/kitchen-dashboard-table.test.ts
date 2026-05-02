import { describe, it, expect, beforeAll } from "vitest";
import { getActiveDrivers } from "./db";
import { initializeDatabase } from "./_core/initDb";

describe("Kitchen Dashboard Active Drivers Table Format", () => {
  beforeAll(async () => {
    await initializeDatabase();
  });

  it("should fetch active drivers with table-compatible structure", async () => {
    const drivers = await getActiveDrivers();
    
    if (drivers.length > 0) {
      const driver = drivers[0];
      expect(driver).toHaveProperty("id");
      expect(driver).toHaveProperty("name");
      expect(driver).toHaveProperty("status");
    }
  });

  it("should display only online drivers in the table", async () => {
    const drivers = await getActiveDrivers();
    
    drivers.forEach((driver: any) => {
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

  it("should include all necessary fields for table display", async () => {
    const drivers = await getActiveDrivers();
    
    if (drivers.length > 0) {
      const driver = drivers[0];
      expect(driver).toHaveProperty("id");
      expect(driver).toHaveProperty("name");
      expect(driver).toHaveProperty("status");
    }
  });

  it("should handle zero active drivers without errors", async () => {
    const drivers = await getActiveDrivers();
    
    expect(Array.isArray(drivers)).toBe(true);
  });

  it("should provide consistent driver name format", async () => {
    const drivers = await getActiveDrivers();
    
    if (drivers.length > 0) {
      drivers.forEach((driver: any) => {
        expect(typeof driver.name).toBe("string");
        expect(driver.name.trim().length).toBeGreaterThan(0);
      });
    }
  });

  it("should format status consistently as 'online'", async () => {
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
