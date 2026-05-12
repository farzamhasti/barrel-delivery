import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { analyzeSpatialDemandShift, SpatialZone } from "./spatialDemandShift";
import * as h3 from "h3-js";

// Mock the database module
vi.mock("./db", () => ({
  getDb: vi.fn(),
}));

import { getDb } from "./db";

describe("Spatial Demand Shift Analysis", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should handle database connection failure gracefully", async () => {
    const mockGetDb = vi.mocked(getDb);
    mockGetDb.mockResolvedValueOnce(null);

    const result = await analyzeSpatialDemandShift(
      new Date("2026-05-07"),
      new Date("2026-05-12")
    );

    expect(result.success).toBe(false);
    expect(result.zones).toEqual([]);
    expect(result.spatialInterpretation).toContain("Database connection unavailable");
  });

  it("should return empty zones when no orders exist in date range", async () => {
    const mockDb = {
      query: {
        orders: {
          findMany: vi.fn().mockResolvedValueOnce([]),
        },
      },
    };

    const mockGetDb = vi.mocked(getDb);
    mockGetDb.mockResolvedValueOnce(mockDb as any);

    const result = await analyzeSpatialDemandShift(
      new Date("2026-05-07"),
      new Date("2026-05-12")
    );

    expect(result.success).toBe(false);
    expect(result.zones).toEqual([]);
    expect(result.spatialInterpretation).toContain("No delivery data available");
  });

  it("should classify zones based on spatial density changes (50% growth = Moderate)", async () => {
    const startDate = new Date("2026-05-07");
    const endDate = new Date("2026-05-12");
    const midpoint = new Date((startDate.getTime() + endDate.getTime()) / 2);

    // Create mock orders with coordinates
    const mockOrders = [
      // Previous period orders (before midpoint)
      {
        id: "1",
        customerLatitude: 42.9849,
        customerLongitude: -79.0204,
        createdAt: startDate.getTime() + 1000,
        status: "Delivered",
        area: "DN",
      },
      {
        id: "2",
        customerLatitude: 42.9849,
        customerLongitude: -79.0204,
        createdAt: startDate.getTime() + 2000,
        status: "Delivered",
        area: "DN",
      },
      // Current period orders (after midpoint) - same location, more orders
      {
        id: "3",
        customerLatitude: 42.9849,
        customerLongitude: -79.0204,
        createdAt: midpoint.getTime() + 1000,
        status: "Delivered",
        area: "DN",
      },
      {
        id: "4",
        customerLatitude: 42.9849,
        customerLongitude: -79.0204,
        createdAt: midpoint.getTime() + 2000,
        status: "Delivered",
        area: "DN",
      },
      {
        id: "5",
        customerLatitude: 42.9849,
        customerLongitude: -79.0204,
        createdAt: midpoint.getTime() + 3000,
        status: "Delivered",
        area: "DN",
      },
    ];

    const mockDb = {
      query: {
        orders: {
          findMany: vi.fn().mockResolvedValueOnce(mockOrders),
        },
      },
    };

    const mockGetDb = vi.mocked(getDb);
    mockGetDb.mockResolvedValueOnce(mockDb as any);

    const result = await analyzeSpatialDemandShift(startDate, endDate);

    expect(result.success).toBe(true);
    expect(result.zones.length).toBeGreaterThan(0);

    const zone = result.zones[0];
    expect(zone.previousDensity).toBe(2);
    expect(zone.currentDensity).toBe(3);
    expect(zone.densityChange).toBe(1);
    expect(zone.growthPercentage).toBe(50);
    // 50% growth is classified as Moderate Growth (> 10% but not > 50%)
    expect(zone.classification).toBe("Moderate Growth");
    expect(zone.clusterStatus).toBe("growing");
  });

  it("should detect new cluster formation", async () => {
    const startDate = new Date("2026-05-07");
    const endDate = new Date("2026-05-12");
    const midpoint = new Date((startDate.getTime() + endDate.getTime()) / 2);

    // Create mock orders - new cluster in current period
    const mockOrders = [
      // Previous period: no orders at location A
      // Current period: new orders at location A
      {
        id: "1",
        customerLatitude: 42.9849,
        customerLongitude: -79.0204,
        createdAt: midpoint.getTime() + 1000,
        status: "Delivered",
        area: "DN",
      },
      {
        id: "2",
        customerLatitude: 42.9849,
        customerLongitude: -79.0204,
        createdAt: midpoint.getTime() + 2000,
        status: "Delivered",
        area: "DN",
      },
    ];

    const mockDb = {
      query: {
        orders: {
          findMany: vi.fn().mockResolvedValueOnce(mockOrders),
        },
      },
    };

    const mockGetDb = vi.mocked(getDb);
    mockGetDb.mockResolvedValueOnce(mockDb as any);

    const result = await analyzeSpatialDemandShift(startDate, endDate);

    expect(result.success).toBe(true);
    expect(result.zones.length).toBeGreaterThan(0);

    const zone = result.zones[0];
    expect(zone.previousDensity).toBe(0);
    expect(zone.currentDensity).toBe(2);
    expect(zone.clusterStatus).toBe("new");
    expect(zone.classification).toBe("Strong Growth");
  });

  it("should detect cluster disappearance", async () => {
    const startDate = new Date("2026-05-07");
    const endDate = new Date("2026-05-12");
    const midpoint = new Date((startDate.getTime() + endDate.getTime()) / 2);

    // Create mock orders - cluster disappearing
    const mockOrders = [
      // Previous period: many orders at location
      {
        id: "1",
        customerLatitude: 42.9849,
        customerLongitude: -79.0204,
        createdAt: startDate.getTime() + 1000,
        status: "Delivered",
        area: "DN",
      },
      {
        id: "2",
        customerLatitude: 42.9849,
        customerLongitude: -79.0204,
        createdAt: startDate.getTime() + 2000,
        status: "Delivered",
        area: "DN",
      },
      {
        id: "3",
        customerLatitude: 42.9849,
        customerLongitude: -79.0204,
        createdAt: startDate.getTime() + 3000,
        status: "Delivered",
        area: "DN",
      },
      // Current period: no orders at location
    ];

    const mockDb = {
      query: {
        orders: {
          findMany: vi.fn().mockResolvedValueOnce(mockOrders),
        },
      },
    };

    const mockGetDb = vi.mocked(getDb);
    mockGetDb.mockResolvedValueOnce(mockDb as any);

    const result = await analyzeSpatialDemandShift(startDate, endDate);

    expect(result.success).toBe(true);
    expect(result.zones.length).toBeGreaterThan(0);

    const zone = result.zones[0];
    expect(zone.previousDensity).toBe(3);
    expect(zone.currentDensity).toBe(0);
    expect(zone.clusterStatus).toBe("disappearing");
    expect(zone.classification).toBe("Rapid Shift");
  });

  it("should classify stable zones correctly", async () => {
    const startDate = new Date("2026-05-07");
    const endDate = new Date("2026-05-12");
    const midpoint = new Date((startDate.getTime() + endDate.getTime()) / 2);

    // Create mock orders - stable density
    const mockOrders = [
      // Previous period: 5 orders
      {
        id: "1",
        customerLatitude: 42.9849,
        customerLongitude: -79.0204,
        createdAt: startDate.getTime() + 1000,
        status: "Delivered",
        area: "DN",
      },
      {
        id: "2",
        customerLatitude: 42.9849,
        customerLongitude: -79.0204,
        createdAt: startDate.getTime() + 2000,
        status: "Delivered",
        area: "DN",
      },
      {
        id: "3",
        customerLatitude: 42.9849,
        customerLongitude: -79.0204,
        createdAt: startDate.getTime() + 3000,
        status: "Delivered",
        area: "DN",
      },
      {
        id: "4",
        customerLatitude: 42.9849,
        customerLongitude: -79.0204,
        createdAt: startDate.getTime() + 4000,
        status: "Delivered",
        area: "DN",
      },
      {
        id: "5",
        customerLatitude: 42.9849,
        customerLongitude: -79.0204,
        createdAt: startDate.getTime() + 5000,
        status: "Delivered",
        area: "DN",
      },
      // Current period: 5 orders (same density)
      {
        id: "6",
        customerLatitude: 42.9849,
        customerLongitude: -79.0204,
        createdAt: midpoint.getTime() + 1000,
        status: "Delivered",
        area: "DN",
      },
      {
        id: "7",
        customerLatitude: 42.9849,
        customerLongitude: -79.0204,
        createdAt: midpoint.getTime() + 2000,
        status: "Delivered",
        area: "DN",
      },
      {
        id: "8",
        customerLatitude: 42.9849,
        customerLongitude: -79.0204,
        createdAt: midpoint.getTime() + 3000,
        status: "Delivered",
        area: "DN",
      },
      {
        id: "9",
        customerLatitude: 42.9849,
        customerLongitude: -79.0204,
        createdAt: midpoint.getTime() + 4000,
        status: "Delivered",
        area: "DN",
      },
      {
        id: "10",
        customerLatitude: 42.9849,
        customerLongitude: -79.0204,
        createdAt: midpoint.getTime() + 5000,
        status: "Delivered",
        area: "DN",
      },
    ];

    const mockDb = {
      query: {
        orders: {
          findMany: vi.fn().mockResolvedValueOnce(mockOrders),
        },
      },
    };

    const mockGetDb = vi.mocked(getDb);
    mockGetDb.mockResolvedValueOnce(mockDb as any);

    const result = await analyzeSpatialDemandShift(startDate, endDate);

    expect(result.success).toBe(true);
    expect(result.zones.length).toBeGreaterThan(0);

    const zone = result.zones[0];
    expect(zone.previousDensity).toBe(5);
    expect(zone.currentDensity).toBe(5);
    expect(zone.growthPercentage).toBe(0);
    expect(zone.classification).toBe("Stable");
    expect(zone.clusterStatus).toBe("stable");
  });

  it("should apply area filter correctly", async () => {
    const startDate = new Date("2026-05-07");
    const endDate = new Date("2026-05-12");

    const mockDb = {
      query: {
        orders: {
          findMany: vi.fn().mockResolvedValueOnce([]),
        },
      },
    };

    const mockGetDb = vi.mocked(getDb);
    mockGetDb.mockResolvedValueOnce(mockDb as any);

    await analyzeSpatialDemandShift(startDate, endDate, "DN");

    // Verify that findMany was called with area filter
    expect(mockDb.query.orders.findMany).toHaveBeenCalled();
  });

  it("should generate temporal snapshots", async () => {
    const startDate = new Date("2026-05-07");
    const endDate = new Date("2026-05-12");
    const midpoint = new Date((startDate.getTime() + endDate.getTime()) / 2);

    const mockOrders = [
      {
        id: "1",
        customerLatitude: 42.9849,
        customerLongitude: -79.0204,
        createdAt: startDate.getTime() + 1000,
        status: "Delivered",
        area: "DN",
      },
      {
        id: "2",
        customerLatitude: 42.9849,
        customerLongitude: -79.0204,
        createdAt: midpoint.getTime() + 1000,
        status: "Delivered",
        area: "DN",
      },
    ];

    const mockDb = {
      query: {
        orders: {
          findMany: vi.fn().mockResolvedValueOnce(mockOrders),
        },
      },
    };

    const mockGetDb = vi.mocked(getDb);
    mockGetDb.mockResolvedValueOnce(mockDb as any);

    const result = await analyzeSpatialDemandShift(startDate, endDate);

    expect(result.success).toBe(true);
    expect(result.temporalSnapshots.length).toBeGreaterThan(0);
    expect(result.temporalSnapshots[0]).toHaveProperty("period");
    expect(result.temporalSnapshots[0]).toHaveProperty("density");
    expect(result.temporalSnapshots[0]).toHaveProperty("hotspotCount");
  });

  it("should generate spatial interpretation", async () => {
    const startDate = new Date("2026-05-07");
    const endDate = new Date("2026-05-12");
    const midpoint = new Date((startDate.getTime() + endDate.getTime()) / 2);

    // Create multiple zones with different classifications
    const mockOrders = [
      // Strong growth zone
      {
        id: "1",
        customerLatitude: 42.9849,
        customerLongitude: -79.0204,
        createdAt: startDate.getTime() + 1000,
        status: "Delivered",
        area: "DN",
      },
      {
        id: "2",
        customerLatitude: 42.9849,
        customerLongitude: -79.0204,
        createdAt: midpoint.getTime() + 1000,
        status: "Delivered",
        area: "DN",
      },
      {
        id: "3",
        customerLatitude: 42.9849,
        customerLongitude: -79.0204,
        createdAt: midpoint.getTime() + 2000,
        status: "Delivered",
        area: "DN",
      },
      // Declining zone
      {
        id: "4",
        customerLatitude: 43.0,
        customerLongitude: -79.1,
        createdAt: startDate.getTime() + 1000,
        status: "Delivered",
        area: "DN",
      },
      {
        id: "5",
        customerLatitude: 43.0,
        customerLongitude: -79.1,
        createdAt: startDate.getTime() + 2000,
        status: "Delivered",
        area: "DN",
      },
    ];

    const mockDb = {
      query: {
        orders: {
          findMany: vi.fn().mockResolvedValueOnce(mockOrders),
        },
      },
    };

    const mockGetDb = vi.mocked(getDb);
    mockGetDb.mockResolvedValueOnce(mockDb as any);

    const result = await analyzeSpatialDemandShift(startDate, endDate);

    expect(result.success).toBe(true);
    expect(result.spatialInterpretation).toBeTruthy();
    expect(result.spatialInterpretation.length).toBeGreaterThan(0);
  });

  it("should return top 10 zones sorted by density change", async () => {
    const startDate = new Date("2026-05-07");
    const endDate = new Date("2026-05-12");
    const midpoint = new Date((startDate.getTime() + endDate.getTime()) / 2);

    // Create orders in multiple locations
    const mockOrders = [];
    for (let i = 0; i < 15; i++) {
      const lat = 42.9849 + (i * 0.01);
      const lon = -79.0204 + (i * 0.01);

      // Previous period
      mockOrders.push({
        id: `prev-${i}`,
        customerLatitude: lat,
        customerLongitude: lon,
        createdAt: startDate.getTime() + 1000,
        status: "Delivered",
        area: "DN",
      });

      // Current period
      for (let j = 0; j < i + 1; j++) {
        mockOrders.push({
          id: `curr-${i}-${j}`,
          customerLatitude: lat,
          customerLongitude: lon,
          createdAt: midpoint.getTime() + 1000 + j * 100,
          status: "Delivered",
          area: "DN",
        });
      }
    }

    const mockDb = {
      query: {
        orders: {
          findMany: vi.fn().mockResolvedValueOnce(mockOrders),
        },
      },
    };

    const mockGetDb = vi.mocked(getDb);
    mockGetDb.mockResolvedValueOnce(mockDb as any);

    const result = await analyzeSpatialDemandShift(startDate, endDate);

    expect(result.success).toBe(true);
    expect(result.zones.length).toBeLessThanOrEqual(10);

    // Verify zones are sorted by density change (descending)
    for (let i = 0; i < result.zones.length - 1; i++) {
      const currentChange = Math.abs(result.zones[i].densityChange);
      const nextChange = Math.abs(result.zones[i + 1].densityChange);
      expect(currentChange).toBeGreaterThanOrEqual(nextChange);
    }
  });

  it("should handle orders with missing coordinates gracefully", async () => {
    const startDate = new Date("2026-05-07");
    const endDate = new Date("2026-05-12");

    const mockOrders = [
      {
        id: "1",
        customerLatitude: null,
        customerLongitude: null,
        createdAt: startDate.getTime() + 1000,
        status: "Delivered",
        area: "DN",
      },
      {
        id: "2",
        customerLatitude: 42.9849,
        customerLongitude: -79.0204,
        createdAt: startDate.getTime() + 2000,
        status: "Delivered",
        area: "DN",
      },
    ];

    const mockDb = {
      query: {
        orders: {
          findMany: vi.fn().mockResolvedValueOnce(mockOrders),
        },
      },
    };

    const mockGetDb = vi.mocked(getDb);
    mockGetDb.mockResolvedValueOnce(mockDb as any);

    const result = await analyzeSpatialDemandShift(startDate, endDate);

    expect(result.success).toBe(true);
    // Should only process the order with valid coordinates
    expect(result.zones.length).toBeGreaterThan(0);
  });

  it("should classify strong growth zones correctly (>50% growth)", async () => {
    const startDate = new Date("2026-05-07");
    const endDate = new Date("2026-05-12");
    const midpoint = new Date((startDate.getTime() + endDate.getTime()) / 2);

    // Create mock orders - 100% growth (strong)
    const mockOrders = [
      // Previous period: 10 orders
      ...Array.from({ length: 10 }, (_, i) => ({
        id: `prev-${i}`,
        customerLatitude: 42.9849,
        customerLongitude: -79.0204,
        createdAt: startDate.getTime() + i * 100,
        status: "Delivered",
        area: "DN",
      })),
      // Current period: 20 orders (100% growth)
      ...Array.from({ length: 20 }, (_, i) => ({
        id: `curr-${i}`,
        customerLatitude: 42.9849,
        customerLongitude: -79.0204,
        createdAt: midpoint.getTime() + i * 100,
        status: "Delivered",
        area: "DN",
      })),
    ];

    const mockDb = {
      query: {
        orders: {
          findMany: vi.fn().mockResolvedValueOnce(mockOrders),
        },
      },
    };

    const mockGetDb = vi.mocked(getDb);
    mockGetDb.mockResolvedValueOnce(mockDb as any);

    const result = await analyzeSpatialDemandShift(startDate, endDate);

    expect(result.success).toBe(true);
    expect(result.zones.length).toBeGreaterThan(0);

    const zone = result.zones[0];
    expect(zone.previousDensity).toBe(10);
    expect(zone.currentDensity).toBe(20);
    expect(zone.growthPercentage).toBe(100);
    expect(zone.classification).toBe("Strong Growth");
  });

  it("should classify moderate growth zones correctly (10-50% growth)", async () => {
    const startDate = new Date("2026-05-07");
    const endDate = new Date("2026-05-12");
    const midpoint = new Date((startDate.getTime() + endDate.getTime()) / 2);

    // Create mock orders - 20% growth (moderate)
    const mockOrders = [
      // Previous period: 10 orders
      ...Array.from({ length: 10 }, (_, i) => ({
        id: `prev-${i}`,
        customerLatitude: 42.9849,
        customerLongitude: -79.0204,
        createdAt: startDate.getTime() + i * 100,
        status: "Delivered",
        area: "DN",
      })),
      // Current period: 12 orders (20% growth)
      ...Array.from({ length: 12 }, (_, i) => ({
        id: `curr-${i}`,
        customerLatitude: 42.9849,
        customerLongitude: -79.0204,
        createdAt: midpoint.getTime() + i * 100,
        status: "Delivered",
        area: "DN",
      })),
    ];

    const mockDb = {
      query: {
        orders: {
          findMany: vi.fn().mockResolvedValueOnce(mockOrders),
        },
      },
    };

    const mockGetDb = vi.mocked(getDb);
    mockGetDb.mockResolvedValueOnce(mockDb as any);

    const result = await analyzeSpatialDemandShift(startDate, endDate);

    expect(result.success).toBe(true);
    expect(result.zones.length).toBeGreaterThan(0);

    const zone = result.zones[0];
    expect(zone.previousDensity).toBe(10);
    expect(zone.currentDensity).toBe(12);
    expect(zone.growthPercentage).toBe(20);
    expect(zone.classification).toBe("Moderate Growth");
  });

  it("should classify decline zones correctly (>10% decline)", async () => {
    const startDate = new Date("2026-05-07");
    const endDate = new Date("2026-05-12");
    const midpoint = new Date((startDate.getTime() + endDate.getTime()) / 2);

    // Create mock orders - 30% decline
    const mockOrders = [
      // Previous period: 10 orders
      ...Array.from({ length: 10 }, (_, i) => ({
        id: `prev-${i}`,
        customerLatitude: 42.9849,
        customerLongitude: -79.0204,
        createdAt: startDate.getTime() + i * 100,
        status: "Delivered",
        area: "DN",
      })),
      // Current period: 7 orders (30% decline)
      ...Array.from({ length: 7 }, (_, i) => ({
        id: `curr-${i}`,
        customerLatitude: 42.9849,
        customerLongitude: -79.0204,
        createdAt: midpoint.getTime() + i * 100,
        status: "Delivered",
        area: "DN",
      })),
    ];

    const mockDb = {
      query: {
        orders: {
          findMany: vi.fn().mockResolvedValueOnce(mockOrders),
        },
      },
    };

    const mockGetDb = vi.mocked(getDb);
    mockGetDb.mockResolvedValueOnce(mockDb as any);

    const result = await analyzeSpatialDemandShift(startDate, endDate);

    expect(result.success).toBe(true);
    expect(result.zones.length).toBeGreaterThan(0);

    const zone = result.zones[0];
    expect(zone.previousDensity).toBe(10);
    expect(zone.currentDensity).toBe(7);
    expect(zone.growthPercentage).toBe(-30);
    expect(zone.classification).toBe("Decline");
  });
});
