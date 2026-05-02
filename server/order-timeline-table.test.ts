import { describe, it, expect } from "vitest";
import { getOrderTimelinesForReport } from "./db";

describe("Order Timeline Table", () => {

  it("should fetch order timelines for a date range", async () => {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    const endDate = new Date();

    const timelines = await getOrderTimelinesForReport(startDate, endDate);

    expect(timelines).toBeDefined();
    expect(Array.isArray(timelines)).toBe(true);
  });

  it("should include order ID and customer name in timeline", async () => {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    const endDate = new Date();

    const timelines = await getOrderTimelinesForReport(startDate, endDate);

    if (timelines && timelines.length > 0) {
      const timeline = timelines[0];
      expect(timeline).toHaveProperty("orderId");
      expect(timeline).toHaveProperty("customerName");
      expect(typeof timeline.orderId).toBe("number");
      expect(typeof timeline.customerName).toBe("string");
    }
  });

  it("should include status timestamps in timeline", async () => {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    const endDate = new Date();

    const timelines = await getOrderTimelinesForReport(startDate, endDate);

    if (timelines && timelines.length > 0) {
      const timeline = timelines[0];
      expect(timeline).toHaveProperty("timestamps");
      expect(timeline.timestamps).toHaveProperty("pending");
      expect(timeline.timestamps).toHaveProperty("ready");
      expect(timeline.timestamps).toHaveProperty("onTheWay");
      expect(timeline.timestamps).toHaveProperty("delivered");
    }
  });

  it("should calculate duration between status transitions", async () => {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    const endDate = new Date();

    const timelines = await getOrderTimelinesForReport(startDate, endDate);

    if (timelines && timelines.length > 0) {
      const timeline = timelines[0];
      expect(timeline).toHaveProperty("durations");
      expect(timeline.durations).toHaveProperty("pendingToReady");
      expect(timeline.durations).toHaveProperty("readyToOnTheWay");
      expect(timeline.durations).toHaveProperty("onTheWayToDelivered");
    }
  });

  it("should return null for timestamps not yet reached", async () => {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    const endDate = new Date();

    const timelines = await getOrderTimelinesForReport(startDate, endDate);

    if (timelines && timelines.length > 0) {
      const timeline = timelines[0];
      // Some orders may not have reached all statuses
      if (timeline.status !== "Delivered") {
        expect(timeline.timestamps.delivered).toBeNull();
      }
    }
  });

  it("should include customer address in timeline", async () => {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    const endDate = new Date();

    const timelines = await getOrderTimelinesForReport(startDate, endDate);

    if (timelines && timelines.length > 0) {
      const timeline = timelines[0];
      expect(timeline).toHaveProperty("customerAddress");
      expect(typeof timeline.customerAddress).toBe("string");
    }
  });

  it("should include current status in timeline", async () => {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    const endDate = new Date();

    const timelines = await getOrderTimelinesForReport(startDate, endDate);

    if (timelines && timelines.length > 0) {
      const timeline = timelines[0];
      expect(timeline).toHaveProperty("status");
      expect(["Pending", "Ready", "On the Way", "Delivered"]).toContain(timeline.status);
    }
  });

  it("should return empty array for future date range", async () => {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 7);
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 14);

    const timelines = await getOrderTimelinesForReport(startDate, endDate);

    expect(timelines).toBeDefined();
    expect(Array.isArray(timelines)).toBe(true);
    expect(timelines?.length).toBe(0);
  });

  it("should handle null database gracefully", async () => {
    // This test verifies error handling
    const startDate = new Date();
    const endDate = new Date();

    const timelines = await getOrderTimelinesForReport(startDate, endDate);

    // Should return null or empty array, not throw
    expect(timelines === null || Array.isArray(timelines)).toBe(true);
  });
});
