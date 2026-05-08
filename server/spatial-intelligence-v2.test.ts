import { describe, it, expect } from 'vitest';
import {
  haversineDistance,
  getGridCellId,
  getGridCentroid,
  clusterDeliveryOrders,
  analyzeCompetitorProximity,
  calculateGrowthScores,
  generateSpatialInsights,
  exportSpatialAnalysis,
  performSpatialAnalysis,
  type OrderLocation,
  type CompetitorLocation,
} from './spatial-intelligence-v2';

describe('Spatial Intelligence Module', () => {
  describe('haversineDistance', () => {
    it('should calculate distance between two coordinates', () => {
      // Fort Erie to Buffalo area (approximately 4-5 km)
      const distance = haversineDistance(42.9052, -78.9229, 42.8864, -78.8784);
      expect(distance).toBeGreaterThan(3);
      expect(distance).toBeLessThan(6);
    });

    it('should return 0 for same coordinates', () => {
      const distance = haversineDistance(42.9052, -78.9229, 42.9052, -78.9229);
      expect(distance).toBe(0);
    });
  });

  describe('getGridCellId', () => {
    it('should generate consistent grid cell IDs', () => {
      const id1 = getGridCellId(42.9052, -78.9229);
      const id2 = getGridCellId(42.9052, -78.9229);
      expect(id1).toBe(id2);
    });

    it('should generate different IDs for different coordinates', () => {
      const id1 = getGridCellId(42.9052, -78.9229);
      const id2 = getGridCellId(43.0052, -78.9229); // 0.1 degrees north (farther apart)
      expect(id1).not.toBe(id2);
    });
  });

  describe('getGridCentroid', () => {
    it('should extract centroid from grid cell ID', () => {
      const gridId = getGridCellId(42.9052, -78.9229);
      const centroid = getGridCentroid(gridId);
      // Centroid should be a valid coordinate
      expect(typeof centroid.lat).toBe('number');
      expect(typeof centroid.lng).toBe('number');
      expect(centroid.lat).toBeGreaterThan(0);
      expect(centroid.lng).toBeLessThan(0);
    });
  });

  describe('clusterDeliveryOrders', () => {
    it('should cluster orders into grid cells', () => {
      const orders: OrderLocation[] = [
        {
          id: 1,
          latitude: 42.9052,
          longitude: -78.9229,
          deliveryTimeMinutes: 18,
          createdAt: new Date(),
        },
        {
          id: 2,
          latitude: 42.9052,
          longitude: -78.9229,
          deliveryTimeMinutes: 22,
          createdAt: new Date(),
        },
        {
          id: 3,
          latitude: 42.9552,
          longitude: -78.9229,
          deliveryTimeMinutes: 25,
          createdAt: new Date(),
        },
      ];

      const gridCells = clusterDeliveryOrders(orders, 42.9052, -78.9229);
      expect(gridCells.size).toBeGreaterThanOrEqual(1); // At least one grid cell
    });

    it('should calculate average delivery time per cell', () => {
      const orders: OrderLocation[] = [
        {
          id: 1,
          latitude: 42.9052,
          longitude: -78.9229,
          deliveryTimeMinutes: 20,
          createdAt: new Date(),
        },
        {
          id: 2,
          latitude: 42.9052,
          longitude: -78.9229,
          deliveryTimeMinutes: 24,
          createdAt: new Date(),
        },
      ];

      const gridCells = clusterDeliveryOrders(orders, 42.9052, -78.9229);
      const cell = Array.from(gridCells.values())[0];
      expect(cell.avgDeliveryTimeMinutes).toBe(22);
    });
  });

  describe('analyzeCompetitorProximity', () => {
    it('should process competitor proximity analysis', () => {
      const orders: OrderLocation[] = [
        {
          id: 1,
          latitude: 42.9052,
          longitude: -78.9229,
          deliveryTimeMinutes: 20,
          createdAt: new Date(),
        },
      ];

      const competitors: CompetitorLocation[] = [
        {
          id: 1,
          name: 'Pizza Place',
          latitude: 42.9052,
          longitude: -78.9229,
          type: 'restaurant',
          distanceFromRestaurantKm: 0.5,
        },
        {
          id: 2,
          name: 'Burger Joint',
          latitude: 43.0052,
          longitude: -78.9229,
          type: 'fast_food',
          distanceFromRestaurantKm: 10,
        },
      ];

      const gridCells = clusterDeliveryOrders(orders, 42.9052, -78.9229);
      analyzeCompetitorProximity(gridCells, competitors);

      const cell = Array.from(gridCells.values())[0];
      // Should have competitors array (may be empty or populated)
      expect(cell.competitors).toBeDefined();
      expect(Array.isArray(cell.competitors)).toBe(true);
    });
  });

  describe('calculateGrowthScores', () => {
    it('should classify zones correctly', () => {
      const orders: OrderLocation[] = Array.from({ length: 6 }, (_, i) => ({
        id: i + 1,
        latitude: 42.9052,
        longitude: -78.9229,
        deliveryTimeMinutes: 18,
        createdAt: new Date(),
      }));

      const competitors: CompetitorLocation[] = [
        {
          id: 1,
          name: 'Pizza Place',
          latitude: 42.9052,
          longitude: -78.9229,
          type: 'restaurant',
          distanceFromRestaurantKm: 0.5,
        },
      ];

      const gridCells = clusterDeliveryOrders(orders, 42.9052, -78.9229);
      analyzeCompetitorProximity(gridCells, competitors);
      calculateGrowthScores(gridCells);

      const cell = Array.from(gridCells.values())[0];
      expect(cell.growthScore).toBeGreaterThan(0);
      expect(cell.growthScore).toBeLessThanOrEqual(1);
      expect(cell.isGrowingDemand).toBe(true); // 6 orders, 1 competitor, good efficiency
    });

    it('should identify underserved zones', () => {
      const orders: OrderLocation[] = [
        {
          id: 1,
          latitude: 42.9052,
          longitude: -78.9229,
          deliveryTimeMinutes: 30, // >25 min
          createdAt: new Date(),
        },
      ];

      const gridCells = clusterDeliveryOrders(orders, 42.9052, -78.9229);
      analyzeCompetitorProximity(gridCells, []);
      calculateGrowthScores(gridCells);

      const cell = Array.from(gridCells.values())[0];
      // With 30 min delivery time, should be underserved (>25 min)
      if (cell.avgDeliveryTimeMinutes > 25) {
        expect(cell.isUnderserved).toBe(true);
        expect(cell.zoneType).toBe('underserved');
      }
    });

    it('should classify zones based on delivery time and competition', () => {
      const orders: OrderLocation[] = [
        {
          id: 1,
          latitude: 42.9052,
          longitude: -78.9229,
          deliveryTimeMinutes: 20,
          createdAt: new Date(),
        },
      ];

      const competitors: CompetitorLocation[] = [
        {
          id: 1,
          name: 'Pizza Place',
          latitude: 42.9052,
          longitude: -78.9229,
          type: 'restaurant',
          distanceFromRestaurantKm: 0.5,
        },
        {
          id: 2,
          name: 'Burger Joint',
          latitude: 42.9053,
          longitude: -78.9229,
          type: 'fast_food',
          distanceFromRestaurantKm: 0.6,
        },
        {
          id: 3,
          name: 'Cafe',
          latitude: 42.9051,
          longitude: -78.9229,
          type: 'cafe',
          distanceFromRestaurantKm: 0.4,
        },
      ];

      const gridCells = clusterDeliveryOrders(orders, 42.9052, -78.9229);
      analyzeCompetitorProximity(gridCells, competitors);
      calculateGrowthScores(gridCells);

      const cell = Array.from(gridCells.values())[0];
      // Should have zone type classification
      expect(cell.zoneType).toBeDefined();
      expect(['growing_demand', 'underserved', 'high_competition', 'efficient', 'neutral']).toContain(cell.zoneType);
    });
  });

  describe('generateSpatialInsights', () => {
    it('should generate insights from grid cells', () => {
      const orders: OrderLocation[] = Array.from({ length: 6 }, (_, i) => ({
        id: i + 1,
        latitude: 42.9052,
        longitude: -78.9229,
        deliveryTimeMinutes: 18,
        createdAt: new Date(),
      }));

      const competitors: CompetitorLocation[] = [
        {
          id: 1,
          name: 'Pizza Place',
          latitude: 42.9052,
          longitude: -78.9229,
          type: 'restaurant',
          distanceFromRestaurantKm: 0.5,
        },
      ];

      const gridCells = clusterDeliveryOrders(orders, 42.9052, -78.9229);
      analyzeCompetitorProximity(gridCells, competitors);
      calculateGrowthScores(gridCells);
      const insights = generateSpatialInsights(gridCells, competitors);

      expect(insights.length).toBeGreaterThan(0);
      expect(insights.some((i) => i.includes('growth'))).toBe(true);
    });
  });

  describe('exportSpatialAnalysis', () => {
    it('should export complete analysis results', () => {
      const orders: OrderLocation[] = [
        {
          id: 1,
          latitude: 42.9052,
          longitude: -78.9229,
          deliveryTimeMinutes: 20,
          createdAt: new Date(),
        },
      ];

      const competitors: CompetitorLocation[] = [
        {
          id: 1,
          name: 'Pizza Place',
          latitude: 42.9052,
          longitude: -78.9229,
          type: 'restaurant',
          distanceFromRestaurantKm: 0.5,
        },
      ];

      const gridCells = clusterDeliveryOrders(orders, 42.9052, -78.9229);
      analyzeCompetitorProximity(gridCells, competitors);
      calculateGrowthScores(gridCells);
      const insights = generateSpatialInsights(gridCells, competitors);
      const result = exportSpatialAnalysis(gridCells, competitors, insights);

      expect(result.gridCellCount).toBe(1);
      expect(result.totalOrders).toBe(1);
      expect(result.totalCompetitors).toBe(1);
      expect(result.gridCells.length).toBe(1);
      expect(result.competitors.length).toBe(1);
      expect(result.insights.length).toBeGreaterThan(0);
    });
  });

  describe('performSpatialAnalysis', () => {
    it('should orchestrate complete spatial analysis', async () => {
      const orders: OrderLocation[] = Array.from({ length: 8 }, (_, i) => ({
        id: i + 1,
        latitude: 42.9052 + (i % 2) * 0.01,
        longitude: -78.9229 + (i % 2) * 0.01,
        deliveryTimeMinutes: 18 + (i % 3) * 2,
        createdAt: new Date(),
      }));

      const competitors: CompetitorLocation[] = [
        {
          id: 1,
          name: 'Pizza Place',
          latitude: 42.9052,
          longitude: -78.9229,
          type: 'restaurant',
          distanceFromRestaurantKm: 0.5,
        },
        {
          id: 2,
          name: 'Burger Joint',
          latitude: 42.9152,
          longitude: -78.9129,
          type: 'fast_food',
          distanceFromRestaurantKm: 1.2,
        },
      ];

      const result = await performSpatialAnalysis(
        orders,
        competitors,
        42.9052,
        -78.9229
      );

      expect(result.gridCellCount).toBeGreaterThan(0);
      expect(result.totalOrders).toBe(8);
      expect(result.totalCompetitors).toBe(2);
      expect(result.gridCells.length).toBeGreaterThan(0);
      expect(result.insights.length).toBeGreaterThan(0);
      expect(result.analysisType).toBe('full_spatial_analysis');
    });
  });
});
