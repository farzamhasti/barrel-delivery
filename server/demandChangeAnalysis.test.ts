import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { analyzeDemandChange } from './demandChangeAnalysis';
import * as geomarketing from './geomarketing';

// Mock the geomarketing module
vi.mock('./geomarketing', () => ({
  getOrdersWithCoordinates: vi.fn(),
}));

// Mock the geographicBoundaryFilter module
vi.mock('./geographicBoundaryFilter', () => ({
  isPointInBoundary: vi.fn((lon, lat) => {
    // Mock Fort Erie boundary - return true for coordinates within Fort Erie
    // Fort Erie is approximately: lat 42.85-42.95, lon -79.05 to -78.90
    const isInside = lat >= 42.85 && lat <= 42.95 && lon >= -79.05 && lon <= -78.90;
    return { isInside };
  }),
}));

describe('Demand Change Analysis', () => {
  it('should return empty zones when no orders exist', async () => {
    vi.mocked(geomarketing.getOrdersWithCoordinates).mockResolvedValue([]);

    const result = await analyzeDemandChange(
      new Date('2026-05-01'),
      new Date('2026-05-07'),
      new Date('2026-05-08'),
      new Date('2026-05-14')
    );

    expect(result.success).toBe(false);
    expect(result.zones).toHaveLength(0);
    expect(result.periodComparison.previousPeriod.totalOrders).toBe(0);
    expect(result.periodComparison.currentPeriod.totalOrders).toBe(0);
  });

  it('should filter orders to Fort Erie boundary only', async () => {
    const mockOrders = [
      {
        id: 1,
        orderNumber: 'ORD001',
        customerLatitude: 42.90,
        customerLongitude: -78.95,
        createdAt: new Date('2026-05-05'),
        readyAt: new Date('2026-05-05T00:15:00'),
        deliveredAt: new Date('2026-05-05T00:35:00'),
      },
      {
        id: 2,
        orderNumber: 'ORD002',
        customerLatitude: 43.10, // Outside Fort Erie
        customerLongitude: -78.80,
        createdAt: new Date('2026-05-05'),
        readyAt: new Date('2026-05-05T00:15:00'),
        deliveredAt: new Date('2026-05-05T00:35:00'),
      },
    ];

    vi.mocked(geomarketing.getOrdersWithCoordinates)
      .mockResolvedValueOnce(mockOrders)
      .mockResolvedValueOnce(mockOrders);

    const result = await analyzeDemandChange(
      new Date('2026-05-01'),
      new Date('2026-05-07'),
      new Date('2026-05-08'),
      new Date('2026-05-14')
    );

    expect(result.success).toBe(true);
    // Only 1 order should be included (the one within Fort Erie)
    expect(result.periodComparison.previousPeriod.totalOrders).toBe(1);
    expect(result.periodComparison.currentPeriod.totalOrders).toBe(1);
  });

  it('should classify zones based on growth percentage', async () => {
    const previousOrders = [
      {
        id: 1,
        orderNumber: 'ORD001',
        customerLatitude: 42.90,
        customerLongitude: -78.95,
        createdAt: new Date('2026-05-05'),
        readyAt: new Date('2026-05-05T00:15:00'),
        deliveredAt: new Date('2026-05-05T00:35:00'),
      },
    ];

    const currentOrders = [
      {
        id: 2,
        orderNumber: 'ORD002',
        customerLatitude: 42.90,
        customerLongitude: -78.95,
        createdAt: new Date('2026-05-10'),
        readyAt: new Date('2026-05-10T00:15:00'),
        deliveredAt: new Date('2026-05-10T00:35:00'),
      },
      {
        id: 3,
        orderNumber: 'ORD003',
        customerLatitude: 42.90,
        customerLongitude: -78.95,
        createdAt: new Date('2026-05-10'),
        readyAt: new Date('2026-05-10T00:15:00'),
        deliveredAt: new Date('2026-05-10T00:35:00'),
      },
    ];

    vi.mocked(geomarketing.getOrdersWithCoordinates)
      .mockResolvedValueOnce(previousOrders)
      .mockResolvedValueOnce(currentOrders);

    const result = await analyzeDemandChange(
      new Date('2026-05-01'),
      new Date('2026-05-07'),
      new Date('2026-05-08'),
      new Date('2026-05-14')
    );

    expect(result.success).toBe(true);
    expect(result.zones.length).toBeGreaterThan(0);

    const zone = result.zones[0];
    expect(zone.previousPeriodOrders).toBe(1);
    expect(zone.currentPeriodOrders).toBe(2);
    expect(zone.orderDensityChange).toBe(1);
    expect(zone.growthPercentage).toBe(100); // 100% growth
    expect(zone.classification).toBe('Strong Growth');
  });

  it('should calculate waiting and delivery time trends', async () => {
    const previousOrders = [
      {
        id: 1,
        orderNumber: 'ORD001',
        customerLatitude: 42.90,
        customerLongitude: -78.95,
        createdAt: new Date('2026-05-05T10:00:00'),
        readyAt: new Date('2026-05-05T10:10:00'), // 10 min wait
        deliveredAt: new Date('2026-05-05T10:30:00'), // 30 min total
      },
    ];

    const currentOrders = [
      {
        id: 2,
        orderNumber: 'ORD002',
        customerLatitude: 42.90,
        customerLongitude: -78.95,
        createdAt: new Date('2026-05-10T10:00:00'),
        readyAt: new Date('2026-05-10T10:15:00'), // 15 min wait (increase)
        deliveredAt: new Date('2026-05-10T10:40:00'), // 40 min total (increase)
      },
    ];

    vi.mocked(geomarketing.getOrdersWithCoordinates)
      .mockResolvedValueOnce(previousOrders)
      .mockResolvedValueOnce(currentOrders);

    const result = await analyzeDemandChange(
      new Date('2026-05-01'),
      new Date('2026-05-07'),
      new Date('2026-05-08'),
      new Date('2026-05-14')
    );

    expect(result.success).toBe(true);
    const zone = result.zones[0];

    expect(zone.avgWaitingTimePrevious).toBe(10);
    expect(zone.avgWaitingTimeCurrent).toBe(15);
    expect(zone.waitingTimeTrend).toBe(5); // Increased by 5 minutes

    expect(zone.avgDeliveryTimePrevious).toBe(30);
    expect(zone.avgDeliveryTimeCurrent).toBe(40);
    expect(zone.deliveryTimeTrend).toBe(10); // Increased by 10 minutes
  });

  it('should generate spatial interpretation', async () => {
    const mockOrders = [
      {
        id: 1,
        orderNumber: 'ORD001',
        customerLatitude: 42.90,
        customerLongitude: -78.95,
        createdAt: new Date('2026-05-05'),
        readyAt: new Date('2026-05-05T00:15:00'),
        deliveredAt: new Date('2026-05-05T00:35:00'),
      },
    ];

    vi.mocked(geomarketing.getOrdersWithCoordinates)
      .mockResolvedValueOnce(mockOrders)
      .mockResolvedValueOnce(mockOrders);

    const result = await analyzeDemandChange(
      new Date('2026-05-01'),
      new Date('2026-05-07'),
      new Date('2026-05-08'),
      new Date('2026-05-14')
    );

    expect(result.success).toBe(true);
    expect(result.spatialInterpretation).toBeDefined();
    expect(result.spatialInterpretation.length).toBeGreaterThan(0);
  });
});
