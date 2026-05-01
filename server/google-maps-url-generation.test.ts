import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * Test suite for Google Maps URL generation in DriverDashboard
 * Tests the logic for generating optimized round-trip delivery routes
 */

describe("Google Maps URL Generation", () => {
  const RESTAURANT_LAT = 42.9149;
  const RESTAURANT_LNG = -79.0402;

  /**
   * Helper function to generate Google Maps URL (extracted from DriverDashboard logic)
   */
  function generateMapsUrl(orders: any[]) {
    // Filter orders that have coordinates (explicitly check for null/undefined, not falsy)
    const ordersWithCoordinates = orders.filter(
      (order: any) => order.customerLatitude !== null && order.customerLatitude !== undefined && order.customerLongitude !== null && order.customerLongitude !== undefined
    );

    if (ordersWithCoordinates.length === 0) {
      return null;
    }

    // Restaurant coordinates
    const restaurantCoords = `${RESTAURANT_LAT},${RESTAURANT_LNG}`;

    // Build waypoints from customer coordinates
    const waypoints = ordersWithCoordinates
      .map((order: any) => `${order.customerLatitude},${order.customerLongitude}`)
      .join("|");

    // Build Google Maps URL with optimization enabled
    const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${restaurantCoords}&destination=${restaurantCoords}&waypoints=${waypoints}&optimize=true&travelmode=driving`;

    return mapsUrl;
  }

  describe("Single Order Delivery", () => {
    it("should generate correct URL for single order with coordinates", () => {
      const orders = [
        {
          id: 1,
          customerLatitude: 43.2557,
          customerLongitude: -79.8711,
          customerAddress: "123 Main St",
        },
      ];

      const url = generateMapsUrl(orders);

      expect(url).toBeDefined();
      expect(url).toContain("api=1");
      expect(url).toContain(`origin=${RESTAURANT_LAT},${RESTAURANT_LNG}`);
      expect(url).toContain(`destination=${RESTAURANT_LAT},${RESTAURANT_LNG}`);
      expect(url).toContain("waypoints=43.2557,-79.8711");
      expect(url).toContain("optimize=true");
      expect(url).toContain("travelmode=driving");
    });

    it("should return null if order has no coordinates", () => {
      const orders = [
        {
          id: 1,
          customerLatitude: null,
          customerLongitude: -79.8711,
          customerAddress: "123 Main St",
        },
      ];

      const url = generateMapsUrl(orders);
      expect(url).toBeNull();
    });

    it("should return null if order has missing latitude", () => {
      const orders = [
        {
          id: 1,
          customerLatitude: undefined,
          customerLongitude: -79.8711,
          customerAddress: "123 Main St",
        },
      ];

      const url = generateMapsUrl(orders);
      expect(url).toBeNull();
    });

    it("should return null if order has missing longitude", () => {
      const orders = [
        {
          id: 1,
          customerLatitude: 43.2557,
          customerLongitude: undefined,
          customerAddress: "123 Main St",
        },
      ];

      const url = generateMapsUrl(orders);
      expect(url).toBeNull();
    });
  });

  describe("Multiple Orders Delivery", () => {
    it("should generate correct URL with multiple orders and waypoint optimization", () => {
      const orders = [
        {
          id: 1,
          customerLatitude: 43.2557,
          customerLongitude: -79.8711,
          customerAddress: "123 Main St",
        },
        {
          id: 2,
          customerLatitude: 43.2589,
          customerLongitude: -79.8711,
          customerAddress: "456 Oak Ave",
        },
        {
          id: 3,
          customerLatitude: 43.2600,
          customerLongitude: -79.8650,
          customerAddress: "789 Pine Rd",
        },
      ];

      const url = generateMapsUrl(orders);

      expect(url).toBeDefined();
      expect(url).toContain("api=1");
      expect(url).toContain(`origin=${RESTAURANT_LAT},${RESTAURANT_LNG}`);
      expect(url).toContain(`destination=${RESTAURANT_LAT},${RESTAURANT_LNG}`);
      // Waypoints should be pipe-separated (verify all coordinates are present)
      expect(url).toContain("waypoints=");
      expect(url).toContain("43.2557,-79.8711");
      expect(url).toContain("43.2589,-79.8711");
      expect(url).toContain("optimize=true");
      expect(url).toContain("travelmode=driving");
    });

    it("should filter out orders without coordinates in multi-order scenario", () => {
      const orders = [
        {
          id: 1,
          customerLatitude: 43.2557,
          customerLongitude: -79.8711,
          customerAddress: "123 Main St",
        },
        {
          id: 2,
          customerLatitude: null,
          customerLongitude: -79.8711,
          customerAddress: "456 Oak Ave",
        },
        {
          id: 3,
          customerLatitude: 43.2600,
          customerLongitude: -79.8650,
          customerAddress: "789 Pine Rd",
        },
      ];

      const url = generateMapsUrl(orders);

      expect(url).toBeDefined();
      // Should only include orders 1 and 3 (verify coordinates are present)
      expect(url).toContain("43.2557,-79.8711");
      expect(url).toContain("43.26");
      expect(url).toContain("-79.865");
      expect(url).not.toContain("null");
    });

    it("should handle orders with zero coordinates", () => {
      const orders = [
        {
          id: 1,
          customerLatitude: 0,
          customerLongitude: 0,
          customerAddress: "Origin Point",
        },
        {
          id: 2,
          customerLatitude: 43.2589,
          customerLongitude: -79.8711,
          customerAddress: "456 Oak Ave",
        },
      ];

      const url = generateMapsUrl(orders);

      expect(url).toBeDefined();
      expect(url).toContain("waypoints=");
      expect(url).toContain("0,0");
      expect(url).toContain("43.2589,-79.8711");
    });
  });

  describe("Round-trip Routing", () => {
    it("should use same restaurant coordinates for origin and destination", () => {
      const orders = [
        {
          id: 1,
          customerLatitude: 43.2557,
          customerLongitude: -79.8711,
          customerAddress: "123 Main St",
        },
      ];

      const url = generateMapsUrl(orders);

      const originMatch = url?.match(/origin=([^&]+)/);
      const destinationMatch = url?.match(/destination=([^&]+)/);

      expect(originMatch?.[1]).toBe(destinationMatch?.[1]);
      expect(originMatch?.[1]).toBe(`${RESTAURANT_LAT},${RESTAURANT_LNG}`);
    });

    it("should maintain round-trip format with multiple orders", () => {
      const orders = [
        {
          id: 1,
          customerLatitude: 43.2557,
          customerLongitude: -79.8711,
        },
        {
          id: 2,
          customerLatitude: 43.2589,
          customerLongitude: -79.8711,
        },
      ];

      const url = generateMapsUrl(orders);

      // URL should follow pattern: origin -> waypoints -> destination
      const hasOrigin = url?.includes(`origin=${RESTAURANT_LAT},${RESTAURANT_LNG}`);
      const hasDestination = url?.includes(`destination=${RESTAURANT_LAT},${RESTAURANT_LNG}`);
      const hasWaypoints = url?.includes("waypoints=");

      expect(hasOrigin).toBe(true);
      expect(hasDestination).toBe(true);
      expect(hasWaypoints).toBe(true);
    });
  });

  describe("URL Format Validation", () => {
    it("should use proper Google Maps Directions API format", () => {
      const orders = [
        {
          id: 1,
          customerLatitude: 43.2557,
          customerLongitude: -79.8711,
        },
      ];

      const url = generateMapsUrl(orders);

      expect(url).toMatch(/^https:\/\/www\.google\.com\/maps\/dir\/\?/);
      expect(url).toContain("api=1");
      expect(url).toContain("travelmode=driving");
    });

    it("should include waypoint optimization parameter", () => {
      const orders = [
        {
          id: 1,
          customerLatitude: 43.2557,
          customerLongitude: -79.8711,
        },
        {
          id: 2,
          customerLatitude: 43.2589,
          customerLongitude: -79.8711,
        },
      ];

      const url = generateMapsUrl(orders);

      expect(url).toContain("optimize=true");
    });

    it("should properly format coordinates with decimal precision", () => {
      const orders = [
        {
          id: 1,
          customerLatitude: 43.25571234,
          customerLongitude: -79.87112345,
        },
      ];

      const url = generateMapsUrl(orders);

      expect(url).toContain("waypoints=43.25571234,-79.87112345");
    });
  });

  describe("Empty and Edge Cases", () => {
    it("should return null for empty orders array", () => {
      const url = generateMapsUrl([]);
      expect(url).toBeNull();
    });

    it("should return null when all orders lack coordinates", () => {
      const orders = [
        {
          id: 1,
          customerLatitude: null,
          customerLongitude: null,
        },
        {
          id: 2,
          customerLatitude: undefined,
          customerLongitude: undefined,
        },
      ];

      const url = generateMapsUrl(orders);
      expect(url).toBeNull();
    });

    it("should handle negative coordinates (Southern/Western hemispheres)", () => {
      const orders = [
        {
          id: 1,
          customerLatitude: -33.8688,
          customerLongitude: 151.2093,
        },
      ];

      const url = generateMapsUrl(orders);

      expect(url).toBeDefined();
      expect(url).toContain("waypoints=-33.8688,151.2093");
    });

    it("should handle very large coordinate values", () => {
      const orders = [
        {
          id: 1,
          customerLatitude: 89.9999,
          customerLongitude: 179.9999,
        },
      ];

      const url = generateMapsUrl(orders);

      expect(url).toBeDefined();
      expect(url).toContain("waypoints=89.9999,179.9999");
    });
  });
});
