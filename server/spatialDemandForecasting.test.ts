import { describe, it, expect, vi } from 'vitest';
import {
  analyzeDemandTrends,
  projectFutureDensity,
  calculateConfidence,
  classifyForecast,
  generateForecasts,
  generateForecastSummary,
  forecastSpatialDemand,
  SpatialZone,
  DemandTrend,
  ForecastedZone,
} from './spatialDemandForecasting';

// Mock the boundary filter to return all zones (for testing)
vi.mock("./geographicBoundaryFilter", () => ({
  filterZonesByBoundary: (zones: any[]) => zones,
}));

// Mock data
const mockZones: SpatialZone[] = [
  {
    hexId: 'hex1',
    latitude: 42.9849,
    longitude: -79.2453,
    previousDensity: 10,
    currentDensity: 15,
    densityChange: 5,
    growthPercentage: 50,
    classification: 'Strong Growth',
    clusterStatus: 'growing',
    orderCount: 15,
    orderLocations: [
      { lat: 42.9849, lon: -79.2453, orderId: 'ord1' },
      { lat: 42.9850, lon: -79.2454, orderId: 'ord2' },
    ],
  },
  {
    hexId: 'hex2',
    latitude: 42.9900,
    longitude: -79.2500,
    previousDensity: 20,
    currentDensity: 18,
    densityChange: -2,
    growthPercentage: -10,
    classification: 'Decline',
    clusterStatus: 'shrinking',
    orderCount: 18,
    orderLocations: [
      { lat: 42.9900, lon: -79.2500, orderId: 'ord3' },
    ],
  },
  {
    hexId: 'hex3',
    latitude: 43.0000,
    longitude: -79.2600,
    previousDensity: 12,
    currentDensity: 12,
    densityChange: 0,
    growthPercentage: 0,
    classification: 'Stable',
    clusterStatus: 'stable',
    orderCount: 12,
    orderLocations: [
      { lat: 43.0000, lon: -79.2600, orderId: 'ord4' },
    ],
  },
  {
    hexId: 'hex4',
    latitude: 43.0100,
    longitude: -79.2700,
    previousDensity: 5,
    currentDensity: 0,
    densityChange: -5,
    growthPercentage: -100,
    classification: 'Rapid Shift',
    clusterStatus: 'disappearing',
    orderCount: 0,
    orderLocations: [],
  },
];

