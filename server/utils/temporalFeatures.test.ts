/**
 * Test suite for Temporal Feature Engineering Module
 */

import { describe, it, expect } from 'vitest';
import {
  extractTemporalFeaturesForML,
  normalizeTemporalFeatures,
  getFeatureImportanceWeights,
  createFeatureVector,
  getFeatureNames,
  batchExtractTemporalFeatures,
  batchCreateFeatureVectors,
} from './temporalFeatures';
import { DayCategory } from './operatingHours';

describe('Temporal Feature Engineering', () => {
  describe('extractTemporalFeaturesForML', () => {
    it('should extract features during early peak hours', () => {
      // Monday 6 PM (early peak)
      const date = new Date(2026, 4, 18, 18, 0, 0);
      const features = extractTemporalFeaturesForML(date);

      expect(features.dayOfWeek).toBe(1);
      expect(features.dayCategory).toBe(DayCategory.WEEKDAY);
      expect(features.hour).toBe(18);
      expect(features.minute).toBe(0);
      expect(features.hoursSinceOpen).toBe(2); // 18 - 16
      expect(features.isPeakHour).toBe(true);
      expect(features.isEarlyPeak).toBe(true);
      expect(features.isMainPeak).toBe(false);
      expect(features.isLatePeak).toBe(false);
      expect(features.peakHourType).toBe('early');
      expect(features.demandIntensity).toBe(0.6); // Early peak intensity
    });

    it('should extract features during main peak hours', () => {
      // Monday 8 PM (main peak)
      const date = new Date(2026, 4, 18, 20, 0, 0);
      const features = extractTemporalFeaturesForML(date);

      expect(features.hour).toBe(20);
      expect(features.isPeakHour).toBe(true);
      expect(features.isMainPeak).toBe(true);
      expect(features.peakHourType).toBe('main');
      expect(features.demandIntensity).toBe(0.9); // Main peak intensity (highest)
    });

    it('should extract features during late peak hours', () => {
      // Monday 9:30 PM (late peak + pre-closing)
      const date = new Date(2026, 4, 18, 21, 30, 0);
      const features = extractTemporalFeaturesForML(date);

      expect(features.hour).toBe(21);
      expect(features.minute).toBe(30);
      expect(features.isPeakHour).toBe(true);
      expect(features.isLatePeak).toBe(true);
      expect(features.isPreClosingSurge).toBe(true);
      expect(features.minutesUntilClose30).toBe(true);
      expect(features.peakHourType).toBe('late');
      expect(features.demandIntensity).toBe(0.85); // Late peak + pre-closing intensity
    });

    it('should extract features during pre-closing surge', () => {
      // Monday 9:45 PM (last 15 minutes)
      const date = new Date(2026, 4, 18, 21, 45, 0);
      const features = extractTemporalFeaturesForML(date);

      expect(features.isPreClosingSurge).toBe(true);
      expect(features.minutesUntilClose30).toBe(true);
      expect(features.minutesUntilClose15).toBe(true);
      expect(features.minutesUntilClose5).toBe(false);
      expect(features.minutesUntilClose).toBe(15); // 22:00 - 21:45
    });

    it('should extract features during weekend extended hours', () => {
      // Saturday 10:30 PM (extended hours)
      const date = new Date(2026, 4, 23, 22, 30, 0);
      const features = extractTemporalFeaturesForML(date);

      expect(features.dayOfWeek).toBe(6);
      expect(features.dayCategory).toBe(DayCategory.SATURDAY);
      expect(features.isWeekend).toBe(true);
      expect(features.hour).toBe(22);
      expect(features.hoursSinceOpen).toBe(6); // 22 - 16
      expect(features.isPeakHour).toBe(true);
      expect(features.isLatePeak).toBe(true);
      expect(features.minutesUntilClose).toBe(30); // 23:00 - 22:30
    });

    it('should calculate percent through day correctly', () => {
      // Monday 7 PM (halfway through 6-hour day)
      const date = new Date(2026, 4, 18, 19, 0, 0);
      const features = extractTemporalFeaturesForML(date);

      // 19:00 - 16:00 = 3 hours = 180 minutes
      // 180 / 360 (6 hours) = 0.5
      expect(features.percentThroughDay).toBeCloseTo(0.5, 2);
    });

    it('should provide cyclical encodings for hour', () => {
      const date = new Date(2026, 4, 18, 16, 0, 0); // 4 PM
      const features = extractTemporalFeaturesForML(date);

      // sin(2π * 16 / 24) and cos(2π * 16 / 24)
      expect(typeof features.hourSine).toBe('number');
      expect(typeof features.hourCosine).toBe('number');
      expect(features.hourSine).toBeGreaterThanOrEqual(-1);
      expect(features.hourSine).toBeLessThanOrEqual(1);
      expect(features.hourCosine).toBeGreaterThanOrEqual(-1);
      expect(features.hourCosine).toBeLessThanOrEqual(1);
    });

    it('should provide cyclical encodings for day of week', () => {
      const date = new Date(2026, 4, 18, 18, 0, 0); // Monday
      const features = extractTemporalFeaturesForML(date);

      expect(typeof features.daySine).toBe('number');
      expect(typeof features.dayCosine).toBe('number');
      expect(features.daySine).toBeGreaterThanOrEqual(-1);
      expect(features.daySine).toBeLessThanOrEqual(1);
      expect(features.dayCosine).toBeGreaterThanOrEqual(-1);
      expect(features.dayCosine).toBeLessThanOrEqual(1);
    });

    it('should detect high demand window', () => {
      // During peak hour
      const peakDate = new Date(2026, 4, 18, 20, 0, 0);
      const peakFeatures = extractTemporalFeaturesForML(peakDate);
      expect(peakFeatures.isHighDemandWindow).toBe(true);

      // During pre-closing surge
      const surgeDate = new Date(2026, 4, 18, 21, 45, 0);
      const surgeFeatures = extractTemporalFeaturesForML(surgeDate);
      expect(surgeFeatures.isHighDemandWindow).toBe(true);

      // Early peak (5-7 PM) is also high demand
      const earlyPeakDate = new Date(2026, 4, 18, 18, 0, 0);
      const earlyPeakFeatures = extractTemporalFeaturesForML(earlyPeakDate);
      expect(earlyPeakFeatures.isHighDemandWindow).toBe(true);
    });
  });

  describe('normalizeTemporalFeatures', () => {
    it('should normalize all features to 0-1 range', () => {
      const date = new Date(2026, 4, 18, 20, 30, 0);
      const features = extractTemporalFeaturesForML(date);
      const normalized = normalizeTemporalFeatures(features);

      // Check that all numeric values are in 0-1 range
      Object.values(normalized).forEach(value => {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
      });
    });

    it('should preserve boolean features as 0 or 1', () => {
      const date = new Date(2026, 4, 18, 20, 0, 0);
      const features = extractTemporalFeaturesForML(date);
      const normalized = normalizeTemporalFeatures(features);

      expect([0, 1]).toContain(normalized.isPeakHour);
      expect([0, 1]).toContain(normalized.isMainPeak);
      expect([0, 1]).toContain(normalized.isPreClosingSurge);
    });
  });

  describe('getFeatureImportanceWeights', () => {
    it('should return valid importance weights', () => {
      const weights = getFeatureImportanceWeights();

      // Check that all weights are between 0 and 1
      Object.values(weights).forEach(weight => {
        expect(weight).toBeGreaterThanOrEqual(0);
        expect(weight).toBeLessThanOrEqual(1);
      });

      // Check that weights sum to approximately 1.0
      const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
      expect(totalWeight).toBeCloseTo(1.0, 1);
    });

    it('should prioritize peak hour indicators', () => {
      const weights = getFeatureImportanceWeights();

      // Peak hour features should have high importance
      expect(weights.isPeakHour).toBeGreaterThan(0.10);
      expect(weights.isMainPeak).toBeGreaterThan(0.10);
      expect(weights.demandIntensity).toBeGreaterThan(0.10);
    });
  });

  describe('createFeatureVector', () => {
    it('should create consistent feature vectors', () => {
      const date = new Date(2026, 4, 18, 20, 0, 0);
      const vector1 = createFeatureVector(date);
      const vector2 = createFeatureVector(date);

      expect(vector1).toEqual(vector2);
    });

    it('should create feature vectors of correct length', () => {
      const date = new Date(2026, 4, 18, 20, 0, 0);
      const vector = createFeatureVector(date);
      const names = getFeatureNames();

      expect(vector.length).toBe(names.length);
      expect(vector.length).toBe(21); // Expected number of features
    });

    it('should create normalized feature vectors', () => {
      const date = new Date(2026, 4, 18, 20, 0, 0);
      const vector = createFeatureVector(date);

      // All values should be normalized
      vector.forEach(value => {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('getFeatureNames', () => {
    it('should return consistent feature names', () => {
      const names1 = getFeatureNames();
      const names2 = getFeatureNames();

      expect(names1).toEqual(names2);
    });

    it('should return 21 feature names', () => {
      const names = getFeatureNames();
      expect(names.length).toBe(21);
    });

    it('should include all important feature types', () => {
      const names = getFeatureNames();

      expect(names).toContain('dayOfWeek_norm');
      expect(names).toContain('hour_norm');
      expect(names).toContain('isPeakHour');
      expect(names).toContain('isPreClosingSurge');
      expect(names).toContain('demandIntensity');
      expect(names).toContain('hourSine_norm');
      expect(names).toContain('daySine_norm');
    });
  });

  describe('batchExtractTemporalFeatures', () => {
    it('should extract features for multiple dates', () => {
      const dates = [
        new Date(2026, 4, 18, 18, 0, 0),
        new Date(2026, 4, 18, 20, 0, 0),
        new Date(2026, 4, 18, 21, 30, 0),
      ];

      const features = batchExtractTemporalFeatures(dates);

      expect(features.length).toBe(3);
      expect(features[0].hour).toBe(18);
      expect(features[1].hour).toBe(20);
      expect(features[2].hour).toBe(21);
    });
  });

  describe('batchCreateFeatureVectors', () => {
    it('should create feature vectors for multiple dates', () => {
      const dates = [
        new Date(2026, 4, 18, 18, 0, 0),
        new Date(2026, 4, 18, 20, 0, 0),
        new Date(2026, 4, 18, 21, 30, 0),
      ];

      const vectors = batchCreateFeatureVectors(dates);

      expect(vectors.length).toBe(3);
      expect(vectors[0].length).toBe(21);
      expect(vectors[1].length).toBe(21);
      expect(vectors[2].length).toBe(21);
    });

    it('should create different vectors for different times', () => {
      const dates = [
        new Date(2026, 4, 18, 18, 0, 0), // Early peak
        new Date(2026, 4, 18, 20, 0, 0), // Main peak
      ];

      const vectors = batchCreateFeatureVectors(dates);

      // Vectors should be different
      expect(vectors[0]).not.toEqual(vectors[1]);

      // But should have same length
      expect(vectors[0].length).toBe(vectors[1].length);
    });
  });

  describe('Demand intensity calculation', () => {
    it('should assign correct intensity for early peak', () => {
      const date = new Date(2026, 4, 18, 18, 0, 0);
      const features = extractTemporalFeaturesForML(date);
      expect(features.demandIntensity).toBe(0.6);
    });

    it('should assign correct intensity for main peak', () => {
      const date = new Date(2026, 4, 18, 20, 0, 0);
      const features = extractTemporalFeaturesForML(date);
      expect(features.demandIntensity).toBe(0.9);
    });

    it('should assign correct intensity for late peak', () => {
      const date = new Date(2026, 4, 18, 21, 0, 0);
      const features = extractTemporalFeaturesForML(date);
      expect(features.demandIntensity).toBe(0.8);
    });

    it('should assign correct intensity for pre-closing surge', () => {
      const date = new Date(2026, 4, 18, 21, 45, 0);
      const features = extractTemporalFeaturesForML(date);
      expect(features.demandIntensity).toBe(0.85); // Late peak + pre-closing
    });

    it('should assign correct intensity for first hour', () => {
      const date = new Date(2026, 4, 18, 16, 30, 0);
      const features = extractTemporalFeaturesForML(date);
      expect(features.demandIntensity).toBe(0.3);
    });

    it('should assign correct intensity for regular hours', () => {
      const date = new Date(2026, 4, 18, 17, 30, 0);
      const features = extractTemporalFeaturesForML(date);
      expect(features.demandIntensity).toBe(0.6); // Early peak (5-7 PM)
    });
  });
});
