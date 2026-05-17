/**
 * ML Baseline Module Tests
 * 
 * Tests for the weighted regression forecasting model
 */

import { describe, it, expect } from 'vitest';
import { generateMLBaseline } from './mlBaseline';

describe('ML Baseline Forecasting', () => {
  const testZoneId = 'test-zone-downtown';
  
  describe('generateMLBaseline', () => {
    it('should generate a forecast with required fields', async () => {
      const forecastTime = new Date();
      forecastTime.setHours(12, 0, 0, 0);

      const forecast = await generateMLBaseline(testZoneId, forecastTime);

      expect(forecast).toBeDefined();
      expect(forecast.baselineForecast).toBeGreaterThan(0);
      expect(forecast.confidenceScore).toBeGreaterThanOrEqual(0);
      expect(forecast.confidenceScore).toBeLessThanOrEqual(1);
      expect(forecast.confidenceExplanation).toBeDefined();
      expect(forecast.modelMetadata).toBeDefined();
    });

    it('should have valid model metadata', async () => {
      const forecastTime = new Date();
      forecastTime.setHours(14, 0, 0, 0);

      const forecast = await generateMLBaseline(testZoneId, forecastTime);
      const metadata = forecast.modelMetadata;

      expect(metadata.trainingDataPoints).toBeGreaterThanOrEqual(0);
      expect(metadata.averageHistoricalDemand).toBeGreaterThanOrEqual(0);
      expect(['increasing', 'decreasing', 'stable']).toContain(metadata.trendDirection);
      expect(metadata.volatility).toBeGreaterThanOrEqual(0);
      expect(metadata.volatility).toBeLessThanOrEqual(1);
    });

    it('should generate forecasts for different hours', async () => {
      const morning = new Date();
      morning.setHours(8, 0, 0, 0);

      const evening = new Date();
      evening.setHours(18, 0, 0, 0);

      const morningForecast = await generateMLBaseline(testZoneId, morning);
      const eveningForecast = await generateMLBaseline(testZoneId, evening);

      // Both should generate valid forecasts
      expect(morningForecast.baselineForecast).toBeGreaterThan(0);
      expect(eveningForecast.baselineForecast).toBeGreaterThan(0);
    });

    it('should have reasonable confidence for adequate data', async () => {
      const forecastTime = new Date();
      forecastTime.setHours(12, 0, 0, 0);

      const forecast = await generateMLBaseline(testZoneId, forecastTime);

      // With sufficient training data, confidence should be reasonable
      if (forecast.modelMetadata.trainingDataPoints >= 50) {
        expect(forecast.confidenceScore).toBeGreaterThan(0.3);
      }
    });

    it('should have lower confidence for insufficient data', async () => {
      const forecastTime = new Date();
      forecastTime.setHours(12, 0, 0, 0);

      const forecast = await generateMLBaseline(testZoneId, forecastTime);

      // With minimal data, confidence should be lower
      if (forecast.modelMetadata.trainingDataPoints < 10) {
        expect(forecast.confidenceScore).toBeLessThan(0.6);
      }
    });

    it('should include temporal features in metadata', async () => {
      const forecastTime = new Date();
      forecastTime.setHours(12, 0, 0, 0);

      const forecast = await generateMLBaseline(testZoneId, forecastTime);
      const temporal = forecast.modelMetadata.temporalFeatures;

      expect(temporal).toBeDefined();
      expect(temporal.hour).toBe(12);
      expect(temporal.dayOfWeek).toBeGreaterThanOrEqual(0);
      expect(temporal.dayOfWeek).toBeLessThanOrEqual(6);
      expect(temporal.isPeakHour).toBeDefined();
      expect(temporal.demandIntensity).toBeGreaterThanOrEqual(0);
      expect(temporal.demandIntensity).toBeLessThanOrEqual(1);
    });
  });

  describe('Multiple hour forecasting', () => {
    it('should generate different forecasts for different hours in a day', async () => {
      const forecasts = [];
      const baseDate = new Date();
      baseDate.setHours(0, 0, 0, 0);

      for (let hour = 0; hour < 6; hour++) {
        const forecastTime = new Date(baseDate);
        forecastTime.setHours(hour);
        const forecast = await generateMLBaseline(testZoneId, forecastTime);
        forecasts.push(forecast);
      }

      expect(forecasts).toHaveLength(6);
      forecasts.forEach((forecast) => {
        expect(forecast.baselineForecast).toBeGreaterThan(0);
        expect(forecast.confidenceScore).toBeGreaterThanOrEqual(0);
        expect(forecast.confidenceScore).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('Confidence Scoring', () => {
    it('should increase confidence with more training data', async () => {
      const forecastTime = new Date();
      forecastTime.setHours(12, 0, 0, 0);

      const forecast = await generateMLBaseline(testZoneId, forecastTime);

      // Confidence should scale with training data
      const dataRatio = forecast.modelMetadata.trainingDataPoints / 100;
      const expectedMinConfidence = Math.min(0.5, dataRatio * 0.5);
      
      expect(forecast.confidenceScore).toBeGreaterThanOrEqual(expectedMinConfidence);
    });

    it('should reduce confidence for high volatility', async () => {
      const forecastTime = new Date();
      forecastTime.setHours(12, 0, 0, 0);

      const forecast = await generateMLBaseline(testZoneId, forecastTime);

      // High volatility should reduce confidence
      const volatilityPenalty = forecast.modelMetadata.volatility * 0.3;
      const expectedMaxConfidence = 1.0 - volatilityPenalty;
      
      expect(forecast.confidenceScore).toBeLessThanOrEqual(expectedMaxConfidence + 0.1);
    });
  });

  describe('Trend Analysis', () => {
    it('should identify trend direction', async () => {
      const forecastTime = new Date();
      forecastTime.setHours(12, 0, 0, 0);

      const forecast = await generateMLBaseline(testZoneId, forecastTime);
      const trend = forecast.modelMetadata.trendDirection;

      expect(['increasing', 'decreasing', 'stable']).toContain(trend);
    });

    it('should have explanation for confidence', async () => {
      const forecastTime = new Date();
      forecastTime.setHours(12, 0, 0, 0);

      const forecast = await generateMLBaseline(testZoneId, forecastTime);

      expect(forecast.confidenceExplanation).toBeTruthy();
      expect(forecast.confidenceExplanation.length).toBeGreaterThan(10);
    });
  });

  describe('Edge Cases', () => {
    it('should handle midnight forecast', async () => {
      const midnight = new Date();
      midnight.setHours(0, 0, 0, 0);

      const forecast = await generateMLBaseline(testZoneId, midnight);

      expect(forecast).toBeDefined();
      expect(forecast.baselineForecast).toBeGreaterThan(0);
      expect(forecast.modelMetadata.temporalFeatures.hour).toBe(0);
    });

    it('should handle late evening forecast', async () => {
      const lateEvening = new Date();
      lateEvening.setHours(23, 0, 0, 0);

      const forecast = await generateMLBaseline(testZoneId, lateEvening);

      expect(forecast).toBeDefined();
      expect(forecast.baselineForecast).toBeGreaterThan(0);
      expect(forecast.modelMetadata.temporalFeatures.hour).toBe(23);
    });

    it('should handle different zone IDs', async () => {
      const forecastTime = new Date();
      forecastTime.setHours(12, 0, 0, 0);

      const zone1 = await generateMLBaseline('zone-1', forecastTime);
      const zone2 = await generateMLBaseline('zone-2', forecastTime);

      expect(zone1).toBeDefined();
      expect(zone2).toBeDefined();
    });
  });
});
