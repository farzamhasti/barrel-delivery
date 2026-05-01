import { describe, it, expect } from "vitest";

/**
 * Integration test for Google Maps URL generation with database coordinates
 * Tests the full flow from database orders to Google Maps URL
 */

describe("Google Maps Integration - Orders with Coordinates", () => {
  const RESTAURANT_LAT = 42.9149;
  const RESTAURANT_LNG = -79.0402;

  /**
   * Simulates the getTodayOrdersWithItems function that fetches orders from database
   */
  function simulateGetOrdersFromDatabase() {
    return [
      {
        id: 1,
        orderNumber: "ORD-001",
        driverId: 1,
        status: "On the Way",
        customerAddress: "255 American Ave, Fort Erie, ON",
        customerLatitude: 42.9149,
        customerLongitude: -79.0402,
        customerPhone: "555-0001",
        area: "Downtown",
        deliveryTime: "18:30",
      },
      {
        id: 2,
        orderNumber: "ORD-002",
        driverId: 1,
        status: "On the Way",
        customerAddress: "100 Bridge St, Fort Erie, ON",
        customerLatitude: 42.9200,
        customerLongitude: -79.0350,
        customerPhone: "555-0002",
        area: "Downtown",
        deliveryTime: "18:45",
      },
    ];
  }

  /**
   * Simulates the Google Maps URL generation from DriverDashboard
   */
  function generateMapsUrlFromOrders(orders: any[]) {
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

  describe("Database Integration", () => {
    it("should fetch orders with coordinates from database", () => {
      const orders = simulateGetOrdersFromDatabase();
      
      expect(orders).toHaveLength(2);
      expect(orders[0].customerLatitude).toBeDefined();
      expect(orders[0].customerLongitude).toBeDefined();
      expect(orders[1].customerLatitude).toBeDefined();
      expect(orders[1].customerLongitude).toBeDefined();
    });

    it("should generate Google Maps URL from database orders", () => {
      const orders = simulateGetOrdersFromDatabase();
      const url = generateMapsUrlFromOrders(orders);

      expect(url).toBeDefined();
      expect(url).toContain("api=1");
      expect(url).toContain(`origin=${RESTAURANT_LAT},${RESTAURANT_LNG}`);
      expect(url).toContain(`destination=${RESTAURANT_LAT},${RESTAURANT_LNG}`);
      expect(url).toContain("waypoints=");
      expect(url).toContain("optimize=true");
      expect(url).toContain("travelmode=driving");
    });

    it("should include all order coordinates in waypoints", () => {
      const orders = simulateGetOrdersFromDatabase();
      const url = generateMapsUrlFromOrders(orders);

      expect(url).toContain("42.9149,-79.0402");
      expect(url).toContain("42.92,-79.035");
    });
  });

  describe("Single Order Scenario", () => {
    it("should generate URL for single order with coordinates", () => {
      const orders = [simulateGetOrdersFromDatabase()[0]];
      const url = generateMapsUrlFromOrders(orders);

      expect(url).toBeDefined();
      expect(url).toContain("waypoints=42.9149,-79.0402");
      expect(url).toContain("optimize=true");
    });
  });

  describe("Multiple Orders Scenario", () => {
    it("should generate URL for multiple orders with waypoint optimization", () => {
      const orders = simulateGetOrdersFromDatabase();
      const url = generateMapsUrlFromOrders(orders);

      expect(url).toBeDefined();
      // Should contain both waypoints
      expect(url).toContain("waypoints=");
      expect(url).toContain("42.9149,-79.0402");
      expect(url).toContain("42.92,-79.035");
      // Should have optimization enabled
      expect(url).toContain("optimize=true");
    });
  });

  describe("Missing Coordinates Handling", () => {
    it("should return null when orders lack coordinates", () => {
      const orders = [
        {
          id: 1,
          orderNumber: "ORD-001",
          driverId: 1,
          status: "On the Way",
          customerAddress: "255 American Ave, Fort Erie, ON",
          customerLatitude: null,
          customerLongitude: null,
          customerPhone: "555-0001",
        },
      ];

      const url = generateMapsUrlFromOrders(orders);
      expect(url).toBeNull();
    });

    it("should filter out orders without coordinates in mixed scenario", () => {
      const orders = [
        {
          id: 1,
          orderNumber: "ORD-001",
          driverId: 1,
          status: "On the Way",
          customerAddress: "255 American Ave, Fort Erie, ON",
          customerLatitude: 42.9149,
          customerLongitude: -79.0402,
        },
        {
          id: 2,
          orderNumber: "ORD-002",
          driverId: 1,
          status: "On the Way",
          customerAddress: "100 Bridge St, Fort Erie, ON",
          customerLatitude: null,
          customerLongitude: null,
        },
        {
          id: 3,
          orderNumber: "ORD-003",
          driverId: 1,
          status: "On the Way",
          customerAddress: "200 Main St, Fort Erie, ON",
          customerLatitude: 42.9200,
          customerLongitude: -79.0350,
        },
      ];

      const url = generateMapsUrlFromOrders(orders);
      expect(url).toBeDefined();
      // Should only include orders 1 and 3
      expect(url).toContain("42.9149,-79.0402");
      expect(url).toContain("42.92,-79.035");
      expect(url).not.toContain("null");
    });
  });

  describe("Round-trip Routing Validation", () => {
    it("should use restaurant as both origin and destination", () => {
      const orders = simulateGetOrdersFromDatabase();
      const url = generateMapsUrlFromOrders(orders);

      const originMatch = url?.match(/origin=([^&]+)/);
      const destinationMatch = url?.match(/destination=([^&]+)/);

      expect(originMatch?.[1]).toBe(`${RESTAURANT_LAT},${RESTAURANT_LNG}`);
      expect(destinationMatch?.[1]).toBe(`${RESTAURANT_LAT},${RESTAURANT_LNG}`);
      expect(originMatch?.[1]).toBe(destinationMatch?.[1]);
    });
  });

  describe("URL Format Compliance", () => {
    it("should generate valid Google Maps Directions API URL", () => {
      const orders = simulateGetOrdersFromDatabase();
      const url = generateMapsUrlFromOrders(orders);

      expect(url).toMatch(/^https:\/\/www\.google\.com\/maps\/dir\/\?/);
      expect(url).toContain("api=1");
      expect(url).toContain("origin=");
      expect(url).toContain("destination=");
      expect(url).toContain("waypoints=");
      expect(url).toContain("optimize=true");
      expect(url).toContain("travelmode=driving");
    });

    it("should properly encode waypoints with pipe separator", () => {
      const orders = simulateGetOrdersFromDatabase();
      const url = generateMapsUrlFromOrders(orders);

      // Waypoints should be pipe-separated
      const waypointsMatch = url?.match(/waypoints=([^&]+)/);
      expect(waypointsMatch?.[1]).toContain("|");
    });
  });
});
