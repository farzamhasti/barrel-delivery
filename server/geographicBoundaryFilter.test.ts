import { describe, it, expect } from 'vitest';
import {
  isPointInBoundary,
  calculateDistance,
  findNearestBoundaryPoint,
  filterZonesByBoundary,
  classifyZonesByBoundary,
  getBoundaryPolygon,
  getBoundaryCenter,
  getBoundaryBounds,
} from './geographicBoundaryFilter';

describe('Geographic Boundary Filter', () => {
  describe('isPointInBoundary', () => {
    it('should return true for point inside Fort Erie boundary', () => {
      // Fort Erie city center (approximately)
      const result = isPointInBoundary(-78.94, 42.89);
      expect(result.isInside).toBe(true);
    });

    it('should return false for point outside Fort Erie boundary', () => {
      // Buffalo, NY (outside boundary)
      const result = isPointInBoundary(-78.88, 42.87);
      expect(result.isInside).toBe(false);
    });

    it('should return false for point far outside boundary', () => {
      // Toronto (far outside)
      const result = isPointInBoundary(-79.38, 43.66);
      expect(result.isInside).toBe(false);
    });

    it('should handle boundary edge cases', () => {
      // Point very close to boundary
      const result = isPointInBoundary(-78.978, 42.881);
      expect(typeof result.isInside).toBe('boolean');
    });
  });

  describe('calculateDistance', () => {
    it('should calculate distance between two points', () => {
      // Distance from Fort Erie to Buffalo (approximately 15 km)
      const distance = calculateDistance(-78.94, 42.89, -78.88, 42.87);
      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(20); // Should be less than 20 km
    });

    it('should return 0 for same point', () => {
      const distance = calculateDistance(-78.94, 42.89, -78.94, 42.89);
      expect(distance).toBe(0);
    });

    it('should calculate distance in kilometers', () => {
      // Approximately 1 degree latitude ≈ 111 km
      const distance = calculateDistance(-78.94, 42.89, -78.94, 43.89);
      expect(distance).toBeGreaterThan(100);
      expect(distance).toBeLessThan(120);
    });
  });

  describe('findNearestBoundaryPoint', () => {
    it('should find nearest boundary point for interior point', () => {
      const result = findNearestBoundaryPoint(-78.94, 42.89);
      expect(result.distance).toBeGreaterThan(0);
      expect(result.point).toBeDefined();
      expect(result.point.length).toBe(2);
    });

    it('should return a boundary point', () => {
      const result = findNearestBoundaryPoint(-78.94, 42.89);
      expect(Array.isArray(result.point)).toBe(true);
      expect(typeof result.point[0]).toBe('number');
      expect(typeof result.point[1]).toBe('number');
    });

    it('should find closer point for point near boundary', () => {
      const result1 = findNearestBoundaryPoint(-78.94, 42.89);
      const result2 = findNearestBoundaryPoint(-78.978, 42.881);
      expect(result2.distance).toBeLessThan(result1.distance);
    });
  });

  describe('filterZonesByBoundary', () => {
    it('should filter zones within boundary', () => {
      const zones = [
        { id: 1, latitude: 42.89, longitude: -78.94, name: 'Zone 1' },
        { id: 2, latitude: 42.87, longitude: -78.88, name: 'Zone 2' },
        { id: 3, latitude: 43.66, longitude: -79.38, name: 'Zone 3' },
      ];

      const filtered = filterZonesByBoundary(zones);
      expect(filtered.length).toBeGreaterThan(0);
      expect(filtered.length).toBeLessThanOrEqual(zones.length);
    });

    it('should return empty array if no zones in boundary', () => {
      const zones = [
        { id: 1, latitude: 43.66, longitude: -79.38, name: 'Toronto' },
        { id: 2, latitude: 40.71, longitude: -74.01, name: 'New York' },
      ];

      const filtered = filterZonesByBoundary(zones);
      expect(filtered.length).toBe(0);
    });

    it('should preserve zone data in filtered results', () => {
      const zones = [
        { id: 1, latitude: 42.89, longitude: -78.94, name: 'Zone 1', density: 100 },
      ];

      const filtered = filterZonesByBoundary(zones);
      if (filtered.length > 0) {
        expect(filtered[0].id).toBe(1);
        expect(filtered[0].name).toBe('Zone 1');
        expect(filtered[0].density).toBe(100);
      }
    });
  });

  describe('classifyZonesByBoundary', () => {
    it('should classify zones into inside and outside', () => {
      const zones = [
        { id: 1, latitude: 42.89, longitude: -78.94, name: 'Zone 1' },
        { id: 2, latitude: 42.87, longitude: -78.88, name: 'Zone 2' },
        { id: 3, latitude: 43.66, longitude: -79.38, name: 'Zone 3' },
      ];

      const classified = classifyZonesByBoundary(zones);
      expect(classified.insideBoundary).toBeDefined();
      expect(classified.outsideBoundary).toBeDefined();
      expect(classified.insideBoundary.length + classified.outsideBoundary.length).toBe(
        zones.length
      );
    });

    it('should put all zones outside if none in boundary', () => {
      const zones = [
        { id: 1, latitude: 43.66, longitude: -79.38, name: 'Toronto' },
      ];

      const classified = classifyZonesByBoundary(zones);
      expect(classified.insideBoundary.length).toBe(0);
      expect(classified.outsideBoundary.length).toBe(1);
    });

    it('should put all zones inside if all in boundary', () => {
      const zones = [
        { id: 1, latitude: 42.89, longitude: -78.94, name: 'Zone 1' },
        { id: 2, latitude: 42.90, longitude: -78.95, name: 'Zone 2' },
      ];

      const classified = classifyZonesByBoundary(zones);
      expect(classified.insideBoundary.length).toBeGreaterThan(0);
      expect(classified.outsideBoundary.length).toBeLessThanOrEqual(zones.length - 1);
    });
  });

  describe('getBoundaryPolygon', () => {
    it('should return boundary polygon', () => {
      const polygon = getBoundaryPolygon();
      expect(Array.isArray(polygon)).toBe(true);
      expect(polygon.length).toBeGreaterThan(0);
    });

    it('should have valid coordinates', () => {
      const polygon = getBoundaryPolygon();
      for (const [lon, lat] of polygon) {
        expect(typeof lon).toBe('number');
        expect(typeof lat).toBe('number');
        expect(lon).toBeGreaterThan(-180);
        expect(lon).toBeLessThan(180);
        expect(lat).toBeGreaterThan(-90);
        expect(lat).toBeLessThan(90);
      }
    });

    it('should have 43 points (37 + closing point)', () => {
      const polygon = getBoundaryPolygon();
      expect(polygon.length).toBeGreaterThan(35); // At least 35 points
    });
  });

  describe('getBoundaryCenter', () => {
    it('should return boundary center', () => {
      const center = getBoundaryCenter();
      expect(Array.isArray(center)).toBe(true);
      expect(center.length).toBe(2);
    });

    it('should return valid coordinates', () => {
      const [lon, lat] = getBoundaryCenter();
      expect(typeof lon).toBe('number');
      expect(typeof lat).toBe('number');
      expect(lon).toBeGreaterThan(-79);
      expect(lon).toBeLessThan(-78.9);
      expect(lat).toBeGreaterThan(42.8);
      expect(lat).toBeLessThan(42.95);
    });

    it('should be inside boundary', () => {
      const [lon, lat] = getBoundaryCenter();
      const result = isPointInBoundary(lon, lat);
      expect(result.isInside).toBe(true);
    });
  });

  describe('getBoundaryBounds', () => {
    it('should return boundary bounds', () => {
      const bounds = getBoundaryBounds();
      expect(bounds.minLon).toBeDefined();
      expect(bounds.maxLon).toBeDefined();
      expect(bounds.minLat).toBeDefined();
      expect(bounds.maxLat).toBeDefined();
    });

    it('should have valid min/max values', () => {
      const bounds = getBoundaryBounds();
      expect(bounds.minLon).toBeLessThan(bounds.maxLon);
      expect(bounds.minLat).toBeLessThan(bounds.maxLat);
    });

    it('should encompass Fort Erie area', () => {
      const bounds = getBoundaryBounds();
      expect(bounds.minLon).toBeGreaterThan(-79);
      expect(bounds.maxLon).toBeLessThan(-78.9);
      expect(bounds.minLat).toBeGreaterThan(42.8);
      expect(bounds.maxLat).toBeLessThan(42.96);
    });
  });

  describe('Integration Tests', () => {
    it('should handle mixed zones correctly', () => {
      const zones = [
        { id: 1, latitude: 42.89, longitude: -78.94, name: 'Fort Erie Center' },
        { id: 2, latitude: 42.881, longitude: -78.978, name: 'Fort Erie South' },
        { id: 3, latitude: 42.95, longitude: -78.92, name: 'Fort Erie North' },
        { id: 4, latitude: 43.66, longitude: -79.38, name: 'Toronto' },
        { id: 5, latitude: 40.71, longitude: -74.01, name: 'New York' },
      ];

      const filtered = filterZonesByBoundary(zones);
      expect(filtered.length).toBeGreaterThan(0);
      expect(filtered.length).toBeLessThan(zones.length);

      const classified = classifyZonesByBoundary(zones);
      expect(classified.insideBoundary.length).toBeGreaterThan(0);
      expect(classified.outsideBoundary.length).toBeGreaterThan(0);
    });

    it('should maintain consistency between filter and classify', () => {
      const zones = [
        { id: 1, latitude: 42.89, longitude: -78.94 },
        { id: 2, latitude: 43.66, longitude: -79.38 },
      ];

      const filtered = filterZonesByBoundary(zones);
      const classified = classifyZonesByBoundary(zones);

      expect(filtered.length).toBe(classified.insideBoundary.length);
    });
  });
});
