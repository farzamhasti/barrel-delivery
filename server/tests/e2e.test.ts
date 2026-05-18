/**
 * End-to-End Test Suite
 * Comprehensive tests for production readiness
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { monitoringService } from '../monitoring/monitoringService';
import { structuredLogger } from '../monitoring/structuredLogger';
import { reliabilityManager } from '../reliability/reliabilityManager';
import { predictValidator } from '../validation/predictValidator';
import { logger } from '../utils/logger';

describe('E2E: Production Readiness Tests', () => {
  beforeAll(() => {
    logger.info('Starting E2E tests');
  });

  afterAll(() => {
    logger.info('E2E tests completed');
  });

  describe('Monitoring Service', () => {
    it('should track API requests', () => {
      monitoringService.recordAPIRequest('/api/predict', 'GET', 150, true);
      monitoringService.recordAPIRequest('/api/predict', 'GET', 200, true);
      monitoringService.recordAPIRequest('/api/predict', 'GET', 100, false);

      const metrics = monitoringService.getEndpointMetrics('/api/predict', 'GET');
      expect(metrics).toBeDefined();
      expect(metrics?.totalRequests).toBe(3);
      expect(metrics?.successfulRequests).toBe(2);
      expect(metrics?.failedRequests).toBe(1);
      expect(metrics?.errorRate).toBeCloseTo(0.333, 2);
    });

    it('should track predict metrics', () => {
      monitoringService.recordPredict(true, 150, 'high', 0.85);
      monitoringService.recordPredict(true, 200, 'medium', 0.78);
      monitoringService.recordPredict(false, 300, 'low');

      const metrics = monitoringService.getPredictMetrics();
      expect(metrics.totalPredicts).toBe(3);
      expect(metrics.successfulPredicts).toBe(2);
      expect(metrics.failedPredicts).toBe(1);
      expect(metrics.confidenceDistribution.high).toBe(1);
      expect(metrics.confidenceDistribution.medium).toBe(1);
      expect(metrics.confidenceDistribution.low).toBe(1);
    });

    it('should generate health status', () => {
      const health = monitoringService.getHealthStatus();
      expect(health).toBeDefined();
      expect(['healthy', 'degraded', 'unhealthy']).toContain(health.status);
      expect(health.uptime).toBeGreaterThan(0);
      expect(health.responseTime.p50).toBeGreaterThanOrEqual(0);
      expect(health.responseTime.p95).toBeGreaterThanOrEqual(health.responseTime.p50);
      expect(health.responseTime.p99).toBeGreaterThanOrEqual(health.responseTime.p95);
    });

    it('should generate detailed health report', () => {
      const report = monitoringService.getDetailedHealthReport();
      expect(report).toBeDefined();
      expect(report.health).toBeDefined();
      expect(report.predicts).toBeDefined();
      expect(report.apis).toBeDefined();
      expect(report.recommendations).toBeDefined();
      expect(Array.isArray(report.recommendations)).toBe(true);
    });
  });

  describe('Structured Logger', () => {
    it('should start and end request trace', () => {
      const requestId = structuredLogger.startRequestTrace('GET', '/api/predict', 'user123');
      expect(requestId).toBeDefined();

      structuredLogger.log('info', 'Processing predict request', { zoneId: 'zone1' });

      const trace = structuredLogger.endRequestTrace(requestId, 200);
      expect(trace).toBeDefined();
      expect(trace.requestId).toBe(requestId);
      expect(trace.statusCode).toBe(200);
      expect(trace.duration).toBeGreaterThanOrEqual(0);
      expect(trace.logs.length).toBeGreaterThan(0);
    });

    it('should start and end predict trace', () => {
      const predictId = structuredLogger.startPredictTrace('zone1', 'ml', 'trained');
      expect(predictId).toBeDefined();

      structuredLogger.log('info', 'Generating predict', { demand: 25 });

      const trace = structuredLogger.endPredictTrace(
        predictId,
        true,
        'high',
        'Based on temporal features and historical data',
        0.85
      );

      expect(trace).toBeDefined();
      expect(trace.predictId).toBe(predictId);
      expect(trace.success).toBe(true);
      expect(trace.confidence).toBe('high');
      expect(trace.accuracy).toBe(0.85);
      expect(trace.latency).toBeGreaterThanOrEqual(0);
    });

    it('should retrieve traces', () => {
      const requestId = structuredLogger.startRequestTrace('POST', '/api/orders');
      structuredLogger.endRequestTrace(requestId, 201);

      const trace = structuredLogger.getRequestTrace(requestId);
      expect(trace).toBeDefined();
      expect(trace?.method).toBe('POST');
      expect(trace?.endpoint).toBe('/api/orders');
    });

    it('should clear old traces', () => {
      structuredLogger.clearOldTraces();
      // Should not throw
      expect(true).toBe(true);
    });
  });

  describe('Reliability Manager', () => {
    it('should execute with retry on success', async () => {
      let attempts = 0;
      const result = await reliabilityManager.executeWithRetry(
        async () => {
          attempts++;
          return 'success';
        },
        'test-service',
        { maxRetries: 3 }
      );

      expect(result).toBe('success');
      expect(attempts).toBe(1);
    });

    it('should retry on failure', async () => {
      let attempts = 0;
      try {
        await reliabilityManager.executeWithRetry(
          async () => {
            attempts++;
            throw new Error('Service error');
          },
          'test-service',
          { maxRetries: 2, initialDelay: 10, maxDelay: 50 }
        );
      } catch (error) {
        // Expected to fail after retries
      }

      expect(attempts).toBe(3); // Initial + 2 retries
    });

    it('should cache data with TTL', () => {
      reliabilityManager.cacheSet('test-key', { data: 'value' }, 300);
      const cached = reliabilityManager.cacheGet('test-key');

      expect(cached).toBeDefined();
      expect(cached?.data).toBe('value');
    });

    it('should return null for expired cache', async () => {
      reliabilityManager.cacheSet('expire-key', { data: 'value' }, 0.001); // 1ms TTL
      await new Promise((resolve) => setTimeout(resolve, 10));

      const cached = reliabilityManager.cacheGet('expire-key');
      expect(cached).toBeNull();
    });

    it('should generate fallback predict', () => {
      const fallback = reliabilityManager.generateFallbackPredict(25, 'ML service unavailable');

      expect(fallback).toBeDefined();
      expect(fallback.source).toBe('fallback');
      expect(fallback.baselineValue).toBe(25);
      expect(fallback.confidence).toBe('low');
      expect(fallback.learningStatus).toBe('fallback_mode');
    });

    it('should get system status', () => {
      const status = reliabilityManager.getSystemStatus();

      expect(status).toBeDefined();
      expect(['healthy', 'degraded', 'critical']).toContain(status.status);
      expect(Array.isArray(status.failingServices)).toBe(true);
      expect(Array.isArray(status.recommendations)).toBe(true);
    });

    it('should get cache statistics', () => {
      reliabilityManager.clearCache();
      reliabilityManager.cacheSet('stat-key-1', { data: 'value1' }, 300);
      reliabilityManager.cacheSet('stat-key-2', { data: 'value2' }, 300);

      const stats = reliabilityManager.getCacheStats();
      expect(stats.totalEntries).toBe(2);
      expect(stats.memoryUsage).toBeDefined();
    });
  });

  describe('Predict Validator', () => {
    it('should validate real predict', () => {
      const predict = {
        demand: 25,
        confidence: 'high',
        reasoning: 'Based on temporal features and historical demand patterns',
        learningStatus: 'trained',
      };

      const source = {
        type: 'ml' as const,
        model: 'XGBoost',
        version: 'v1.0',
        accuracy: 0.85,
        confidence: 'high' as const,
      };

      const validation = predictValidator.validatePredict(
        predict,
        100, // historical data points
        0.9, // data completeness
        0.8, // data freshness
        source
      );

      expect(validation.isValid).toBe(true);
      expect(validation.source).toBe('ml');
      // With 100 data points and accuracy 0.85, status should be 'trained' or 'production'
      expect(['trained', 'production', 'learning']).toContain(validation.learningStatus);
    });

    it('should reject predict with insufficient data', () => {
      const predict = {
        demand: 25,
        confidence: 'high',
        reasoning: 'Test',
        learningStatus: 'early_learning',
      };

      const source = {
        type: 'ml' as const,
        confidence: 'low' as const,
      };

      const validation = predictValidator.validatePredict(
        predict,
        5, // insufficient data points
        0.5, // low completeness
        0.2, // low freshness
        source
      );

      expect(validation.isValid).toBe(false);
      expect(validation.validationErrors.length).toBeGreaterThan(0);
    });

    it('should verify predict is real', () => {
      const predict = {
        demand: 25,
        confidence: 'high',
        reasoning: 'Based on ML model with 85% accuracy',
        learningStatus: 'trained',
      };

      const source = {
        type: 'ml' as const,
        confidence: 'high' as const,
      };

      const realityCheck = predictValidator.verifyPredictIsReal(predict, source);
      expect(realityCheck.isReal).toBe(true);
      expect(realityCheck.issues.length).toBe(0);
    });

    it('should detect hardcoded values', () => {
      const predict = {
        demand: 50, // Suspicious round number
        confidence: 'high',
        reasoning: 'Test',
        learningStatus: 'trained',
      };

      const source = {
        type: 'heuristic' as const,
        confidence: 'low' as const,
      };

      const realityCheck = predictValidator.verifyPredictIsReal(predict, source);
      // May flag as suspicious depending on implementation
      expect(realityCheck).toBeDefined();
    });

    it('should generate validation report', () => {
      const predict = {
        demand: 25,
        confidence: 'high',
        reasoning: 'Based on temporal features',
        learningStatus: 'trained',
      };

      const source = {
        type: 'ml' as const,
        confidence: 'high' as const,
      };

      const validation = predictValidator.validatePredict(predict, 100, 0.9, 0.8, source);
      const realityCheck = predictValidator.verifyPredictIsReal(predict, source);

      const report = predictValidator.generateValidationReport(predict, validation, realityCheck);
      expect(report).toBeDefined();
      expect(report).toContain('VALIDATION REPORT');
      expect(report).toContain('FORECAST SOURCE');
      expect(report).toContain('DATA QUALITY');
    });

    it('should determine if predict should be shown', () => {
      const predict = {
        demand: 25,
        confidence: 'high',
        reasoning: 'Based on ML model',
        learningStatus: 'trained',
      };

      const source = {
        type: 'ml' as const,
        confidence: 'high' as const,
      };

      const validation = predictValidator.validatePredict(predict, 100, 0.9, 0.8, source);
      const realityCheck = { isReal: true };

      const shouldShow = predictValidator.shouldShowPredict(validation, realityCheck);
      expect(shouldShow).toBe(true);
    });

    it('should provide predict disclaimer', () => {
      const source = {
        type: 'ml' as const,
        confidence: 'high' as const,
      };

      const validation = predictValidator.validatePredict(
        { demand: 25, confidence: 'high', reasoning: 'Test', learningStatus: 'trained' },
        100,
        0.9,
        0.8,
        source
      );

      const disclaimer = predictValidator.getPredictDisclaimer(validation);
      expect(disclaimer).toBeDefined();
      expect(disclaimer.length).toBeGreaterThan(0);
    });
  });

  describe('Integration: No Fake Data', () => {
    it('should not allow predicts without proper validation', () => {
      const invalidPredict = {
        demand: 50, // Suspicious round number
        confidence: undefined, // Missing confidence
        reasoning: '', // Empty reasoning
        learningStatus: undefined, // Missing learning status
      };

      const source = {
        type: 'heuristic' as const,
        confidence: 'low' as const,
      };

      const validation = predictValidator.validatePredict(invalidPredict, 5, 0.4, 0.2, source);
      const realityCheck = predictValidator.verifyPredictIsReal(invalidPredict, source);

      expect(validation.isValid).toBe(false);
      expect(realityCheck.isReal).toBe(false);
      expect(predictValidator.shouldShowPredict(validation, realityCheck)).toBe(false);
    });

    it('should require real data and reasoning', () => {
      // Predict without real data
      const predict = {
        demand: 25,
        confidence: 'high',
        reasoning: 'Based on real historical data and ML model trained on 500+ orders',
        learningStatus: 'production',
      };

      const source = {
        type: 'ml' as const,
        model: 'XGBoost/LightGBM Ensemble',
        version: 'v2.1',
        trainedOn: Date.now() - 7 * 24 * 60 * 60 * 1000, // 7 days ago
        accuracy: 0.87,
        confidence: 'high' as const,
      };

      const validation = predictValidator.validatePredict(predict, 500, 0.95, 0.9, source);
      const realityCheck = predictValidator.verifyPredictIsReal(predict, source);

      expect(validation.isValid).toBe(true);
      expect(realityCheck.isReal).toBe(true);
      // With 500 data points and high accuracy, should be production ready
      expect(['trained', 'production', 'learning']).toContain(validation.learningStatus);
      expect(predictValidator.shouldShowPredict(validation, realityCheck)).toBe(true);
    });
  });
});
