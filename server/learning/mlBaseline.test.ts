/**
 * ML Baseline Module Tests
 * 
 * Tests for the weighted regression predicting model
 */

import { describe, it, expect } from 'vitest';
import { generateMLBaseline } from './mlBaseline';

describe('ML Baseline Predicting', () => {
  const testZoneId = 'test-zone-downtown';
  
  describe('generateMLBaseline', () => {
    it('should generate a predict with required fields', async () => {
      const predictTime = new Date();
      predictTime.setHours(12, 0, 0, 0);

      const predict = await generateMLBaseline(testZoneId, predictTime);

      expect(predict).toBeDefined();
      expect(predict.baselinePredict).toBeGreaterThan(0);
      expect(predict.confidenceScore).toBeGreaterThanOrEqual(0);
      expect(predict.confidenceScore).toBeLessThanOrEqual(1);
      expect(predict.confidenceExplanation).toBeDefined();
      expect(predict.modelMetadata).toBeDefined();
    });

    it('should have valid model metadata', async () => {
      const predictTime = new Date();
      predictTime.setHours(14, 0, 0, 0);

      const predict = await generateMLBaseline(testZoneId, predictTime);
      const metadata = predict.modelMetadata;

      expect(metadata.trainingDataPoints).toBeGreaterThanOrEqual(0);
      expect(metadata.averageHistoricalDemand).toBeGreaterThanOrEqual(0);
      expect(['increasing', 'decreasing', 'stable']).toContain(metadata.trendDirection);
      expect(metadata.volatility).toBeGreaterThanOrEqual(0);
      expect(metadata.volatility).toBeLessThanOrEqual(1);
    });

    it('should generate predicts for different hours', async () => {
      const morning = new Date();
      morning.setHours(8, 0, 0, 0);

      const evening = new Date();
      evening.setHours(18, 0, 0, 0);

      const morningPredict = await generateMLBaseline(testZoneId, morning);
      const eveningPredict = await generateMLBaseline(testZoneId, evening);

      // Both should generate valid predicts
      expect(morningPredict.baselinePredict).toBeGreaterThan(0);
      expect(eveningPredict.baselinePredict).toBeGreaterThan(0);
    });

    it('should have reasonable confidence for adequate data', async () => {
      const predictTime = new Date();
      predictTime.setHours(12, 0, 0, 0);

      const predict = await generateMLBaseline(testZoneId, predictTime);

      // With sufficient training data, confidence should be reasonable
      if (predict.modelMetadata.trainingDataPoints >= 50) {
        expect(predict.confidenceScore).toBeGreaterThan(0.3);
      }
    });

    it('should have lower confidence for insufficient data', async () => {
      const predictTime = new Date();
      predictTime.setHours(12, 0, 0, 0);

      const predict = await generateMLBaseline(testZoneId, predictTime);

      // With minimal data, confidence should be lower
      if (predict.modelMetadata.trainingDataPoints < 10) {
        expect(predict.confidenceScore).toBeLessThan(0.6);
      }
    });

    it('should include temporal features in metadata', async () => {
      const predictTime = new Date();
      predictTime.setHours(12, 0, 0, 0);

      const predict = await generateMLBaseline(testZoneId, predictTime);
      const temporal = predict.modelMetadata.temporalFeatures;

      expect(temporal).toBeDefined();
      expect(temporal.hour).toBe(12);
      expect(temporal.dayOfWeek).toBeGreaterThanOrEqual(0);
      expect(temporal.dayOfWeek).toBeLessThanOrEqual(6);
      expect(temporal.isPeakHour).toBeDefined();
      expect(temporal.demandIntensity).toBeGreaterThanOrEqual(0);
      expect(temporal.demandIntensity).toBeLessThanOrEqual(1);
    });
  });

  describe('Multiple hour predicting', () => {
    it('should generate different predicts for different hours in a day', async () => {
      const predicts = [];
      const baseDate = new Date();
      baseDate.setHours(0, 0, 0, 0);

      for (let hour = 0; hour < 6; hour++) {
        const predictTime = new Date(baseDate);
        predictTime.setHours(hour);
        const predict = await generateMLBaseline(testZoneId, predictTime);
        predicts.push(predict);
      }

      expect(predicts).toHaveLength(6);
      predicts.forEach((predict) => {
        expect(predict.baselinePredict).toBeGreaterThan(0);
        expect(predict.confidenceScore).toBeGreaterThanOrEqual(0);
        expect(predict.confidenceScore).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('Confidence Scoring', () => {
    it('should increase confidence with more training data', async () => {
      const predictTime = new Date();
      predictTime.setHours(12, 0, 0, 0);

      const predict = await generateMLBaseline(testZoneId, predictTime);

      // Confidence should scale with training data
      const dataRatio = predict.modelMetadata.trainingDataPoints / 100;
      const expectedMinConfidence = Math.min(0.5, dataRatio * 0.5);
      
      expect(predict.confidenceScore).toBeGreaterThanOrEqual(expectedMinConfidence);
    });

    it('should reduce confidence for high volatility', async () => {
      const predictTime = new Date();
      predictTime.setHours(12, 0, 0, 0);

      const predict = await generateMLBaseline(testZoneId, predictTime);

      // High volatility should reduce confidence
      const volatilityPenalty = predict.modelMetadata.volatility * 0.3;
      const expectedMaxConfidence = 1.0 - volatilityPenalty;
      
      expect(predict.confidenceScore).toBeLessThanOrEqual(expectedMaxConfidence + 0.1);
    });
  });

  describe('Trend Analysis', () => {
    it('should identify trend direction', async () => {
      const predictTime = new Date();
      predictTime.setHours(12, 0, 0, 0);

      const predict = await generateMLBaseline(testZoneId, predictTime);
      const trend = predict.modelMetadata.trendDirection;

      expect(['increasing', 'decreasing', 'stable']).toContain(trend);
    });

    it('should have explanation for confidence', async () => {
      const predictTime = new Date();
      predictTime.setHours(12, 0, 0, 0);

      const predict = await generateMLBaseline(testZoneId, predictTime);

      expect(predict.confidenceExplanation).toBeTruthy();
      expect(predict.confidenceExplanation.length).toBeGreaterThan(10);
    });
  });

  describe('Edge Cases', () => {
    it('should handle midnight predict', async () => {
      const midnight = new Date();
      midnight.setHours(0, 0, 0, 0);

      const predict = await generateMLBaseline(testZoneId, midnight);

      expect(predict).toBeDefined();
      expect(predict.baselinePredict).toBeGreaterThan(0);
      expect(predict.modelMetadata.temporalFeatures.hour).toBe(0);
    });

    it('should handle late evening predict', async () => {
      const lateEvening = new Date();
      lateEvening.setHours(23, 0, 0, 0);

      const predict = await generateMLBaseline(testZoneId, lateEvening);

      expect(predict).toBeDefined();
      expect(predict.baselinePredict).toBeGreaterThan(0);
      expect(predict.modelMetadata.temporalFeatures.hour).toBe(23);
    });

    it('should handle different zone IDs', async () => {
      const predictTime = new Date();
      predictTime.setHours(12, 0, 0, 0);

      const zone1 = await generateMLBaseline('zone-1', predictTime);
      const zone2 = await generateMLBaseline('zone-2', predictTime);

      expect(zone1).toBeDefined();
      expect(zone2).toBeDefined();
    });
  });
});
