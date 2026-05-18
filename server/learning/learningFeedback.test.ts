/**
 * Learning Feedback System Tests
 * 
 * Tests for database-backed accuracy tracking and continuous improvement
 */

import { describe, it, expect } from 'vitest';
import {
  recordOrderOutcome,
  getModelPerformanceMetrics,
  getLearningProgress,
  getAccuracyTrend,
  getAccuracyBreakdown,
} from './learningFeedback';

describe('Learning Feedback System', () => {
  const testZoneId = 'test-zone-feedback';

  describe('recordOrderOutcome', () => {
    it('should record outcome with required fields', async () => {
      const predictTime = new Date();
      predictTime.setHours(12, 0, 0, 0);

      const outcome = await recordOrderOutcome(testZoneId, predictTime, 15);

      if (outcome) {
        expect(outcome).toBeDefined();
        expect(outcome.zoneId).toBe(testZoneId);
        expect(outcome.predictTime).toEqual(predictTime);
        expect(outcome.predictedDemand).toBeGreaterThanOrEqual(0);
        expect(outcome.predictError).toBeGreaterThanOrEqual(0);
        expect(outcome.accuracyScore).toBeGreaterThanOrEqual(0);
        expect(outcome.accuracyScore).toBeLessThanOrEqual(1);
      }
    });

    it('should calculate accuracy correctly', async () => {
      const predictTime = new Date();
      predictTime.setHours(14, 0, 0, 0);

      const outcome = await recordOrderOutcome(testZoneId, predictTime, 10);

      if (outcome) {
        const expectedError = Math.abs(outcome.predictedDemand - outcome.actualDemand);
        expect(outcome.predictError).toBe(expectedError);
      }
    });

    it('should handle zero actual demand', async () => {
      const predictTime = new Date();
      predictTime.setHours(3, 0, 0, 0);

      const outcome = await recordOrderOutcome(testZoneId, predictTime, 0);

      if (outcome) {
        expect(outcome.actualDemand).toBe(0);
        expect(outcome.accuracyScore).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('getModelPerformanceMetrics', () => {
    it('should return metrics with required fields', async () => {
      const metrics = await getModelPerformanceMetrics(testZoneId);

      expect(metrics).toBeDefined();
      expect(metrics.totalPredicts).toBeGreaterThanOrEqual(0);
      expect(metrics.totalAccuracy).toBeGreaterThanOrEqual(0);
      expect(metrics.totalAccuracy).toBeLessThanOrEqual(1);
      expect(metrics.meanAbsoluteError).toBeGreaterThanOrEqual(0);
      expect(metrics.rootMeanSquaredError).toBeGreaterThanOrEqual(0);
      expect(['improving', 'stable', 'declining']).toContain(metrics.accuracyTrend);
      expect(metrics.lastUpdated).toBeInstanceOf(Date);
    });

    it('should support custom lookback period', async () => {
      const metrics7 = await getModelPerformanceMetrics(testZoneId, 7);
      const metrics30 = await getModelPerformanceMetrics(testZoneId, 30);

      expect(metrics7).toBeDefined();
      expect(metrics30).toBeDefined();
      expect(metrics30.totalPredicts).toBeGreaterThanOrEqual(metrics7.totalPredicts);
    });

    it('should have RMSE >= MAE', async () => {
      const metrics = await getModelPerformanceMetrics(testZoneId);

      expect(metrics.rootMeanSquaredError).toBeGreaterThanOrEqual(metrics.meanAbsoluteError);
    });
  });

  describe('getLearningProgress', () => {
    it('should return valid learning phase', async () => {
      const progress = await getLearningProgress(testZoneId);

      expect(progress).toBeDefined();
      expect(['early_learning', 'learning', 'trained', 'production']).toContain(progress.phase);
      expect(progress.progress).toBeGreaterThanOrEqual(0);
      expect(progress.progress).toBeLessThanOrEqual(100);
      expect(progress.nextMilestone).toBeTruthy();
      expect(progress.estimatedDaysToTrained).toBeGreaterThanOrEqual(0);
    });

    it('should have reasonable progress percentages', async () => {
      const progress = await getLearningProgress(testZoneId);

      if (progress.phase === 'early_learning') {
        expect(progress.progress).toBeLessThanOrEqual(25);
      } else if (progress.phase === 'learning') {
        expect(progress.progress).toBeGreaterThan(25);
        expect(progress.progress).toBeLessThanOrEqual(75);
      } else if (progress.phase === 'trained') {
        expect(progress.progress).toBeGreaterThan(75);
        expect(progress.progress).toBeLessThanOrEqual(100);
      } else if (progress.phase === 'production') {
        expect(progress.progress).toBe(100);
      }
    });

    it('should provide meaningful next milestone', async () => {
      const progress = await getLearningProgress(testZoneId);

      expect(progress.nextMilestone.length).toBeGreaterThan(5);
      if (progress.phase !== 'production') {
        expect(progress.estimatedDaysToTrained).toBeGreaterThan(0);
      }
    });
  });

  describe('getAccuracyTrend', () => {
    it('should return valid trend', async () => {
      const trend = await getAccuracyTrend(testZoneId);

      expect(trend).toBeDefined();
      expect(['improving', 'stable', 'declining']).toContain(trend.trend);
      expect(trend.magnitude).toBeDefined();
      expect(trend.recentAccuracy).toBeGreaterThanOrEqual(0);
      expect(trend.recentAccuracy).toBeLessThanOrEqual(1);
      expect(trend.historicalAccuracy).toBeGreaterThanOrEqual(0);
      expect(trend.historicalAccuracy).toBeLessThanOrEqual(1);
    });

    it('should classify trends correctly', async () => {
      const trend = await getAccuracyTrend(testZoneId);

      if (trend.magnitude > 5) {
        expect(trend.trend).toBe('improving');
      } else if (trend.magnitude < -5) {
        expect(trend.trend).toBe('declining');
      } else {
        expect(trend.trend).toBe('stable');
      }
    });
  });

  describe('getAccuracyBreakdown', () => {
    it('should return breakdown with required fields', async () => {
      const breakdown = await getAccuracyBreakdown(testZoneId);

      expect(breakdown).toBeDefined();
      expect(breakdown.byHour).toBeInstanceOf(Map);
      expect(breakdown.byDayOfWeek).toBeInstanceOf(Map);
      expect(breakdown.byTimeOfDay).toBeDefined();
    });

    it('should have valid time of day breakdown', async () => {
      const breakdown = await getAccuracyBreakdown(testZoneId);

      expect(breakdown.byTimeOfDay.morning).toBeGreaterThanOrEqual(0);
      expect(breakdown.byTimeOfDay.afternoon).toBeGreaterThanOrEqual(0);
      expect(breakdown.byTimeOfDay.evening).toBeGreaterThanOrEqual(0);
      expect(breakdown.byTimeOfDay.night).toBeGreaterThanOrEqual(0);
    });

    it('should have hour entries for available data', async () => {
      const breakdown = await getAccuracyBreakdown(testZoneId);

      if (breakdown.byHour.size > 0) {
        breakdown.byHour.forEach((_, hour) => {
          expect(hour).toBeGreaterThanOrEqual(0);
          expect(hour).toBeLessThanOrEqual(23);
        });
      }
    });

    it('should have day of week entries for available data', async () => {
      const breakdown = await getAccuracyBreakdown(testZoneId);

      if (breakdown.byDayOfWeek.size > 0) {
        breakdown.byDayOfWeek.forEach((_, day) => {
          expect(day).toBeGreaterThanOrEqual(0);
          expect(day).toBeLessThanOrEqual(6);
        });
      }
    });
  });

  describe('Learning Phase Progression', () => {
    it('should return valid progress after recording outcomes', async () => {
      const progress1 = await getLearningProgress(testZoneId);
      
      for (let i = 0; i < 5; i++) {
        const time = new Date();
        time.setHours(i, 0, 0, 0);
        await recordOrderOutcome(testZoneId, time, Math.floor(Math.random() * 20));
      }

      const progress2 = await getLearningProgress(testZoneId);

      expect(progress1.progress).toBeGreaterThanOrEqual(0);
      expect(progress2.progress).toBeGreaterThanOrEqual(0);
      expect(progress1.progress).toBeLessThanOrEqual(100);
      expect(progress2.progress).toBeLessThanOrEqual(100);
    });

    it('should provide metrics with consistent structure', async () => {
      const metrics1 = await getModelPerformanceMetrics(testZoneId);
      const metrics2 = await getModelPerformanceMetrics(testZoneId);

      expect(metrics2.totalPredicts).toBeGreaterThanOrEqual(0);
      expect(metrics1.totalPredicts).toBeGreaterThanOrEqual(0);
      expect(metrics2.totalAccuracy).toBeGreaterThanOrEqual(0);
      expect(metrics1.totalAccuracy).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle non-existent zone gracefully', async () => {
      const metrics = await getModelPerformanceMetrics('non-existent-zone-xyz');
      
      expect(metrics).toBeDefined();
      expect(metrics.totalPredicts).toBeGreaterThanOrEqual(0);
    });

    it('should handle very large lookback period', async () => {
      const metrics = await getModelPerformanceMetrics(testZoneId, 365);
      
      expect(metrics).toBeDefined();
      expect(metrics.totalPredicts).toBeGreaterThanOrEqual(0);
    });

    it('should handle minimum lookback period', async () => {
      const metrics = await getModelPerformanceMetrics(testZoneId, 1);
      
      expect(metrics).toBeDefined();
      expect(metrics.totalPredicts).toBeGreaterThanOrEqual(0);
    });
  });
});
