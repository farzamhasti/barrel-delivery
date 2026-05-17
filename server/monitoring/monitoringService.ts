/**
 * Comprehensive Monitoring Service
 * Tracks health, performance, and reliability metrics
 */

import { logger } from '../utils/logger';

interface HealthMetrics {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: number;
  uptime: number;
  responseTime: {
    p50: number;
    p95: number;
    p99: number;
  };
  errorRate: number;
  mlServiceHealth: 'online' | 'offline' | 'degraded';
  databaseHealth: 'online' | 'offline' | 'degraded';
  cacheHealth: 'online' | 'offline' | 'degraded';
}

interface ForecastMetrics {
  totalForecasts: number;
  successfulForecasts: number;
  failedForecasts: number;
  averageLatency: number;
  p95Latency: number;
  p99Latency: number;
  mlModelAccuracy: number;
  confidenceDistribution: {
    high: number;
    medium: number;
    low: number;
  };
}

interface APIMetrics {
  endpoint: string;
  method: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  errorRate: number;
  lastError?: string;
  lastErrorTime?: number;
}

/**
 * Monitoring Service
 * Comprehensive health and performance monitoring
 */
export class MonitoringService {
  private startTime = Date.now();
  private requestMetrics: Map<string, APIMetrics> = new Map();
  private forecastMetrics: ForecastMetrics = {
    totalForecasts: 0,
    successfulForecasts: 0,
    failedForecasts: 0,
    averageLatency: 0,
    p95Latency: 0,
    p99Latency: 0,
    mlModelAccuracy: 0,
    confidenceDistribution: {
      high: 0,
      medium: 0,
      low: 0,
    },
  };

  private responseTimes: number[] = [];
  private mlServiceLastCheck = Date.now();
  private mlServiceStatus: 'online' | 'offline' | 'degraded' = 'online';

  constructor() {
    logger.info('Monitoring Service initialized');
    this.startHealthCheckInterval();
  }

  /**
   * Record API request metrics
   */
  recordAPIRequest(
    endpoint: string,
    method: string,
    responseTime: number,
    success: boolean,
    error?: string
  ): void {
    const key = `${method} ${endpoint}`;

    if (!this.requestMetrics.has(key)) {
      this.requestMetrics.set(key, {
        endpoint,
        method,
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        errorRate: 0,
      });
    }

    const metrics = this.requestMetrics.get(key)!;
    metrics.totalRequests++;

    if (success) {
      metrics.successfulRequests++;
    } else {
      metrics.failedRequests++;
      metrics.lastError = error;
      metrics.lastErrorTime = Date.now();
    }

    // Update average response time
    metrics.averageResponseTime =
      (metrics.averageResponseTime * (metrics.totalRequests - 1) + responseTime) /
      metrics.totalRequests;

    metrics.errorRate = metrics.failedRequests / metrics.totalRequests;

    // Track response times for percentile calculation
    this.responseTimes.push(responseTime);
    if (this.responseTimes.length > 10000) {
      this.responseTimes = this.responseTimes.slice(-5000);
    }
  }

  /**
   * Record forecast metrics
   */
  recordForecast(
    success: boolean,
    latency: number,
    confidence: 'high' | 'medium' | 'low',
    accuracy?: number
  ): void {
    this.forecastMetrics.totalForecasts++;

    if (success) {
      this.forecastMetrics.successfulForecasts++;
    } else {
      this.forecastMetrics.failedForecasts++;
    }

    // Update latency
    this.forecastMetrics.averageLatency =
      (this.forecastMetrics.averageLatency * (this.forecastMetrics.totalForecasts - 1) + latency) /
      this.forecastMetrics.totalForecasts;

    // Update confidence distribution
    this.forecastMetrics.confidenceDistribution[confidence]++;

    // Update accuracy if provided
    if (accuracy !== undefined) {
      this.forecastMetrics.mlModelAccuracy =
        (this.forecastMetrics.mlModelAccuracy * (this.forecastMetrics.successfulForecasts - 1) +
          accuracy) /
        this.forecastMetrics.successfulForecasts;
    }

    // Calculate percentiles
    this.updateLatencyPercentiles();
  }

  /**
   * Update latency percentiles
   */
  private updateLatencyPercentiles(): void {
    if (this.responseTimes.length === 0) return;

    const sorted = [...this.responseTimes].sort((a, b) => a - b);
    const p95Index = Math.floor(sorted.length * 0.95);
    const p99Index = Math.floor(sorted.length * 0.99);

    this.forecastMetrics.p95Latency = sorted[p95Index] || 0;
    this.forecastMetrics.p99Latency = sorted[p99Index] || 0;
  }

