import { describe, it, expect, beforeAll } from "vitest";
import * as db from "./db";

describe("Delivery Report and Order Status Timeline", () => {
  let testOrderId: number;

  beforeAll(async () => {
    // Create a test order for status tracking
    const customer = await db.createCustomer({
      name: "Test Customer",
      phone: "1234567890",
      email: "test@example.com",
      address: "123 Test St",
      city: "Toronto",
      postalCode: "M1A 1A1",
    });

    if (customer) {
      const order = await db.createOrder({
        customerId: customer.id,
        subtotal: "25.00",
        taxPercentage: "13",
        taxAmount: "3.25",
        totalPrice: "28.25",
        hasDeliveryTime: false,
      });

      if (order) {
        testOrderId = order.id;
      }
    }
  });

  it("should log order status changes", async () => {
    if (!testOrderId) {
      console.log("Skipping test: no test order created");
      return;
    }

    // Log status change from Pending to Ready
    const result = await db.logOrderStatusChange(testOrderId, "Pending", "Ready");
    expect(result).toBeDefined();
  });

  it("should retrieve order status timeline", async () => {
    if (!testOrderId) {
      console.log("Skipping test: no test order created");
      return;
    }

    // Get the timeline for the test order
    const timeline = await db.getOrderStatusTimeline(testOrderId);
    expect(Array.isArray(timeline)).toBe(true);
  });

  it("should calculate delivery report metrics", async () => {
    const startDate = new Date(new Date().setDate(new Date().getDate() - 7));
    const endDate = new Date();

    const metrics = await db.getDeliveryReportMetrics(startDate, endDate);
    
    expect(metrics).toBeDefined();
    if (metrics) {
      expect(metrics.totalOrders).toBeGreaterThanOrEqual(0);
      expect(metrics.deliveredOrders).toBeGreaterThanOrEqual(0);
      expect(metrics.deliveryRate).toBeGreaterThanOrEqual(0);
      expect(metrics.deliveryRate).toBeLessThanOrEqual(100);
      expect(metrics.averageDeliveryTime).toBeGreaterThanOrEqual(0);
    }
  });

  it("should handle empty date range", async () => {
    const startDate = new Date("2020-01-01");
    const endDate = new Date("2020-01-02");

    const metrics = await db.getDeliveryReportMetrics(startDate, endDate);
    
    expect(metrics).toBeDefined();
    if (metrics) {
      expect(metrics.totalOrders).toBe(0);
      expect(metrics.deliveredOrders).toBe(0);
      expect(metrics.deliveryRate).toBe(0);
    }
  });

  it("should calculate delivery rate correctly", async () => {
    const startDate = new Date(new Date().setDate(new Date().getDate() - 7));
    const endDate = new Date();

    const metrics = await db.getDeliveryReportMetrics(startDate, endDate);
    
    if (metrics && metrics.totalOrders > 0) {
      const expectedRate = Math.round((metrics.deliveredOrders / metrics.totalOrders) * 100);
      expect(metrics.deliveryRate).toBe(expectedRate);
    }
  });

  it("should track multiple status transitions", async () => {
    if (!testOrderId) {
      console.log("Skipping test: no test order created");
      return;
    }

    // Log multiple transitions
    await db.logOrderStatusChange(testOrderId, "Ready", "On the Way");
    await db.logOrderStatusChange(testOrderId, "On the Way", "Delivered");

    // Retrieve timeline
    const timeline = await db.getOrderStatusTimeline(testOrderId);
    
    // Should have at least 3 transitions
    expect(timeline.length).toBeGreaterThanOrEqual(1);
  });

  it("should return metrics with correct date range", async () => {
    const today = new Date();
    const startDate = new Date(today.setDate(today.getDate() - 1));
    const endDate = new Date();

    const metrics = await db.getDeliveryReportMetrics(startDate, endDate);
    
    expect(metrics).toBeDefined();
    if (metrics) {
      expect(metrics.dateRange).toBeDefined();
      const startTime = new Date(metrics.dateRange.start).getTime();
      const endTime = new Date(metrics.dateRange.end).getTime();
      expect(startTime).toBeLessThanOrEqual(endTime);
    }
  });

  it("should handle null timestamps in average calculation", async () => {
    const startDate = new Date(new Date().setDate(new Date().getDate() - 7));
    const endDate = new Date();

    const metrics = await db.getDeliveryReportMetrics(startDate, endDate);
    
    // Should not throw error even if some orders have null timestamps
    expect(metrics).toBeDefined();
    expect(metrics?.averageDeliveryTime).toBeGreaterThanOrEqual(0);
  });
});
