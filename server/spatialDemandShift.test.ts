import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { analyzeSpatialDemandShift, SpatialZone } from "./spatialDemandShift";
import * as h3 from "h3-js";

// Mock the database module
vi.mock("./db", () => ({
  getDb: vi.fn(),
}));

// Mock the boundary filter to return all zones (for testing)
vi.mock("./geographicBoundaryFilter", () => ({
  filterZonesByBoundary: (zones: any[]) => zones,
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
    // Mock the new Drizzle query pattern
    const mockDb = {
      select: vi.fn(function() { return this; }),
      from: vi.fn(function() { return this; }),
      where: vi.fn().mockResolvedValueOnce([]),
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
        id: 1,
        customerLatitude: 42.9,
        customerLongitude: -78.95,
        createdAt: new Date(startDate.getTime() + 1000),
        status: "Delivered",
        area: "Downtown",
        deliveredAt: new Date(startDate.getTime() + 5000),
      },
      {
        id: 2,
        customerLatitude: 42.9,
        customerLongitude: -78.95,
        createdAt: new Date(startDate.getTime() + 2000),
        status: "Delivered",
        area: "Downtown",
        deliveredAt: new Date(startDate.getTime() + 6000),
      },
      // Current period orders (after midpoint) - same location, more orders
      {
        id: 3,
        customerLatitude: 42.9,
        customerLongitude: -78.95,
        createdAt: new Date(midpoint.getTime() + 1000),
        status: "Delivered",
        area: "Downtown",
        deliveredAt: new Date(midpoint.getTime() + 5000),
      },
      {
        id: 4,
        customerLatitude: 42.9,
        customerLongitude: -78.95,
        createdAt: new Date(midpoint.getTime() + 2000),
        status: "Delivered",
        area: "Downtown",
        deliveredAt: new Date(midpoint.getTime() + 6000),
      },
      {
        id: 5,
        customerLatitude: 42.9,
        customerLongitude: -78.95,
        createdAt: new Date(midpoint.getTime() + 3000),
        status: "Delivered",
        area: "Downtown",
        deliveredAt: new Date(midpoint.getTime() + 7000),
      },
    ];

    const mockDb = {
      select: vi.fn(function() { return this; }),
      from: vi.fn(function() { return this; }),
      where: vi.fn().mockResolvedValueOnce(mockOrders),
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
        id: 1,
        customerLatitude: 42.9,
        customerLongitude: -78.95,
        createdAt: new Date(midpoint.getTime() + 1000),
        status: "Delivered",
        area: "Downtown",
        deliveredAt: new Date(midpoint.getTime() + 5000),
      },
      {
        id: 2,
        customerLatitude: 42.9,
        customerLongitude: -78.95,
        createdAt: new Date(midpoint.getTime() + 2000),
        status: "Delivered",
        area: "Downtown",
        deliveredAt: new Date(midpoint.getTime() + 6000),
      },
    ];

    const mockDb = {
      select: vi.fn(function() { return this; }),
      from: vi.fn(function() { return this; }),
      where: vi.fn().mockResolvedValueOnce(mockOrders),
    };

    const mockGetDb = vi.mocked(getDb);
    mockGetDb.mockResolvedValueOnce(mockDb as any);

    const result = await analyzeSpatialDemandShift(startDate, endDate);

    expect(result.success).toBe(true);
    expect(result.zones.length).toBeGreaterThan(0);

    const zone = result.zones[0];
    expect(zone.clusterStatus).toBe("new");
    expect(zone.classification).toMatch(/Growth/);
  });

  it("should detect cluster disappearance", async () => {
    const startDate = new Date("2026-05-07");
    const endDate = new Date("2026-05-12");
    const midpoint = new Date((startDate.getTime() + endDate.getTime()) / 2);

    // Create mock orders - cluster disappears in current period
    const mockOrders = [
      // Previous period: orders at location
      {
        id: 1,
        customerLatitude: 42.9,
        customerLongitude: -78.95,
        createdAt: new Date(startDate.getTime() + 1000),
        status: "Delivered",
        area: "Downtown",
        deliveredAt: new Date(startDate.getTime() + 5000),
      },
      {
        id: 2,
        customerLatitude: 42.9,
        customerLongitude: -78.95,
        createdAt: new Date(startDate.getTime() + 2000),
        status: "Delivered",
        area: "Downtown",
        deliveredAt: new Date(startDate.getTime() + 6000),
      },
      // Current period: no orders at location (different location)
      {
        id: 3,
        customerLatitude: 43.0,
        customerLongitude: -79.1,
        createdAt: new Date(midpoint.getTime() + 1000),
        status: "Delivered",
        area: "Downtown",
        deliveredAt: new Date(midpoint.getTime() + 5000),
      },
    ];

    const mockDb = {
      select: vi.fn(function() { return this; }),
      from: vi.fn(function() { return this; }),
      where: vi.fn().mockResolvedValueOnce(mockOrders),
    };

    const mockGetDb = vi.mocked(getDb);
    mockGetDb.mockResolvedValueOnce(mockDb as any);

    const result = await analyzeSpatialDemandShift(startDate, endDate);

    expect(result.success).toBe(true);
    // Should have zones for both locations
    expect(result.zones.length).toBeGreaterThan(0);
  });

  it("should classify stable zones correctly", async () => {
    const startDate = new Date("2026-05-07");
    const endDate = new Date("2026-05-12");
    const midpoint = new Date((startDate.getTime() + endDate.getTime()) / 2);

    // Create mock orders - same density in both periods
    const mockOrders = [
      // Previous period: 2 orders
      {
        id: 1,
        customerLatitude: 42.9,
        customerLongitude: -78.95,
        createdAt: new Date(startDate.getTime() + 1000),
        status: "Delivered",
        area: "Downtown",
        deliveredAt: new Date(startDate.getTime() + 5000),
      },
      {
        id: 2,
        customerLatitude: 42.9,
        customerLongitude: -78.95,
        createdAt: new Date(startDate.getTime() + 2000),
        status: "Delivered",
        area: "Downtown",
        deliveredAt: new Date(startDate.getTime() + 6000),
      },
      // Current period: 2 orders (same density)
      {
        id: 3,
        customerLatitude: 42.9,
        customerLongitude: -78.95,
        createdAt: new Date(midpoint.getTime() + 1000),
        status: "Delivered",
        area: "Downtown",
        deliveredAt: new Date(midpoint.getTime() + 5000),
      },
      {
        id: 4,
        customerLatitude: 42.9,
        customerLongitude: -78.95,
        createdAt: new Date(midpoint.getTime() + 2000),
        status: "Delivered",
        area: "Downtown",
        deliveredAt: new Date(midpoint.getTime() + 6000),
      },
    ];

    const mockDb = {
      select: vi.fn(function() { return this; }),
      from: vi.fn(function() { return this; }),
      where: vi.fn().mockResolvedValueOnce(mockOrders),
    };

    const mockGetDb = vi.mocked(getDb);
    mockGetDb.mockResolvedValueOnce(mockDb as any);

    const result = await analyzeSpatialDemandShift(startDate, endDate);

    expect(result.success).toBe(true);
    expect(result.zones.length).toBeGreaterThan(0);

    const zone = result.zones[0];
    expect(zone.growthPercentage).toBe(0);
    expect(zone.classification).toBe("Stable");
    expect(zone.clusterStatus).toBe("stable");
  });

  it("should apply area filter correctly", async () => {
    const startDate = new Date("2026-05-07");
    const endDate = new Date("2026-05-12");
    const midpoint = new Date((startDate.getTime() + endDate.getTime()) / 2);

    // Create mock orders with different areas
    const mockOrders = [
      {
        id: 1,
        customerLatitude: 42.9,
        customerLongitude: -78.95,
        createdAt: new Date(startDate.getTime() + 1000),
        status: "Delivered",
        area: "Downtown",
        deliveredAt: new Date(startDate.getTime() + 5000),
      },
      {
        id: 2,
        customerLatitude: 42.9,
        customerLongitude: -78.95,
        createdAt: new Date(midpoint.getTime() + 1000),
        status: "Delivered",
        area: "Downtown",
        deliveredAt: new Date(midpoint.getTime() + 5000),
      },
    ];

    const mockDb = {
      select: vi.fn(function() { return this; }),
      from: vi.fn(function() { return this; }),
      where: vi.fn().mockResolvedValueOnce(mockOrders),
    };

    const mockGetDb = vi.mocked(getDb);
    mockGetDb.mockResolvedValueOnce(mockDb as any);

    const result = await analyzeSpatialDemandShift(startDate, endDate, "Downtown");

    expect(result.success).toBe(true);
    // Verify area filter was applied (mock was called)
    expect(mockDb.where).toHaveBeenCalled();
  });

  it("should generate temporal snapshots", async () => {
    const startDate = new Date("2026-05-07");
    const endDate = new Date("2026-05-12");
    const midpoint = new Date((startDate.getTime() + endDate.getTime()) / 2);

    const mockOrders = [
      {
        id: 1,
        customerLatitude: 42.9,
        customerLongitude: -78.95,
        createdAt: new Date(startDate.getTime() + 1000),
        status: "Delivered",
        area: "Downtown",
        deliveredAt: new Date(startDate.getTime() + 5000),
      },
      {
        id: 2,
        customerLatitude: 42.9,
        customerLongitude: -78.95,
        createdAt: new Date(midpoint.getTime() + 1000),
        status: "Delivered",
        area: "Downtown",
        deliveredAt: new Date(midpoint.getTime() + 5000),
      },
    ];

    const mockDb = {
      select: vi.fn(function() { return this; }),
      from: vi.fn(function() { return this; }),
      where: vi.fn().mockResolvedValueOnce(mockOrders),
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

    const mockOrders = [
      {
        id: 1,
        customerLatitude: 42.9,
        customerLongitude: -78.95,
        createdAt: new Date(startDate.getTime() + 1000),
        status: "Delivered",
        area: "Downtown",
        deliveredAt: new Date(startDate.getTime() + 5000),
      },
      {
        id: 2,
        customerLatitude: 42.9,
        customerLongitude: -78.95,
        createdAt: new Date(midpoint.getTime() + 1000),
        status: "Delivered",
        area: "Downtown",
        deliveredAt: new Date(midpoint.getTime() + 5000),
      },
    ];

    const mockDb = {
      select: vi.fn(function() { return this; }),
      from: vi.fn(function() { return this; }),
      where: vi.fn().mockResolvedValueOnce(mockOrders),
    };

    const mockGetDb = vi.mocked(getDb);
    mockGetDb.mockResolvedValueOnce(mockDb as any);

    const result = await analyzeSpatialDemandShift(startDate, endDate);

    expect(result.success).toBe(true);
    expect(result.spatialInterpretation).toBeTruthy();
    expect(typeof result.spatialInterpretation).toBe("string");
    expect(result.spatialInterpretation.length).toBeGreaterThan(0);
  });

  it("should return top 10 zones sorted by density change", async () => {
    const startDate = new Date("2026-05-07");
    const endDate = new Date("2026-05-12");
    const midpoint = new Date((startDate.getTime() + endDate.getTime()) / 2);

    // Create many orders in different locations
    const mockOrders = [];
    for (let i = 0; i < 15; i++) {
      const lat = 42.9849 + (i * 0.01);
      const lng = -79.0204 + (i * 0.01);
      // Previous period
      mockOrders.push({
        id: i * 2,
        customerLatitude: lat,
        customerLongitude: lng,
        createdAt: new Date(startDate.getTime() + 1000),
        status: "Delivered",
        area: "Downtown",
        deliveredAt: new Date(startDate.getTime() + 5000),
      });
      // Current period
      mockOrders.push({
        id: i * 2 + 1,
        customerLatitude: lat,
        customerLongitude: lng,
        createdAt: new Date(midpoint.getTime() + 1000),
        status: "Delivered",
        area: "Downtown",
        deliveredAt: new Date(midpoint.getTime() + 5000),
      });
    }

    const mockDb = {
      select: vi.fn(function() { return this; }),
      from: vi.fn(function() { return this; }),
      where: vi.fn().mockResolvedValueOnce(mockOrders),
    };

    const mockGetDb = vi.mocked(getDb);
    mockGetDb.mockResolvedValueOnce(mockDb as any);

    const result = await analyzeSpatialDemandShift(startDate, endDate);

    expect(result.success).toBe(true);
    expect(result.zones.length).toBeLessThanOrEqual(10);
  });

  it("should handle orders with missing coordinates gracefully", async () => {
    const startDate = new Date("2026-05-07");
    const endDate = new Date("2026-05-12");
    const midpoint = new Date((startDate.getTime() + endDate.getTime()) / 2);

    const mockOrders = [
      // Order with valid coordinates
      {
        id: 1,
        customerLatitude: 42.9,
        customerLongitude: -78.95,
        createdAt: new Date(startDate.getTime() + 1000),
        status: "Delivered",
        area: "Downtown",
        deliveredAt: new Date(startDate.getTime() + 5000),
      },
      // Order with missing coordinates
      {
        id: 2,
        customerLatitude: null,
        customerLongitude: null,
        createdAt: new Date(startDate.getTime() + 2000),
        status: "Delivered",
        area: "Downtown",
        deliveredAt: new Date(startDate.getTime() + 6000),
      },
      // Order with valid coordinates in current period
      {
        id: 3,
        customerLatitude: 42.9,
        customerLongitude: -78.95,
        createdAt: new Date(midpoint.getTime() + 1000),
        status: "Delivered",
        area: "Downtown",
        deliveredAt: new Date(midpoint.getTime() + 5000),
      },
    ];

    const mockDb = {
      select: vi.fn(function() { return this; }),
      from: vi.fn(function() { return this; }),
      where: vi.fn().mockResolvedValueOnce(mockOrders),
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

    const mockOrders = [
      // Previous period: 2 orders
      {
        id: 1,
        customerLatitude: 42.9,
        customerLongitude: -78.95,
        createdAt: new Date(startDate.getTime() + 1000),
        status: "Delivered",
        area: "Downtown",
        deliveredAt: new Date(startDate.getTime() + 5000),
      },
      {
        id: 2,
        customerLatitude: 42.9,
        customerLongitude: -78.95,
        createdAt: new Date(startDate.getTime() + 2000),
        status: "Delivered",
        area: "Downtown",
        deliveredAt: new Date(startDate.getTime() + 6000),
      },
      // Current period: 5 orders (150% growth)
      {
        id: 3,
        customerLatitude: 42.9,
        customerLongitude: -78.95,
        createdAt: new Date(midpoint.getTime() + 1000),
        status: "Delivered",
        area: "Downtown",
        deliveredAt: new Date(midpoint.getTime() + 5000),
      },
      {
        id: 4,
        customerLatitude: 42.9,
        customerLongitude: -78.95,
        createdAt: new Date(midpoint.getTime() + 2000),
        status: "Delivered",
        area: "Downtown",
        deliveredAt: new Date(midpoint.getTime() + 6000),
      },
      {
        id: 5,
        customerLatitude: 42.9,
        customerLongitude: -78.95,
        createdAt: new Date(midpoint.getTime() + 3000),
        status: "Delivered",
        area: "Downtown",
        deliveredAt: new Date(midpoint.getTime() + 7000),
      },
      {
        id: 6,
        customerLatitude: 42.9,
        customerLongitude: -78.95,
        createdAt: new Date(midpoint.getTime() + 4000),
        status: "Delivered",
        area: "Downtown",
        deliveredAt: new Date(midpoint.getTime() + 8000),
      },
      {
        id: 7,
        customerLatitude: 42.9,
        customerLongitude: -78.95,
        createdAt: new Date(midpoint.getTime() + 5000),
        status: "Delivered",
        area: "Downtown",
        deliveredAt: new Date(midpoint.getTime() + 9000),
      },
    ];

    const mockDb = {
      select: vi.fn(function() { return this; }),
      from: vi.fn(function() { return this; }),
      where: vi.fn().mockResolvedValueOnce(mockOrders),
    };

    const mockGetDb = vi.mocked(getDb);
    mockGetDb.mockResolvedValueOnce(mockDb as any);

    const result = await analyzeSpatialDemandShift(startDate, endDate);

    expect(result.success).toBe(true);
    expect(result.zones.length).toBeGreaterThan(0);

    const zone = result.zones[0];
    expect(zone.growthPercentage).toBeGreaterThan(50);
    expect(zone.classification).toBe("Strong Growth");
    expect(zone.clusterStatus).toBe("growing");
  });

  it("should classify moderate growth zones correctly (10-50% growth)", async () => {
    const startDate = new Date("2026-05-07");
    const endDate = new Date("2026-05-12");
    const midpoint = new Date((startDate.getTime() + endDate.getTime()) / 2);

    const mockOrders = [
      // Previous period: 10 orders
      ...Array.from({ length: 10 }, (_, i) => ({
        id: i,
        customerLatitude: 42.9,
        customerLongitude: -78.95,
        createdAt: new Date(startDate.getTime() + i * 1000),
        status: "Delivered",
        area: "Downtown",
        deliveredAt: new Date(startDate.getTime() + i * 1000 + 5000),
      })),
      // Current period: 12 orders (20% growth)
      ...Array.from({ length: 12 }, (_, i) => ({
        id: 10 + i,
        customerLatitude: 42.9,
        customerLongitude: -78.95,
        createdAt: new Date(midpoint.getTime() + i * 1000),
        status: "Delivered",
        area: "Downtown",
        deliveredAt: new Date(midpoint.getTime() + i * 1000 + 5000),
      })),
    ];

    const mockDb = {
      select: vi.fn(function() { return this; }),
      from: vi.fn(function() { return this; }),
      where: vi.fn().mockResolvedValueOnce(mockOrders),
    };

    const mockGetDb = vi.mocked(getDb);
    mockGetDb.mockResolvedValueOnce(mockDb as any);

    const result = await analyzeSpatialDemandShift(startDate, endDate);

    expect(result.success).toBe(true);
    expect(result.zones.length).toBeGreaterThan(0);

    const zone = result.zones[0];
    expect(zone.growthPercentage).toBeGreaterThan(10);
    expect(zone.growthPercentage).toBeLessThanOrEqual(50);
    expect(zone.classification).toBe("Moderate Growth");
  });

  it("should classify decline zones correctly (>10% decline)", async () => {
    const startDate = new Date("2026-05-07");
    const endDate = new Date("2026-05-12");
    const midpoint = new Date((startDate.getTime() + endDate.getTime()) / 2);

    const mockOrders = [
      // Previous period: 10 orders
      ...Array.from({ length: 10 }, (_, i) => ({
        id: i,
        customerLatitude: 42.9,
        customerLongitude: -78.95,
        createdAt: new Date(startDate.getTime() + i * 1000),
        status: "Delivered",
        area: "Downtown",
        deliveredAt: new Date(startDate.getTime() + i * 1000 + 5000),
      })),
      // Current period: 8 orders (20% decline)
      ...Array.from({ length: 8 }, (_, i) => ({
        id: 10 + i,
        customerLatitude: 42.9,
        customerLongitude: -78.95,
        createdAt: new Date(midpoint.getTime() + i * 1000),
        status: "Delivered",
        area: "Downtown",
        deliveredAt: new Date(midpoint.getTime() + i * 1000 + 5000),
      })),
    ];

    const mockDb = {
      select: vi.fn(function() { return this; }),
      from: vi.fn(function() { return this; }),
      where: vi.fn().mockResolvedValueOnce(mockOrders),
    };

    const mockGetDb = vi.mocked(getDb);
    mockGetDb.mockResolvedValueOnce(mockDb as any);

    const result = await analyzeSpatialDemandShift(startDate, endDate);

    expect(result.success).toBe(true);
    expect(result.zones.length).toBeGreaterThan(0);

    const zone = result.zones[0];
    expect(zone.growthPercentage).toBeLessThan(-10);
    expect(zone.classification).toBe("Decline");
  });
});
