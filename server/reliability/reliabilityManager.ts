/**
 * Reliability Manager
 * Handles retry mechanisms, graceful degradation, and fallback predicting
 */

import { logger } from '../utils/logger';

interface RetryConfig {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

interface FallbackPredict {
  source: 'fallback';
  baselineValue: number;
  confidence: 'low';
  reasoning: string;
  learningStatus: 'fallback_mode';
  timestamp: number;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

/**
 * Reliability Manager
 * Ensures system continues operating even when services degrade
 */
export class ReliabilityManager {
  private readonly DEFAULT_RETRY_CONFIG: RetryConfig = {
    maxRetries: 3,
    initialDelay: 100,
    maxDelay: 5000,
    backoffMultiplier: 2,
  };

  private cache: Map<string, CacheEntry<any>> = new Map();
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();

  constructor() {
    logger.info('Reliability Manager initialized');
    this.startCacheCleanup();
  }

  /**
   * Execute function with retry logic
   */
  async executeWithRetry<T>(
    fn: () => Promise<T>,
    serviceName: string,
    config?: Partial<RetryConfig>
  ): Promise<T> {
    const retryConfig = { ...this.DEFAULT_RETRY_CONFIG, ...config };
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
      try {
        logger.info(`Executing ${serviceName} (attempt ${attempt + 1}/${retryConfig.maxRetries + 1})`);
        return await fn();
      } catch (error) {
        lastError = error as Error;
        logger.warn(`${serviceName} failed: ${lastError.message}`);

        if (attempt < retryConfig.maxRetries) {
          const delay = Math.min(
            retryConfig.initialDelay * Math.pow(retryConfig.backoffMultiplier, attempt),
            retryConfig.maxDelay
          );
          logger.info(`Retrying ${serviceName} in ${delay}ms`);
          await this.sleep(delay);
        }
      }
    }

    logger.error(`${serviceName} failed after ${retryConfig.maxRetries + 1} attempts`);
    throw lastError;
  }

  /**
   * Execute with circuit breaker pattern
   */
  async executeWithCircuitBreaker<T>(
    fn: () => Promise<T>,
    serviceName: string,
    fallback?: () => T
  ): Promise<T> {
    const breaker = this.getOrCreateCircuitBreaker(serviceName);

    if (breaker.isOpen()) {
      logger.warn(`Circuit breaker open for ${serviceName}, using fallback`);
      if (fallback) {
        return fallback();
      }
      throw new Error(`Circuit breaker open for ${serviceName}`);
    }

    try {
      const result = await fn();
      breaker.recordSuccess();
      return result;
    } catch (error) {
      breaker.recordFailure();
      logger.error(`Circuit breaker failure for ${serviceName}:`, error);

      if (fallback) {
        logger.info(`Using fallback for ${serviceName}`);
        return fallback();
      }
      throw error;
    }
  }

  /**
   * Get or create circuit breaker
   */
  private getOrCreateCircuitBreaker(serviceName: string): CircuitBreaker {
    if (!this.circuitBreakers.has(serviceName)) {
      this.circuitBreakers.set(serviceName, new CircuitBreaker(serviceName));
    }
    return this.circuitBreakers.get(serviceName)!;
  }

