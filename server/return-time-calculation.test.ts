import { describe, it, expect } from "vitest";
import { calculateReturnTime } from "./returnTime";

describe("Return Time Calculation", () => {
  // Restaurant coordinates: 224 Garrison Rd, Fort Erie, ON L2A 1M7
  const RESTAURANT_LAT = 42.905191;
  const RESTAURANT_LNG = -78.9225479;

  it("should calculate correct return time for single order", () => {
    // 255 American Avenue (approximate coordinates in Fort Erie area)
    // This is roughly 12 minutes round trip from the restaurant
    const orders = [
      {
        id: 1,
        customerLatitude: 42.9,
        customerLongitude: -78.92,
      },
    ];

    const result = calculateReturnTime(orders, RESTAURANT_LAT, RESTAURANT_LNG);

    // Expected: 1 minute pickup + 2 minutes delivery + travel time
    expect(result.pickupTime).toBe(60); // 1 minute in seconds
    expect(result.deliveryTime).toBe(120); // 2 minutes per order
    expect(result.travelTime).toBeGreaterThan(0); // Should have travel time
    expect(result.totalSeconds).toBeGreaterThan(180); // At least 3 minutes
    expect(result.totalSeconds).toBeLessThan(1200); // Less than 20 minutes
    expect(result.totalMinutes).toBe(Math.ceil(result.totalSeconds / 60));
  });

  it("should handle multiple orders correctly", () => {
    const orders = [
      {
        id: 1,
        customerLatitude: 42.9,
        customerLongitude: -78.92,
      },
      {
        id: 2,
        customerLatitude: 42.91,
        customerLongitude: -78.93,
      },
    ];

    const result = calculateReturnTime(orders, RESTAURANT_LAT, RESTAURANT_LNG);

    // Expected: 1 minute pickup + 4 minutes delivery (2 per order) + travel time
    expect(result.pickupTime).toBe(60);
    expect(result.deliveryTime).toBe(240); // 2 orders × 2 minutes
    expect(result.breakdown.deliveryMinutes).toBe(4);
    expect(result.travelTime).toBeGreaterThan(0); // Should have travel time for multiple orders
  });

  it("should return only pickup time when no orders provided", () => {
    const result = calculateReturnTime([], RESTAURANT_LAT, RESTAURANT_LNG);

    expect(result.pickupTime).toBe(60);
    expect(result.deliveryTime).toBe(0);
    expect(result.travelTime).toBe(0);
    expect(result.totalSeconds).toBe(60);
    expect(result.totalMinutes).toBe(1);
  });

  it("should skip orders without valid coordinates", () => {
    const orders = [
      {
        id: 1,
        customerLatitude: null,
        customerLongitude: null,
      },
      {
        id: 2,
        customerLatitude: 42.9,
        customerLongitude: -78.92,
      },
    ];

    const result = calculateReturnTime(orders, RESTAURANT_LAT, RESTAURANT_LNG);

    // Should only count the second order (1 order with valid coordinates)
    expect(result.deliveryTime).toBe(120); // 1 order × 2 minutes
    expect(result.travelTime).toBeGreaterThan(0); // Should have travel time for the valid order
    // Total should be pickup + delivery + travel
    expect(result.totalSeconds).toBeGreaterThan(180);
  });

  it("should use restaurant coordinates correctly", () => {
    const orders = [
      {
        id: 1,
        customerLatitude: 42.905191,
        customerLongitude: -78.9225479, // Same as restaurant
      },
    ];

    const result = calculateReturnTime(orders, RESTAURANT_LAT, RESTAURANT_LNG);

    // If customer is at the restaurant, travel time should be minimal
    expect(result.travelTime).toBeLessThan(120); // Less than 2 minutes travel
    expect(result.totalSeconds).toBeLessThan(300); // Less than 5 minutes total (1 + 2 + minimal travel)
  });

  it("should provide breakdown of time components", () => {
    const orders = [
      {
        id: 1,
        customerLatitude: 42.9,
        customerLongitude: -78.92,
      },
    ];

    const result = calculateReturnTime(orders, RESTAURANT_LAT, RESTAURANT_LNG);

    expect(result.breakdown).toBeDefined();
    expect(result.breakdown.pickupMinutes).toBe(1);
    expect(result.breakdown.deliveryMinutes).toBe(2);
    expect(result.breakdown.travelMinutes).toBeGreaterThan(0);
  });
});
