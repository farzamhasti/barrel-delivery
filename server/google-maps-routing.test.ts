import { describe, it, expect, vi, beforeEach } from "vitest";
import { calculateReturnTimeWithGoogleMaps, RoutingOrder } from "./googleMapsRouting";
import * as mapModule from "./_core/map";

// Mock the makeRequest function
vi.mock("./_core/map", () => ({
  makeRequest: vi.fn(),
}));

describe("Google Maps Routing", () => {
  const restaurantAddress = "224 Garrison Rd, Fort Erie, ON L2A 1M7";
  const restaurantLat = 42.905191;
  const restaurantLng = -78.9225479;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Single Order Routing", () => {
    it("should calculate return time for single order with real Google Maps response", async () => {
      const orders: RoutingOrder[] = [
        {
          id: 1,
          address: "255 American Ave, Fort Erie, ON",
          latitude: 42.9,
          longitude: -78.92,
        },
      ];

      // Mock Google Maps response: 6 minutes one way = 12 minutes round trip
      const mockResponse = {
        status: "OK",
        routes: [
          {
            legs: [
              {
                distance: { text: "6 km", value: 6000 },
                duration: { text: "6 mins", value: 360 }, // 6 minutes to first location
                start_address: restaurantAddress,
                end_address: "255 American Ave, Fort Erie, ON",
                start_location: { lat: restaurantLat, lng: restaurantLng },
                end_location: { lat: 42.9, lng: -78.92 },
                steps: [],
              },
              {
                distance: { text: "6 km", value: 6000 },
                duration: { text: "6 mins", value: 360 }, // 6 minutes back to restaurant
                start_address: "255 American Ave, Fort Erie, ON",
                end_address: restaurantAddress,
                start_location: { lat: 42.9, lng: -78.92 },
                end_location: { lat: restaurantLat, lng: restaurantLng },
                steps: [],
              },
            ],
            overview_polyline: { points: "" },
            summary: "",
            warnings: [],
            waypoint_order: [],
          },
        ],
      };

      vi.mocked(mapModule.makeRequest).mockResolvedValueOnce(mockResponse);

      const result = await calculateReturnTimeWithGoogleMaps(
        orders,
        restaurantAddress,
        restaurantLat,
        restaurantLng
      );

      // Expected: 12 minutes travel + 1 minute pickup + 2 minutes delivery = 15 minutes
      expect(result.travelTime).toBe(720); // 12 minutes in seconds
      expect(result.pickupTime).toBe(60); // 1 minute
      expect(result.deliveryTime).toBe(120); // 2 minutes
      expect(result.totalSeconds).toBe(900); // 15 minutes
      expect(result.totalMinutes).toBe(15);
      expect(result.breakdown.travelMinutes).toBe(12);
      expect(result.breakdown.pickupMinutes).toBe(1);
      expect(result.breakdown.deliveryMinutes).toBe(2);
    });

    it("should handle single order with correct waypoint format", async () => {
      const orders: RoutingOrder[] = [
        {
          id: 1,
          address: "123 Main St",
          latitude: 43.0,
          longitude: -79.0,
        },
      ];

      const mockResponse = {
        status: "OK",
        routes: [
          {
            legs: [
              {
                duration: { text: "5 mins", value: 300 },
                distance: { text: "5 km", value: 5000 },
                start_address: restaurantAddress,
                end_address: "123 Main St",
                start_location: { lat: restaurantLat, lng: restaurantLng },
                end_location: { lat: 43.0, lng: -79.0 },
                steps: [],
              },
              {
                duration: { text: "5 mins", value: 300 },
                distance: { text: "5 km", value: 5000 },
                start_address: "123 Main St",
                end_address: restaurantAddress,
                start_location: { lat: 43.0, lng: -79.0 },
                end_location: { lat: restaurantLat, lng: restaurantLng },
                steps: [],
              },
            ],
            overview_polyline: { points: "" },
            summary: "",
            warnings: [],
            waypoint_order: [],
          },
        ],
      };

      vi.mocked(mapModule.makeRequest).mockResolvedValueOnce(mockResponse);

      const result = await calculateReturnTimeWithGoogleMaps(
        orders,
        restaurantAddress,
        restaurantLat,
        restaurantLng
      );

      expect(result.travelTime).toBe(600); // 10 minutes
      expect(result.totalMinutes).toBe(13); // 10 + 1 + 2
    });
  });

  describe("Multiple Orders Routing", () => {
    it("should calculate return time for multiple orders with waypoint optimization", async () => {
      const orders: RoutingOrder[] = [
        {
          id: 1,
          address: "255 American Ave, Fort Erie, ON",
          latitude: 42.9,
          longitude: -78.92,
        },
        {
          id: 2,
          address: "100 Bridge St, Fort Erie, ON",
          latitude: 42.88,
          longitude: -78.93,
        },
      ];

      // Mock Google Maps response with optimized route
      const mockResponse = {
        status: "OK",
        routes: [
          {
            legs: [
              {
                duration: { text: "6 mins", value: 360 },
                distance: { text: "6 km", value: 6000 },
                start_address: restaurantAddress,
                end_address: "255 American Ave",
                start_location: { lat: restaurantLat, lng: restaurantLng },
                end_location: { lat: 42.9, lng: -78.92 },
                steps: [],
              },
              {
                duration: { text: "3 mins", value: 180 },
                distance: { text: "3 km", value: 3000 },
                start_address: "255 American Ave",
                end_address: "100 Bridge St",
                start_location: { lat: 42.9, lng: -78.92 },
                end_location: { lat: 42.88, lng: -78.93 },
                steps: [],
              },
              {
                duration: { text: "4 mins", value: 240 },
                distance: { text: "4 km", value: 4000 },
                start_address: "100 Bridge St",
                end_address: restaurantAddress,
                start_location: { lat: 42.88, lng: -78.93 },
                end_location: { lat: restaurantLat, lng: restaurantLng },
                steps: [],
              },
            ],
            overview_polyline: { points: "" },
            summary: "",
            warnings: [],
            waypoint_order: [0, 1], // Optimized order
          },
        ],
      };

      vi.mocked(mapModule.makeRequest).mockResolvedValueOnce(mockResponse);

      const result = await calculateReturnTimeWithGoogleMaps(
        orders,
        restaurantAddress,
        restaurantLat,
        restaurantLng
      );

      // Expected: 13 minutes travel (6+3+4) + 1 minute pickup + 4 minutes delivery (2 per order) = 18 minutes
      expect(result.travelTime).toBe(780); // 13 minutes in seconds
      expect(result.pickupTime).toBe(60); // 1 minute
      expect(result.deliveryTime).toBe(240); // 4 minutes (2 per order)
      expect(result.totalSeconds).toBe(1080); // 18 minutes
      expect(result.totalMinutes).toBe(18);
      expect(result.breakdown.travelMinutes).toBe(13);
      expect(result.breakdown.deliveryMinutes).toBe(4);
    });

    it("should handle multiple orders with waypoint optimization enabled", async () => {
      const orders: RoutingOrder[] = [
        {
          id: 1,
          address: "Address 1",
          latitude: 42.9,
          longitude: -78.92,
        },
        {
          id: 2,
          address: "Address 2",
          latitude: 42.88,
          longitude: -78.93,
        },
        {
          id: 3,
          address: "Address 3",
          latitude: 42.91,
          longitude: -78.94,
        },
      ];

      const mockResponse = {
        status: "OK",
        routes: [
          {
            legs: [
              { duration: { text: "5 mins", value: 300 }, distance: { text: "5 km", value: 5000 }, start_address: "", end_address: "", start_location: { lat: 0, lng: 0 }, end_location: { lat: 0, lng: 0 }, steps: [] },
              { duration: { text: "3 mins", value: 180 }, distance: { text: "3 km", value: 3000 }, start_address: "", end_address: "", start_location: { lat: 0, lng: 0 }, end_location: { lat: 0, lng: 0 }, steps: [] },
              { duration: { text: "2 mins", value: 120 }, distance: { text: "2 km", value: 2000 }, start_address: "", end_address: "", start_location: { lat: 0, lng: 0 }, end_location: { lat: 0, lng: 0 }, steps: [] },
              { duration: { text: "4 mins", value: 240 }, distance: { text: "4 km", value: 4000 }, start_address: "", end_address: "", start_location: { lat: 0, lng: 0 }, end_location: { lat: 0, lng: 0 }, steps: [] },
            ],
            overview_polyline: { points: "" },
            summary: "",
            warnings: [],
            waypoint_order: [0, 2, 1], // Optimized order
          },
        ],
      };

      vi.mocked(mapModule.makeRequest).mockResolvedValueOnce(mockResponse);

      const result = await calculateReturnTimeWithGoogleMaps(
        orders,
        restaurantAddress,
        restaurantLat,
        restaurantLng
      );

      // Expected: 14 minutes travel (5+3+2+4) + 1 minute pickup + 6 minutes delivery (2 per order) = 21 minutes
      expect(result.travelTime).toBe(840); // 14 minutes in seconds
      expect(result.deliveryTime).toBe(360); // 6 minutes (2 per order)
      expect(result.totalSeconds).toBe(1260); // 21 minutes
      expect(result.totalMinutes).toBe(21);
    });
  });

  describe("Error Handling", () => {
    it("should handle Google Maps API errors gracefully", async () => {
      const orders: RoutingOrder[] = [
        {
          id: 1,
          address: "255 American Ave",
          latitude: 42.9,
          longitude: -78.92,
        },
      ];

      // Mock error response
      vi.mocked(mapModule.makeRequest).mockRejectedValueOnce(
        new Error("API Error")
      );

      const result = await calculateReturnTimeWithGoogleMaps(
        orders,
        restaurantAddress,
        restaurantLat,
        restaurantLng
      );

      // Should return fallback calculation with no travel time
      expect(result.travelTime).toBe(0);
      expect(result.pickupTime).toBe(60);
      expect(result.deliveryTime).toBe(120);
      expect(result.totalSeconds).toBe(180);
    });

    it("should handle invalid Google Maps response status", async () => {
      const orders: RoutingOrder[] = [
        {
          id: 1,
          address: "255 American Ave",
          latitude: 42.9,
          longitude: -78.92,
        },
      ];

      // Mock error response
      const mockResponse = {
        status: "ZERO_RESULTS",
        routes: [],
      };

      vi.mocked(mapModule.makeRequest).mockResolvedValueOnce(mockResponse);

      const result = await calculateReturnTimeWithGoogleMaps(
        orders,
        restaurantAddress,
        restaurantLat,
        restaurantLng
      );

      // Should return fallback calculation
      expect(result.travelTime).toBe(0);
      expect(result.totalSeconds).toBe(180);
    });

    it("should handle orders with missing coordinates", async () => {
      const orders: RoutingOrder[] = [
        {
          id: 1,
          address: "255 American Ave",
          latitude: 0,
          longitude: 0,
        },
      ];

      const result = await calculateReturnTimeWithGoogleMaps(
        orders,
        restaurantAddress,
        restaurantLat,
        restaurantLng
      );

      // Should return only pickup time
      expect(result.pickupTime).toBe(60);
      expect(result.deliveryTime).toBe(0);
      expect(result.travelTime).toBe(0);
      expect(result.totalSeconds).toBe(60);
    });

    it("should handle empty orders array", async () => {
      const orders: RoutingOrder[] = [];

      const result = await calculateReturnTimeWithGoogleMaps(
        orders,
        restaurantAddress,
        restaurantLat,
        restaurantLng
      );

      // Should return only pickup time
      expect(result.pickupTime).toBe(60);
      expect(result.deliveryTime).toBe(0);
      expect(result.travelTime).toBe(0);
      expect(result.totalSeconds).toBe(60);
      expect(result.totalMinutes).toBe(1);
    });
  });

  describe("Response Format", () => {
    it("should return correct response structure", async () => {
      const orders: RoutingOrder[] = [
        {
          id: 1,
          address: "255 American Ave",
          latitude: 42.9,
          longitude: -78.92,
        },
      ];

      const mockResponse = {
        status: "OK",
        routes: [
          {
            legs: [
              { duration: { text: "6 mins", value: 360 }, distance: { text: "6 km", value: 6000 }, start_address: "", end_address: "", start_location: { lat: 0, lng: 0 }, end_location: { lat: 0, lng: 0 }, steps: [] },
              { duration: { text: "6 mins", value: 360 }, distance: { text: "6 km", value: 6000 }, start_address: "", end_address: "", start_location: { lat: 0, lng: 0 }, end_location: { lat: 0, lng: 0 }, steps: [] },
            ],
            overview_polyline: { points: "" },
            summary: "",
            warnings: [],
            waypoint_order: [],
          },
        ],
      };

      vi.mocked(mapModule.makeRequest).mockResolvedValueOnce(mockResponse);

      const result = await calculateReturnTimeWithGoogleMaps(
        orders,
        restaurantAddress,
        restaurantLat,
        restaurantLng
      );

      // Verify response structure matches what frontend expects
      expect(result).toHaveProperty("pickupTime");
      expect(result).toHaveProperty("deliveryTime");
      expect(result).toHaveProperty("travelTime");
      expect(result).toHaveProperty("totalSeconds");
      expect(result).toHaveProperty("totalMinutes");
      expect(result).toHaveProperty("breakdown");
      expect(result.breakdown).toHaveProperty("pickupMinutes");
      expect(result.breakdown).toHaveProperty("deliveryMinutes");
      expect(result.breakdown).toHaveProperty("travelMinutes");

      // Verify all values are numbers
      expect(typeof result.pickupTime).toBe("number");
      expect(typeof result.deliveryTime).toBe("number");
      expect(typeof result.travelTime).toBe("number");
      expect(typeof result.totalSeconds).toBe("number");
      expect(typeof result.totalMinutes).toBe("number");
    });
  });
});
