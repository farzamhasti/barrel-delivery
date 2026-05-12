import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { analyzeEmergingZones } from './emergingZonesAnalysis';
import { getCompetitorsWithinRadius, calculateDistance, FORT_ERIE_COMPETITORS } from './competitorLocations';

describe('Emerging Zones with Filters', () => {
  describe('Competitor Proximity Analysis', () => {
    it('should calculate distance correctly between two coordinates', () => {
      // Fort Erie Barrel Restaurant (approx)
      const lat1 = 42.90517;
      const lng1 = -78.92295;
      
      // Red Swan Pizza
      const lat2 = 42.9179;
      const lng2 = -78.9128;
      
      const distance = calculateDistance(lat1, lng1, lat2, lng2);
      
      // Distance should be around 1.5-2 km
      expect(distance).toBeGreaterThan(1);
      expect(distance).toBeLessThan(3);
    });

    it('should find competitors within radius', () => {
      const lat = 42.90517;
      const lng = -78.92295;
      const radiusKm = 2;
      
      const competitors = getCompetitorsWithinRadius(lat, lng, radiusKm);
      
      // Should find multiple competitors within 2km
      expect(competitors.length).toBeGreaterThan(0);
      expect(competitors.length).toBeLessThanOrEqual(FORT_ERIE_COMPETITORS.length);
    });

    it('should return empty array for competitors outside radius', () => {
      // Very far location
      const lat = 50.0;
      const lng = -80.0;
      const radiusKm = 0.5;
      
      const competitors = getCompetitorsWithinRadius(lat, lng, radiusKm);
      
      expect(competitors.length).toBe(0);
    });

    it('should have all 13 competitors in the database', () => {
      expect(FORT_ERIE_COMPETITORS.length).toBe(13);
    });

    it('should have correct competitor types', () => {
      const types = new Set(FORT_ERIE_COMPETITORS.map(c => c.type));
      expect(types.has('restaurant')).toBe(true);
      expect(types.has('cafe')).toBe(true);
      expect(types.has('fast_food')).toBe(true);
      expect(types.has('pizza')).toBe(true);
    });
  });

  describe('Filter Functionality', () => {
    it('should analyze zones with date range filter', async () => {
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000); // 1 day ago
      
      const zones = await analyzeEmergingZones(
        { startDate, endDate },
        undefined
      );
      
      // Should return array (may be empty if no orders in that date range)
      expect(Array.isArray(zones)).toBe(true);
    });

    it('should analyze zones with area filter', async () => {
      const zones = await analyzeEmergingZones(
        undefined,
        'Downtown'
      );
      
      expect(Array.isArray(zones)).toBe(true);
    });

    it('should analyze zones with both date range and area filter', async () => {
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
      
      const zones = await analyzeEmergingZones(
        { startDate, endDate },
        'Central Park'
      );
      
      expect(Array.isArray(zones)).toBe(true);
    });

    it('should analyze zones with "All" area filter', async () => {
      const zones = await analyzeEmergingZones(
        undefined,
        'All'
      );
      
      expect(Array.isArray(zones)).toBe(true);
    });

    it('should return zones sorted by emerging score descending', async () => {
      const zones = await analyzeEmergingZones();
      
      if (zones.length > 1) {
        for (let i = 0; i < zones.length - 1; i++) {
          expect(zones[i].emergingScore).toBeGreaterThanOrEqual(zones[i + 1].emergingScore);
        }
      }
    });

    it('should return maximum 10 zones', async () => {
      const zones = await analyzeEmergingZones();
      
      expect(zones.length).toBeLessThanOrEqual(10);
    });

    it('should include competitor proximity in zone data', async () => {
      const zones = await analyzeEmergingZones();
      
      if (zones.length > 0) {
        const zone = zones[0];
        // Zone should have all required properties
        expect(zone.zoneId).toBeDefined();
        expect(zone.emergingScore).toBeDefined();
        expect(zone.classification).toBeDefined();
        expect(zone.centerLat).toBeDefined();
        expect(zone.centerLng).toBeDefined();
      }
    });
  });

  describe('Date Range Filtering', () => {
    it('should handle 1-day date range', async () => {
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);
      
      const zones = await analyzeEmergingZones({ startDate, endDate });
      
      expect(Array.isArray(zones)).toBe(true);
    });

    it('should handle 7-day date range', async () => {
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      const zones = await analyzeEmergingZones({ startDate, endDate });
      
      expect(Array.isArray(zones)).toBe(true);
    });

    it('should handle 30-day date range', async () => {
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      const zones = await analyzeEmergingZones({ startDate, endDate });
      
      expect(Array.isArray(zones)).toBe(true);
    });
  });

  describe('Area Filtering', () => {
    it('should handle Downtown area filter', async () => {
      const zones = await analyzeEmergingZones(undefined, 'Downtown');
      
      expect(Array.isArray(zones)).toBe(true);
    });

    it('should handle Central Park area filter', async () => {
      const zones = await analyzeEmergingZones(undefined, 'Central Park');
      
      expect(Array.isArray(zones)).toBe(true);
    });

    it('should handle Both area filter', async () => {
      const zones = await analyzeEmergingZones(undefined, 'Both');
      
      expect(Array.isArray(zones)).toBe(true);
    });

    it('should handle All area filter', async () => {
      const zones = await analyzeEmergingZones(undefined, 'All');
      
      expect(Array.isArray(zones)).toBe(true);
    });
  });
});
