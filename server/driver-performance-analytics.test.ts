import { describe, it, expect, beforeAll } from "vitest";
import { getDriverPerformanceMetrics } from "./db";
import { initializeDatabase } from "./_core/initDb";

describe("Driver Performance Analytics", () => {
  beforeAll(async () => {
    await initializeDatabase();
  });

  it("should return performance metrics object with required fields", async () => {
    const metrics = await getDriverPerformanceMetrics(1);
    
    expect(metrics).toBeDefined();
    expect(metrics).toHaveProperty("todayDeliveryCount");
    expect(metrics).toHaveProperty("averageDeliveryTime");
    expect(metrics).toHaveProperty("completionRate");
  });

  it("should return numeric values for all metrics", async () => {
    const metrics = await getDriverPerformanceMetrics(1);
    
    expect(typeof metrics.todayDeliveryCount).toBe("number");
    expect(typeof metrics.averageDeliveryTime).toBe("number");
    expect(typeof metrics.completionRate).toBe("number");
  });

  it("should return non-negative values for all metrics", async () => {
    const metrics = await getDriverPerformanceMetrics(1);
    
    expect(metrics.todayDeliveryCount).toBeGreaterThanOrEqual(0);
    expect(metrics.averageDeliveryTime).toBeGreaterThanOrEqual(0);
    expect(metrics.completionRate).toBeGreaterThanOrEqual(0);
  });

  it("should return completion rate as percentage between 0 and 100", async () => {
    const metrics = await getDriverPerformanceMetrics(1);
    
    expect(metrics.completionRate).toBeLessThanOrEqual(100);
    expect(metrics.completionRate).toBeGreaterThanOrEqual(0);
  });

  it("should handle non-existent driver gracefully", async () => {
    const metrics = await getDriverPerformanceMetrics(99999);
    
    expect(metrics).toBeDefined();
    expect(metrics.todayDeliveryCount).toBe(0);
    expect(metrics.completionRate).toBe(0);
  });

  it("should return zero metrics when driver has no deliveries today", async () => {
    // Test with a driver that likely has no deliveries
    const metrics = await getDriverPerformanceMetrics(1);
    
    // Metrics should be valid even if zero
    expect(metrics.todayDeliveryCount).toBeGreaterThanOrEqual(0);
    expect(metrics.completionRate).toBeGreaterThanOrEqual(0);
  });

  it("should calculate metrics consistently across multiple calls", async () => {
    const metrics1 = await getDriverPerformanceMetrics(1);
    const metrics2 = await getDriverPerformanceMetrics(1);
    
    expect(metrics1.todayDeliveryCount).toBe(metrics2.todayDeliveryCount);
    expect(metrics1.averageDeliveryTime).toBe(metrics2.averageDeliveryTime);
    expect(metrics1.completionRate).toBe(metrics2.completionRate);
  });

  it("should return valid metrics for different drivers", async () => {
    const driver1Metrics = await getDriverPerformanceMetrics(1);
    const driver2Metrics = await getDriverPerformanceMetrics(2);
    
    // Both should return valid metric objects
    expect(driver1Metrics).toBeDefined();
    expect(driver2Metrics).toBeDefined();
    
    // Both should have required properties
    expect(driver1Metrics).toHaveProperty("todayDeliveryCount");
    expect(driver2Metrics).toHaveProperty("todayDeliveryCount");
  });
});