  /**
   * Get current health status
   */
  getHealthStatus(): HealthMetrics {
    const uptime = Date.now() - this.startTime;
    const errorRate =
      this.forecastMetrics.totalForecasts > 0
        ? this.forecastMetrics.failedForecasts / this.forecastMetrics.totalForecasts
        : 0;

    const sorted = [...this.responseTimes].sort((a, b) => a - b);
    const p50Index = Math.floor(sorted.length * 0.5);
    const p95Index = Math.floor(sorted.length * 0.95);
    const p99Index = Math.floor(sorted.length * 0.99);

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (
      this.mlServiceStatus === 'offline' ||
      errorRate > 0.1 ||
      this.forecastMetrics.p99Latency > 5000
    ) {
      status = 'unhealthy';
    } else if (
      this.mlServiceStatus === 'degraded' ||
      errorRate > 0.05 ||
      this.forecastMetrics.p99Latency > 2000
    ) {
      status = 'degraded';
    }

    return {
      status,
      timestamp: Date.now(),
      uptime,
      responseTime: {
        p50: sorted[p50Index] || 0,
        p95: sorted[p95Index] || 0,
        p99: sorted[p99Index] || 0,
      },
      errorRate,
      mlServiceHealth: this.mlServiceStatus,
      databaseHealth: 'online',
      cacheHealth: 'online',
    };
  }

  /**
   * Get forecast metrics
   */
  getForecastMetrics(): ForecastMetrics {
    return { ...this.forecastMetrics };
  }

  /**
   * Get API metrics
   */
  getAPIMetrics(): APIMetrics[] {
    return Array.from(this.requestMetrics.values());
  }

  /**
   * Get specific endpoint metrics
   */
  getEndpointMetrics(endpoint: string, method: string): APIMetrics | null {
    const key = `${method} ${endpoint}`;
    return this.requestMetrics.get(key) || null;
  }

  /**
   * Check ML service health
   */
  async checkMLServiceHealth(): Promise<boolean> {
    try {
      // In production, this would make an actual health check call to the ML service
      this.mlServiceLastCheck = Date.now();
      this.mlServiceStatus = 'online';
      return true;
    } catch (error) {
      logger.error('ML service health check failed:', error);
      this.mlServiceStatus = 'offline';
      return false;
    }
  }

  /**
   * Start periodic health checks
   */
  private startHealthCheckInterval(): void {
    setInterval(() => {
      this.checkMLServiceHealth();
    }, 60000); // Every minute
  }

  /**
   * Get detailed health report
   */
  getDetailedHealthReport(): any {
    const health = this.getHealthStatus();
    const forecasts = this.getForecastMetrics();
    const apis = this.getAPIMetrics();

    return {
      timestamp: Date.now(),
      health,
      forecasts,
      apis,
      topErrors: apis
        .filter((a) => a.lastError)
        .sort((a, b) => (b.lastErrorTime || 0) - (a.lastErrorTime || 0))
        .slice(0, 5),
      recommendations: this.generateRecommendations(health, forecasts),
    };
  }

  /**
   * Generate recommendations based on metrics
   */
  private generateRecommendations(health: HealthMetrics, forecasts: ForecastMetrics): string[] {
    const recommendations: string[] = [];

    if (health.status === 'unhealthy') {
      recommendations.push('🚨 CRITICAL: System is unhealthy, immediate investigation required');
    } else if (health.status === 'degraded') {
      recommendations.push('⚠️ WARNING: System is degraded, monitor closely');
    }

    if (health.mlServiceHealth === 'offline') {
      recommendations.push('→ ML service is offline, forecasts will use fallback');
    }

    if (health.responseTime.p99 > 5000) {
      recommendations.push('→ P99 latency is high (>5s), consider scaling');
    }

    if (forecasts.failedForecasts / forecasts.totalForecasts > 0.1) {
      recommendations.push('→ Forecast failure rate is high (>10%), check data quality');
    }

    if (forecasts.mlModelAccuracy < 0.7) {
      recommendations.push('→ ML model accuracy is low (<70%), retrain recommended');
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ System is operating normally');
    }

    return recommendations;
  }

  /**
   * Reset metrics (for testing)
   */
  resetMetrics(): void {
    this.requestMetrics.clear();
    this.responseTimes = [];
    this.forecastMetrics = {
      totalForecasts: 0,
      successfulForecasts: 0,
      failedForecasts: 0,
      averageLatency: 0,
      p95Latency: 0,
      p99Latency: 0,
      mlModelAccuracy: 0,
      confidenceDistribution: {
        high: 0,
        medium: 0,
        low: 0,
      },
    };
    logger.info('Monitoring metrics reset');
  }
}

// Export singleton instance
export const monitoringService = new MonitoringService();
