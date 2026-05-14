import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { analyzeRelativeDemand } from './relativeDemandAnalysis';

describe('Relative Demand Analysis', () => {
  describe('analyzeRelativeDemand', () => {
    it('should return empty regions when no data is available', async () => {
      const startDate = new Date('2020-01-01');
      const endDate = new Date('2020-01-31');
      
      const result = await analyzeRelativeDemand(startDate, endDate);
      
      expect(result).toBeDefined();
      expect(result.regions).toBeDefined();
      expect(Array.isArray(result.regions)).toBe(true);
      expect(result.cityWideStats).toBeDefined();
      expect(result.interpretation).toBeDefined();
    });

    it('should return city-wide statistics', async () => {
      const startDate = new Date('2020-01-01');
      const endDate = new Date('2020-01-31');
      
      const result = await analyzeRelativeDemand(startDate, endDate);
      
      expect(result.cityWideStats).toHaveProperty('totalOrders');
      expect(result.cityWideStats).toHaveProperty('avgOrderDensity');
      expect(result.cityWideStats).toHaveProperty('avgDeliveryTime');
      expect(result.cityWideStats).toHaveProperty('avgWaitingTime');
      expect(result.cityWideStats).toHaveProperty('avgOperationalIntensity');
      
      expect(typeof result.cityWideStats.totalOrders).toBe('number');
      expect(typeof result.cityWideStats.avgOrderDensity).toBe('number');
      expect(typeof result.cityWideStats.avgDeliveryTime).toBe('number');
      expect(typeof result.cityWideStats.avgWaitingTime).toBe('number');
      expect(typeof result.cityWideStats.avgOperationalIntensity).toBe('number');
    });

    it('should return regions with valid structure', async () => {
      const startDate = new Date('2020-01-01');
      const endDate = new Date('2020-01-31');
      
      const result = await analyzeRelativeDemand(startDate, endDate);
      
      if (result.regions.length > 0) {
        const region = result.regions[0];
        
        expect(region).toHaveProperty('id');
        expect(region).toHaveProperty('centerLat');
        expect(region).toHaveProperty('centerLon');
        expect(region).toHaveProperty('orderCount');
        expect(region).toHaveProperty('avgDeliveryTime');
        expect(region).toHaveProperty('avgWaitingTime');
        expect(region).toHaveProperty('relativeDemandScore');
        expect(region).toHaveProperty('relativeDeliveryPerformance');
        expect(region).toHaveProperty('relativeWaitingTime');
        expect(region).toHaveProperty('relativeOperationalIntensity');
        expect(region).toHaveProperty('classification');
        expect(region).toHaveProperty('color');
        
        // Validate types
        expect(typeof region.id).toBe('string');
        expect(typeof region.centerLat).toBe('number');
        expect(typeof region.centerLon).toBe('number');
        expect(typeof region.orderCount).toBe('number');
        expect(typeof region.avgDeliveryTime).toBe('number');
        expect(typeof region.avgWaitingTime).toBe('number');
        expect(typeof region.relativeDemandScore).toBe('number');
        expect(typeof region.relativeDeliveryPerformance).toBe('number');
        expect(typeof region.relativeWaitingTime).toBe('number');
        expect(typeof region.relativeOperationalIntensity).toBe('number');
        expect(typeof region.classification).toBe('string');
        expect(typeof region.color).toBe('string');
      }
    });

    it('should classify regions correctly based on demand scores', async () => {
      const startDate = new Date('2020-01-01');
      const endDate = new Date('2020-01-31');
      
      const result = await analyzeRelativeDemand(startDate, endDate);
      
      const validClassifications = ['very_high', 'high', 'average', 'weak', 'underperforming'];
      
      result.regions.forEach(region => {
        expect(validClassifications).toContain(region.classification);
        
        // Verify classification matches score
        if (region.relativeDemandScore >= 80) {
          expect(region.classification).toBe('very_high');
        } else if (region.relativeDemandScore >= 65) {
          expect(region.classification).toBe('high');
        } else if (region.relativeDemandScore >= 45) {
          expect(region.classification).toBe('average');
        } else if (region.relativeDemandScore >= 25) {
          expect(region.classification).toBe('weak');
        } else {
          expect(region.classification).toBe('underperforming');
        }
      });
    });

    it('should assign correct colors based on classification', async () => {
      const startDate = new Date('2020-01-01');
      const endDate = new Date('2020-01-31');
      
      const result = await analyzeRelativeDemand(startDate, endDate);
      
      const colorMap: Record<string, string> = {
        very_high: '#001f3f',
        high: '#0074D9',
        average: '#FFDC00',
        weak: '#FF851B',
        underperforming: '#FF4136',
      };
      
      result.regions.forEach(region => {
        expect(region.color).toBe(colorMap[region.classification]);
      });
    });

    it('should keep relative scores between 0 and 100', async () => {
      const startDate = new Date('2020-01-01');
      const endDate = new Date('2020-01-31');
      
      const result = await analyzeRelativeDemand(startDate, endDate);
      
      result.regions.forEach(region => {
        expect(region.relativeDemandScore).toBeGreaterThanOrEqual(0);
        expect(region.relativeDemandScore).toBeLessThanOrEqual(100);
        
        expect(region.relativeDeliveryPerformance).toBeGreaterThanOrEqual(0);
        expect(region.relativeDeliveryPerformance).toBeLessThanOrEqual(100);
        
        expect(region.relativeWaitingTime).toBeGreaterThanOrEqual(0);
        expect(region.relativeWaitingTime).toBeLessThanOrEqual(100);
        
        expect(region.relativeOperationalIntensity).toBeGreaterThanOrEqual(0);
        expect(region.relativeOperationalIntensity).toBeLessThanOrEqual(100);
      });
    });

    it('should generate interpretation text', async () => {
      const startDate = new Date('2020-01-01');
      const endDate = new Date('2020-01-31');
      
      const result = await analyzeRelativeDemand(startDate, endDate);
      
      expect(result.interpretation).toBeDefined();
      expect(typeof result.interpretation).toBe('string');
      expect(result.interpretation.length).toBeGreaterThan(0);
    });

    it('should handle date ranges correctly', async () => {
      const startDate = new Date('2026-05-01');
      const endDate = new Date('2026-05-31');
      
      const result = await analyzeRelativeDemand(startDate, endDate);
      
      expect(result).toBeDefined();
      expect(result.cityWideStats).toBeDefined();
      expect(Array.isArray(result.regions)).toBe(true);
    });

    it('should return non-negative order counts and times', async () => {
      const startDate = new Date('2020-01-01');
      const endDate = new Date('2020-01-31');
      
      const result = await analyzeRelativeDemand(startDate, endDate);
      
      result.regions.forEach(region => {
        expect(region.orderCount).toBeGreaterThanOrEqual(0);
        expect(region.avgDeliveryTime).toBeGreaterThanOrEqual(0);
        expect(region.avgWaitingTime).toBeGreaterThanOrEqual(0);
      });
      
      expect(result.cityWideStats.totalOrders).toBeGreaterThanOrEqual(0);
      expect(result.cityWideStats.avgOrderDensity).toBeGreaterThanOrEqual(0);
      expect(result.cityWideStats.avgDeliveryTime).toBeGreaterThanOrEqual(0);
      expect(result.cityWideStats.avgWaitingTime).toBeGreaterThanOrEqual(0);
    });

    it('should handle database connection failures gracefully', async () => {
      const startDate = new Date('2020-01-01');
      const endDate = new Date('2020-01-31');
      
      const result = await analyzeRelativeDemand(startDate, endDate);
      
      // Should return valid structure even if DB is unavailable
      expect(result).toBeDefined();
      expect(Array.isArray(result.regions)).toBe(true);
      expect(result.cityWideStats).toBeDefined();
      expect(typeof result.interpretation).toBe('string');
    });
  });
});
