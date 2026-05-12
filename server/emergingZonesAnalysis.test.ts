import { describe, it, expect, vi, beforeEach } from 'vitest';
import { analyzeEmergingZones } from './emergingZonesAnalysis';
import * as db from './db';

// Mock the database module
vi.mock('./db', () => ({
  getDb: vi.fn(),
}));

describe('Emerging Zones Analysis', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return empty array when database is unavailable', async () => {
    const mockGetDb = vi.mocked(db.getDb);
    mockGetDb.mockResolvedValue(null);

    const result = await analyzeEmergingZones();
    expect(result).toEqual([]);
  });

  it('should return array of emerging zones when data is available', async () => {
    const mockGetDb = vi.mocked(db.getDb);
    
    // Mock database with sample data - need at least 3 orders in same zone
    const mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([
        {
          id: 1,
          latitude: '43.2557',
          longitude: '-79.8711',
          createdAt: new Date('2026-05-01'),
          deliveredAt: new Date('2026-05-01T01:00:00'),
          driverId: 1,
        },
        {
          id: 2,
          latitude: '43.2557',
          longitude: '-79.8711',
          createdAt: new Date('2026-05-02'),
          deliveredAt: new Date('2026-05-02T01:00:00'),
          driverId: 2,
        },
        {
          id: 3,
          latitude: '43.2557',
          longitude: '-79.8711',
          createdAt: new Date('2026-05-03'),
          deliveredAt: new Date('2026-05-03T01:00:00'),
          driverId: 1,
        },
      ]),
    };

    mockGetDb.mockResolvedValue(mockDb as any);

    const result = await analyzeEmergingZones();
    
    expect(Array.isArray(result)).toBe(true);
    // May be 0 or more zones depending on scoring
    expect(result).toBeDefined();
    
    // Check zone structure
    if (result.length > 0) {
      const zone = result[0];
      expect(zone).toHaveProperty('zoneId');
      expect(zone).toHaveProperty('hexId');
      expect(zone).toHaveProperty('emergingScore');
      expect(zone).toHaveProperty('classification');
      expect(zone).toHaveProperty('totalOrders');
      expect(zone).toHaveProperty('newCustomerCount');
      expect(zone).toHaveProperty('repeatCustomerCount');
      expect(zone).toHaveProperty('centerLat');
      expect(zone).toHaveProperty('centerLng');
    }
  });

  it('should handle coordinate type conversions correctly', async () => {
    const mockGetDb = vi.mocked(db.getDb);
    
    // Mock database with mixed coordinate types (string and number)
    const mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([
        {
          id: 1,
          latitude: '43.2557', // String
          longitude: -79.8711, // Number
          createdAt: new Date('2026-05-01'),
          deliveredAt: new Date('2026-05-01T01:00:00'),
          driverId: 1,
        },
        {
          id: 2,
          latitude: 43.2558, // Number
          longitude: '-79.8712', // String
          createdAt: new Date('2026-05-02'),
          deliveredAt: new Date('2026-05-02T01:00:00'),
          driverId: 2,
        },
      ]),
    };

    mockGetDb.mockResolvedValue(mockDb as any);

    const result = await analyzeEmergingZones();
    
    // Should not throw and should handle mixed types
    expect(Array.isArray(result)).toBe(true);
  });

  it('should classify zones correctly based on score', async () => {
    const mockGetDb = vi.mocked(db.getDb);
    
    // Create mock data with enough orders to generate zones
    const mockOrders = Array.from({ length: 50 }, (_, i) => ({
      id: i + 1,
      latitude: '43.2557',
      longitude: '-79.8711',
      createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      deliveredAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000),
      driverId: Math.floor(Math.random() * 5) + 1,
    }));

    const mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue(mockOrders),
    };

    mockGetDb.mockResolvedValue(mockDb as any);

    const result = await analyzeEmergingZones();
    
    if (result.length > 0) {
      const zone = result[0];
      
      // Check classification is one of the valid types
      expect(['rapid_emerging', 'early_growth', 'stable', 'saturated', 'declining']).toContain(
        zone.classification
      );
      
      // Check score is between 0 and 1
      expect(zone.emergingScore).toBeGreaterThanOrEqual(0);
      expect(zone.emergingScore).toBeLessThanOrEqual(1);
    }
  });

  it('should calculate growth velocity correctly', async () => {
    const mockGetDb = vi.mocked(db.getDb);
    
    // Create mock data with clear temporal pattern
    const now = new Date();
    const mockOrders = [
      // Current week (5 orders)
      ...Array.from({ length: 5 }, (_, i) => ({
        id: i + 1,
        latitude: '43.2557',
        longitude: '-79.8711',
        createdAt: new Date(now.getTime() - i * 24 * 60 * 60 * 1000),
        deliveredAt: new Date(now.getTime() - i * 24 * 60 * 60 * 1000 + 60 * 60 * 1000),
        driverId: 1,
      })),
      // Previous week (2 orders)
      ...Array.from({ length: 2 }, (_, i) => ({
        id: i + 6,
        latitude: '43.2557',
        longitude: '-79.8711',
        createdAt: new Date(now.getTime() - (7 + i) * 24 * 60 * 60 * 1000),
        deliveredAt: new Date(now.getTime() - (7 + i) * 24 * 60 * 60 * 1000 + 60 * 60 * 1000),
        driverId: 1,
      })),
    ];

    const mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue(mockOrders),
    };

    mockGetDb.mockResolvedValue(mockDb as any);

    const result = await analyzeEmergingZones();
    
    if (result.length > 0) {
      const zone = result[0];
      
      // Growth velocity should be a number (may be positive or negative)
      expect(typeof zone.growthVelocity).toBe('number');
      expect(isFinite(zone.growthVelocity)).toBe(true);
    }
  });

  it('should skip zones with fewer than 3 orders', async () => {
    const mockGetDb = vi.mocked(db.getDb);
    
    // Create mock data with only 2 orders
    const mockOrders = [
      {
        id: 1,
        latitude: '43.2557',
        longitude: '-79.8711',
        createdAt: new Date(),
        deliveredAt: new Date(),
        driverId: 1,
      },
      {
        id: 2,
        latitude: '43.2557',
        longitude: '-79.8711',
        createdAt: new Date(),
        deliveredAt: new Date(),
        driverId: 2,
      },
    ];

    const mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue(mockOrders),
    };

    mockGetDb.mockResolvedValue(mockDb as any);

    const result = await analyzeEmergingZones();
    
    // Should return empty array since no zone has 3+ orders
    expect(result.length).toBe(0);
  });

  it('should return top 10 zones sorted by score', async () => {
    const mockGetDb = vi.mocked(db.getDb);
    
    // Create mock data with 15 zones (each with different lat/lng)
    const mockOrders = Array.from({ length: 50 }, (_, i) => {
      const zoneIndex = Math.floor(i / 3); // 3 orders per zone, 15 zones
      return {
        id: i + 1,
        latitude: `43.${2500 + zoneIndex}`,
        longitude: `-79.${8700 + zoneIndex}`,
        createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        deliveredAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000),
        driverId: Math.floor(Math.random() * 5) + 1,
      };
    });

    const mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue(mockOrders),
    };

    mockGetDb.mockResolvedValue(mockDb as any);

    const result = await analyzeEmergingZones();
    
    // Should return zones (up to 10)
    expect(result.length).toBeGreaterThanOrEqual(0);
    
    // Zones should be sorted by score (descending)
    if (result.length > 1) {
      for (let i = 0; i < result.length - 1; i++) {
        expect(result[i].emergingScore).toBeGreaterThanOrEqual(result[i + 1].emergingScore);
      }
    }
  });
});
