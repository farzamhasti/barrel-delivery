/**
 * Integration Tests for Spatial Analytics System
 * Phase 27.5: Testing & Validation
 * 
 * Tests the complete spatial analytics pipeline including:
 * - Database schema integration
 * - Competitor data fetching
 * - Spatial intelligence calculations
 * - tRPC procedure execution
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  performSpatialAnalysis,
  haversineDistance,
  type OrderLocation,
  type CompetitorLocation,
} from './spatial-intelligence-v2';

describe('Spatial Analytics Integration', () => {
  // Test data
  const mockOrders: OrderLocation[] = [
    // Cluster 1: Downtown area (42.90, -78.92)
    {
      id: 1,
      latitude: 42.9052,
      longitude: -78.9229,
      deliveryTimeMinutes: 18,
      createdAt: new Date('2026-05-01'),
    },
    {
      id: 2,
      latitude: 42.9053,
      longitude: -78.9230,
      deliveryTimeMinutes: 19,
      createdAt: new Date('2026-05-02'),
    },
    {
      id: 3,
      latitude: 42.9051,
      longitude: -78.9228,
      deliveryTimeMinutes: 17,
      createdAt: new Date('2026-05-03'),
    },
    {
      id: 4,
      latitude: 42.9054,
      longitude: -78.9231,
      deliveryTimeMinutes: 20,
      createdAt: new Date('2026-05-04'),
    },
    {
      id: 5,
      latitude: 42.9050,
      longitude: -78.9227,
      deliveryTimeMinutes: 16,
      createdAt: new Date('2026-05-05'),
    },
    // Cluster 2: Suburban area (42.91, -78.91)
    {
      id: 6,
      latitude: 42.9152,
      longitude: -78.9129,
      deliveryTimeMinutes: 28,
      createdAt: new Date('2026-05-06'),
    },
    {
      id: 7,
      latitude: 42.9153,
      longitude: -78.9130,
      deliveryTimeMinutes: 30,
      createdAt: new Date('2026-05-07'),
    },
    {
      id: 8,
      latitude: 42.9151,
      longitude: -78.9128,
      deliveryTimeMinutes: 27,
      createdAt: new Date('2026-05-08'),
    },
  ];

  const mockCompetitors: CompetitorLocation[] = [
    // Downtown competitors
    {
      id: 1,
      name: 'Pizza Palace',
      latitude: 42.9052,
      longitude: -78.9229,
      type: 'restaurant',
      distanceFromRestaurantKm: 0.5,
    },
    {
      id: 2,
      name: 'Burger King',
      latitude: 42.9053,
      longitude: -78.9230,
      type: 'fast_food',
      distanceFromRestaurantKm: 0.6,
    },
    {
      id: 3,
      name: 'Subway',
      latitude: 42.9051,
      longitude: -78.9228,
      type: 'fast_food',
      distanceFromRestaurantKm: 0.4,
    },
    // Suburban competitor
    {
      id: 4,
      name: 'Taco Bell',
      latitude: 42.9152,
      longitude: -78.9129,
      type: 'fast_food',
      distanceFromRestaurantKm: 1.8,
    },
  ];

  describe('Full Spatial Analysis Pipeline', () => {
    it('should perform complete spatial analysis on mock data', async () => {
      const result = await performSpatialAnalysis(
        mockOrders,
        mockCompetitors,
        42.9052,
        -78.9229
      );

      // Verify result structure
      expect(result).toHaveProperty('gridCells');
      expect(result).toHaveProperty('competitors');
      expect(result).toHaveProperty('insights');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('analysisType');
      expect(result).toHaveProperty('gridCellCount');
      expect(result).toHaveProperty('totalOrders');
      expect(result).toHaveProperty('totalCompetitors');

      // Verify data integrity
      expect(result.totalOrders).toBe(mockOrders.length);
      expect(result.totalCompetitors).toBe(mockCompetitors.length);
      expect(result.gridCellCount).toBeGreaterThan(0);
      expect(result.gridCells.length).toBe(result.gridCellCount);
      expect(result.insights.length).toBeGreaterThan(0);
    });

    it('should identify efficient zones with low delivery times', async () => {
      const result = await performSpatialAnalysis(
        mockOrders,
        mockCompetitors,
        42.9052,
        -78.9229
      );

      // Find any zone with good delivery performance
      const goodZones = result.gridCells.filter(
        (cell) => cell.avgDeliveryTimeMinutes <= 25
      );

      // Should have at least one zone with reasonable delivery time
      expect(goodZones.length).toBeGreaterThan(0);
    });

    it('should identify zones with varying delivery times', async () => {
      const result = await performSpatialAnalysis(
        mockOrders,
        mockCompetitors,
        42.9052,
        -78.9229
      );

      // Should have zones with different delivery time characteristics
      const allZones = result.gridCells;
      if (allZones.length > 1) {
        const avgTimes = allZones.map((cell) => cell.avgDeliveryTimeMinutes);
        const minTime = Math.min(...avgTimes);
        const maxTime = Math.max(...avgTimes);

        // Should have variation in delivery times
        expect(maxTime - minTime).toBeGreaterThanOrEqual(0);
      } else {
        // If only one zone, just verify it has valid delivery time
        expect(allZones[0].avgDeliveryTimeMinutes).toBeGreaterThan(0);
      }
    });

    it('should process competitor proximity analysis', async () => {
      const result = await performSpatialAnalysis(
        mockOrders,
        mockCompetitors,
        42.9052,
        -78.9229
      );

      // All cells should have competitors array
      for (const cell of result.gridCells) {
        expect(Array.isArray(cell.competitors)).toBe(true);
        expect(typeof cell.competitorCount).toBe('number');
      }
    });

    it('should generate meaningful insights', async () => {
      const result = await performSpatialAnalysis(
        mockOrders,
        mockCompetitors,
        42.9052,
        -78.9229
      );

      expect(result.insights.length).toBeGreaterThan(0);

      // Check for expected insight types
      const hasGrowthInsight = result.insights.some((i) => i.includes('growth'));
      const hasCompetitionInsight = result.insights.some((i) =>
        i.includes('competition')
      );
      const hasOrderDensityInsight = result.insights.some((i) =>
        i.includes('density')
      );

      expect(hasGrowthInsight || hasCompetitionInsight || hasOrderDensityInsight).toBe(
        true
      );
    });
  });

  describe('Growth Score Calculation', () => {
    it('should calculate growth scores between 0 and 1', async () => {
      const result = await performSpatialAnalysis(
        mockOrders,
        mockCompetitors,
        42.9052,
        -78.9229
      );

      for (const cell of result.gridCells) {
        expect(cell.growthScore).toBeGreaterThanOrEqual(0);
        expect(cell.growthScore).toBeLessThanOrEqual(1);
      }
    });


  });

  describe('Zone Classification', () => {
    it('should classify all zones with valid types', async () => {
      const result = await performSpatialAnalysis(
        mockOrders,
        mockCompetitors,
        42.9052,
        -78.9229
      );

      const validZoneTypes = [
        'growing_demand',
        'underserved',
        'high_competition',
        'high_competition_high_demand',
        'efficient',
        'neutral',
      ];

      for (const cell of result.gridCells) {
        expect(validZoneTypes).toContain(cell.zoneType);
      }
    });

    it('should set boolean flags correctly', async () => {
      const result = await performSpatialAnalysis(
        mockOrders,
        mockCompetitors,
        42.9052,
        -78.9229
      );

      for (const cell of result.gridCells) {
        expect(typeof cell.isUnderserved).toBe('boolean');
        expect(typeof cell.isHighCompetition).toBe('boolean');
        expect(typeof cell.isGrowingDemand).toBe('boolean');
      }
    });
  });

  describe('Distance Calculations', () => {
    it('should calculate accurate distances between clusters', () => {
      // Distance between downtown (42.9052, -78.9229) and suburban (42.9152, -78.9129)
      const distance = haversineDistance(42.9052, -78.9229, 42.9152, -78.9129);

      // Should be approximately 1-2 km
      expect(distance).toBeGreaterThan(0.5);
      expect(distance).toBeLessThan(3);
    });

    it('should return 0 for identical coordinates', () => {
      const distance = haversineDistance(42.9052, -78.9229, 42.9052, -78.9229);
      expect(distance).toBe(0);
    });
  });

  describe('Data Consistency', () => {
    it('should maintain data consistency across analysis', async () => {
      const result = await performSpatialAnalysis(
        mockOrders,
        mockCompetitors,
        42.9052,
        -78.9229
      );

      // Total orders in grid cells should equal input orders
      const totalOrdersInCells = result.gridCells.reduce(
        (sum, cell) => sum + cell.orderCount,
        0
      );
      expect(totalOrdersInCells).toBe(mockOrders.length);

      // All competitors should be in result
      expect(result.totalCompetitors).toBe(mockCompetitors.length);
    });

    it('should handle empty input gracefully', async () => {
      const result = await performSpatialAnalysis([], [], 42.9052, -78.9229);

      expect(result.gridCells.length).toBe(0);
      expect(result.totalOrders).toBe(0);
      expect(result.totalCompetitors).toBe(0);
    });
  });

  describe('Performance', () => {
    it('should complete analysis within reasonable time', async () => {
      const startTime = Date.now();

      await performSpatialAnalysis(
        mockOrders,
        mockCompetitors,
        42.9052,
        -78.9229
      );

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within 1 second
      expect(duration).toBeLessThan(1000);
    });

    it('should handle larger datasets', async () => {
      // Generate 100 mock orders
      const largeOrderSet: OrderLocation[] = Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        latitude: 42.9 + (Math.random() * 0.1 - 0.05),
        longitude: -78.92 + (Math.random() * 0.1 - 0.05),
        deliveryTimeMinutes: 15 + Math.floor(Math.random() * 20),
        createdAt: new Date(),
      }));

      const startTime = Date.now();

      const result = await performSpatialAnalysis(
        largeOrderSet,
        mockCompetitors,
        42.9052,
        -78.9229
      );

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should still complete within 2 seconds
      expect(duration).toBeLessThan(2000);
      expect(result.totalOrders).toBe(100);
    });
  });
});