  /**
   * Cache data with TTL
   */
  cacheSet<T>(key: string, data: T, ttlSeconds: number = 300): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlSeconds * 1000,
    });
    logger.info(`Cached ${key} (TTL: ${ttlSeconds}s)`);
  }

  /**
   * Get cached data
   */
  cacheGet<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    logger.info(`Cache hit for ${key}`);
    return entry.data as T;
  }

  /**
   * Generate fallback predict
   */
  generateFallbackPredict(baselineValue: number, reason: string): FallbackPredict {
    logger.warn(`Generating fallback predict: ${reason}`);

    return {
      source: 'fallback',
      baselineValue,
      confidence: 'low',
      reasoning: `Fallback mode: ${reason}. Using historical baseline.`,
      learningStatus: 'fallback_mode',
      timestamp: Date.now(),
    };
  }

  /**
   * Check service health
   */
  async checkServiceHealth(
    serviceName: string,
    healthCheckFn: () => Promise<boolean>
  ): Promise<boolean> {
    try {
      return await this.executeWithRetry(healthCheckFn, `${serviceName} health check`, {
        maxRetries: 1,
      });
    } catch (error) {
      logger.error(`${serviceName} health check failed:`, error);
      return false;
    }
  }

  /**
   * Get system degradation status
   */
  getSystemStatus(): {
    status: 'healthy' | 'degraded' | 'critical';
    failingServices: string[];
    recommendations: string[];
  } {
    const failingServices = Array.from(this.circuitBreakers.entries())
      .filter(([, breaker]) => breaker.isOpen() || breaker.isHalfOpen())
      .map(([name]) => name);

    let status: 'healthy' | 'degraded' | 'critical' = 'healthy';
    const recommendations: string[] = [];

    if (failingServices.length > 2) {
      status = 'critical';
      recommendations.push('🚨 Multiple services failing, system is in critical state');
      recommendations.push('→ Check infrastructure and service dependencies');
    } else if (failingServices.length > 0) {
      status = 'degraded';
      recommendations.push(`⚠️ Services degraded: ${failingServices.join(', ')}`);
      recommendations.push('→ System is using fallback mechanisms');
      recommendations.push('→ Performance may be impacted');
    } else {
      recommendations.push('✅ All services operating normally');
    }

    return {
      status,
      failingServices,
      recommendations,
    };
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Start cache cleanup interval
   */
  private startCacheCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      let cleaned = 0;

      for (const [key, entry] of this.cache.entries()) {
        if (now - entry.timestamp > entry.ttl) {
          this.cache.delete(key);
          cleaned++;
        }
      }

      if (cleaned > 0) {
        logger.info(`Cache cleanup: removed ${cleaned} expired entries`);
      }
    }, 60000); // Every minute
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.cache.clear();
    logger.info('All caches cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    totalEntries: number;
    memoryUsage: string;
  } {
    const totalEntries = this.cache.size;
    // Rough estimate of memory usage
    const memoryUsage = `~${(totalEntries * 0.5).toFixed(2)} MB`;

    return {
      totalEntries,
      memoryUsage,
    };
  }
}

/**
 * Circuit Breaker Implementation
 */
class CircuitBreaker {
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime = 0;
  private readonly failureThreshold = 5;
  private readonly successThreshold = 2;
  private readonly timeout = 60000; // 1 minute

  constructor(private serviceName: string) {
    logger.info(`Circuit breaker created for ${serviceName}`);
  }

  /**
   * Check if circuit is open
   */
  isOpen(): boolean {
    if (this.state === 'open') {
      // Check if timeout has passed
      if (Date.now() - this.lastFailureTime > this.timeout) {
        logger.info(`Circuit breaker for ${this.serviceName} transitioning to half-open`);
        this.state = 'half-open';
        this.successCount = 0;
        return false;
      }
      return true;
    }
    return false;
  }

  /**
   * Check if circuit is half-open
   */
  isHalfOpen(): boolean {
    return this.state === 'half-open';
  }

  /**
   * Record success
   */
  recordSuccess(): void {
    this.failureCount = 0;

    if (this.state === 'half-open') {
      this.successCount++;
      if (this.successCount >= this.successThreshold) {
        logger.info(`Circuit breaker for ${this.serviceName} transitioning to closed`);
        this.state = 'closed';
        this.successCount = 0;
      }
    }
  }

  /**
   * Record failure
   */
  recordFailure(): void {
    this.lastFailureTime = Date.now();
    this.failureCount++;

    if (this.failureCount >= this.failureThreshold) {
      logger.warn(`Circuit breaker for ${this.serviceName} opening`);
      this.state = 'open';
    }
  }

  /**
   * Get state
   */
  getState(): string {
    return this.state;
  }
}

// Export singleton instance
export const reliabilityManager = new ReliabilityManager();