describe('Spatial Demand Forecasting', () => {
  describe('analyzeDemandTrends', () => {
    it('should calculate trends for all zones', () => {
      const trends = analyzeDemandTrends(mockZones);
      expect(trends).toHaveLength(4);
    });

    it('should correctly identify increasing trends', () => {
      const trends = analyzeDemandTrends(mockZones);
      const hex1Trend = trends.find(t => t.hexId === 'hex1');
      expect(hex1Trend?.trendDirection).toBe('increasing');
      expect(hex1Trend?.growthRate).toBe(50);
    });

    it('should correctly identify decreasing trends', () => {
      const trends = analyzeDemandTrends(mockZones);
      const hex2Trend = trends.find(t => t.hexId === 'hex2');
      expect(hex2Trend?.trendDirection).toBe('decreasing');
      expect(hex2Trend?.growthRate).toBe(-10);
    });

    it('should correctly identify stable trends', () => {
      const trends = analyzeDemandTrends(mockZones);
      const hex3Trend = trends.find(t => t.hexId === 'hex3');
      expect(hex3Trend?.trendDirection).toBe('stable');
      expect(hex3Trend?.growthRate).toBe(0);
    });

    it('should correctly classify trend magnitude', () => {
      const trends = analyzeDemandTrends(mockZones);
      const hex1Trend = trends.find(t => t.hexId === 'hex1');
      expect(hex1Trend?.trendMagnitude).toBe('strong'); // 50% growth
    });

    it('should handle zero previous density', () => {
      const zones: SpatialZone[] = [
        {
          ...mockZones[0],
          hexId: 'hex_new',
          previousDensity: 0,
          currentDensity: 10,
          growthPercentage: 100,
        },
      ];
      const trends = analyzeDemandTrends(zones);
      expect(trends[0].growthRate).toBe(100);
    });
  });

  describe('projectFutureDensity', () => {
    it('should project density 7 days ahead', () => {
      const projected = projectFutureDensity(10, 50, 7);
      expect(projected).toBeGreaterThan(10);
    });

    it('should project density 30 days ahead', () => {
      const projected = projectFutureDensity(10, 50, 30);
      expect(projected).toBeGreaterThan(10);
    });

    it('should project density 90 days ahead', () => {
      const projected = projectFutureDensity(10, 50, 90);
      expect(projected).toBeGreaterThan(10);
    });

    it('should apply trend decay over time', () => {
      const proj7d = projectFutureDensity(10, 50, 7);
      const proj30d = projectFutureDensity(10, 50, 30);
      const proj90d = projectFutureDensity(10, 50, 90);
      
      // Growth should increase with time but at a decaying rate
      expect(proj7d).toBeLessThan(proj30d);
      expect(proj30d).toBeLessThan(proj90d);
    });

    it('should handle negative growth rates', () => {
      const projected = projectFutureDensity(20, -10, 30);
      expect(projected).toBeLessThan(20);
      expect(projected).toBeGreaterThanOrEqual(0);
    });

    it('should return 0 for zero current density', () => {
      const projected = projectFutureDensity(0, 50, 30);
      expect(projected).toBe(0);
    });
  });

  describe('calculateConfidence', () => {
    it('should give high confidence for stable trends', () => {
      const confidence = calculateConfidence(2, 'weak', 30);
      expect(confidence).toBeGreaterThan(0.7);
    });

    it('should give moderate confidence for moderate trends', () => {
      const confidence = calculateConfidence(15, 'moderate', 30);
      expect(confidence).toBeGreaterThan(0.5);
      expect(confidence).toBeLessThan(0.8);
    });

    it('should give lower confidence for volatile trends', () => {
      const confidence = calculateConfidence(50, 'strong', 7);
      expect(confidence).toBeLessThan(0.7);
    });

    it('should increase confidence with more data', () => {
      const conf7d = calculateConfidence(20, 'moderate', 7);
      const conf30d = calculateConfidence(20, 'moderate', 30);
      expect(conf30d).toBeGreaterThan(conf7d);
    });

    it('should return value between 0 and 1', () => {
      const confidence = calculateConfidence(100, 'strong', 100);
      expect(confidence).toBeGreaterThanOrEqual(0);
      expect(confidence).toBeLessThanOrEqual(1);
    });
  });

  describe('classifyForecast', () => {
    it('should classify strong growth', () => {
      const { classification } = classifyForecast(10, 15, 0.8);
      expect(classification).toBe('Expected Strong Growth');
    });

    it('should classify moderate growth', () => {
      const { classification } = classifyForecast(10, 12, 0.8);
      expect(classification).toBe('Expected Moderate Growth');
    });

    it('should classify stability', () => {
      const { classification } = classifyForecast(10, 10.3, 0.8);
      expect(classification).toBe('Expected Stability');
    });

    it('should classify moderate decline', () => {
      const { classification } = classifyForecast(20, 16, 0.8);
      expect(classification).toBe('Expected Moderate Decline');
    });

    it('should classify rapid decline', () => {
      const { classification } = classifyForecast(20, 10, 0.8);
      expect(classification).toBe('Expected Rapid Decline');
    });

    it('should set low risk for high confidence', () => {
      const { riskLevel } = classifyForecast(10, 15, 0.8);
      expect(riskLevel).toBe('low');
    });

    it('should set high risk for low confidence', () => {
      const { riskLevel } = classifyForecast(10, 15, 0.3);
      expect(riskLevel).toBe('high');
    });
  });

  describe('generateForecasts', () => {
    it('should generate forecasts for all trends', () => {
      const trends = analyzeDemandTrends(mockZones);
      const forecasts = generateForecasts(trends, 7);
      expect(forecasts).toHaveLength(4);
    });

    it('should include all required forecast fields', () => {
      const trends = analyzeDemandTrends(mockZones);
      const forecasts = generateForecasts(trends, 7);
      
      forecasts.forEach(forecast => {
        expect(forecast.hexId).toBeDefined();
        expect(forecast.latitude).toBeDefined();
        expect(forecast.longitude).toBeDefined();
        expect(forecast.currentDensity).toBeDefined();
        expect(forecast.projectedDensity7d).toBeDefined();
        expect(forecast.projectedDensity30d).toBeDefined();
        expect(forecast.projectedDensity90d).toBeDefined();
        expect(forecast.trendDirection).toBeDefined();
        expect(forecast.predictionConfidence).toBeDefined();
        expect(forecast.forecastedClassification).toBeDefined();
        expect(forecast.riskLevel).toBeDefined();
      });
    });

    it('should have increasing projected densities for growing zones', () => {
      const trends = analyzeDemandTrends(mockZones);
      const forecasts = generateForecasts(trends, 7);
      const hex1Forecast = forecasts.find(f => f.hexId === 'hex1');
      
      expect(hex1Forecast?.projectedDensity7d).toBeGreaterThan(hex1Forecast?.currentDensity || 0);
      expect(hex1Forecast?.projectedDensity30d).toBeGreaterThan(hex1Forecast?.projectedDensity7d || 0);
    });
  });

  describe('generateForecastSummary', () => {
    it('should generate summary text', () => {
      const trends = analyzeDemandTrends(mockZones);
      const forecasts = generateForecasts(trends, 7);
      const summary = generateForecastSummary(forecasts, {
        startDate: new Date('2026-05-06'),
        endDate: new Date('2026-05-13'),
        daysAnalyzed: 7,
      });
      
      expect(summary).toBeDefined();
      expect(summary.length).toBeGreaterThan(0);
    });

    it('should include analysis period in summary', () => {
      const trends = analyzeDemandTrends(mockZones);
      const forecasts = generateForecasts(trends, 7);
      const summary = generateForecastSummary(forecasts, {
        startDate: new Date('2026-05-06'),
        endDate: new Date('2026-05-13'),
        daysAnalyzed: 7,
      });
      
      expect(summary).toContain('7-day');
    });

    it('should include zone count in summary', () => {
      const trends = analyzeDemandTrends(mockZones);
      const forecasts = generateForecasts(trends, 7);
      const summary = generateForecastSummary(forecasts, {
        startDate: new Date('2026-05-06'),
        endDate: new Date('2026-05-13'),
        daysAnalyzed: 7,
      });
      
      expect(summary).toContain('4 zones');
    });

    it('should handle empty forecasts', () => {
      const summary = generateForecastSummary([], {
        startDate: new Date('2026-05-06'),
        endDate: new Date('2026-05-13'),
        daysAnalyzed: 7,
      });
      
      expect(summary).toContain('No forecast data');
    });
  });

  describe('forecastSpatialDemand', () => {
    it('should execute complete forecasting pipeline', () => {
      const result = forecastSpatialDemand(mockZones, {
        startDate: new Date('2026-05-06'),
        endDate: new Date('2026-05-13'),
      });
      
      expect(result.trends).toHaveLength(4);
      expect(result.forecasts).toHaveLength(4);
      expect(result.forecastSummary).toBeDefined();
    });

    it('should calculate correct analysis period', () => {
      const result = forecastSpatialDemand(mockZones, {
        startDate: new Date('2026-05-06'),
        endDate: new Date('2026-05-13'),
      });
      
      expect(result.forecastPeriod.daysAnalyzed).toBe(7);
    });

    it('should include all result fields', () => {
      const result = forecastSpatialDemand(mockZones, {
        startDate: new Date('2026-05-06'),
        endDate: new Date('2026-05-13'),
      });
      
      expect(result.trends).toBeDefined();
      expect(result.forecasts).toBeDefined();
      expect(result.forecastPeriod).toBeDefined();
      expect(result.forecastSummary).toBeDefined();
    });

    it('should handle longer analysis periods', () => {
      const result = forecastSpatialDemand(mockZones, {
        startDate: new Date('2026-04-13'),
        endDate: new Date('2026-05-13'),
      });
      
      expect(result.forecastPeriod.daysAnalyzed).toBe(30);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zones with no orders', () => {
      const zones: SpatialZone[] = [
        {
          ...mockZones[0],
          hexId: 'hex_empty',
          orderCount: 0,
          orderLocations: [],
        },
      ];
      
      const trends = analyzeDemandTrends(zones);
      expect(trends).toHaveLength(1);
      expect(trends[0].currentDensity).toBe(15);
    });

    it('should handle very high growth rates', () => {
      const zones: SpatialZone[] = [
        {
          ...mockZones[0],
          hexId: 'hex_spike',
          previousDensity: 1,
          currentDensity: 100,
          densityChange: 99,
          growthPercentage: 9900,
        },
      ];
      
      const trends = analyzeDemandTrends(zones);
      expect(trends[0].trendMagnitude).toBe('strong');
    });

    it('should handle very negative growth rates', () => {
      const zones: SpatialZone[] = [
        {
          ...mockZones[0],
          hexId: 'hex_crash',
          previousDensity: 100,
          currentDensity: 1,
          densityChange: -99,
          growthPercentage: -99,
        },
      ];
      
      const trends = analyzeDemandTrends(zones);
      expect(trends[0].trendDirection).toBe('decreasing');
    });

    it('should handle empty zone array', () => {
      const result = forecastSpatialDemand([], {
        startDate: new Date('2026-05-06'),
        endDate: new Date('2026-05-13'),
      });
      
      expect(result.trends).toHaveLength(0);
      expect(result.forecasts).toHaveLength(0);
    });
  });
});
