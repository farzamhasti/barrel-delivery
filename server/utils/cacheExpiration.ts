/**
 * Cache Expiration and Stale Data Prevention
 * Phase 94: Implement Cache Expiration and Stale Data Prevention
 */

import { predictionCache } from './predictionCache';

interface CacheExpirationConfig {
  checkIntervalMs: number; // How often to check for expired entries
  enableAutoCleanup: boolean; // Automatically clean expired entries
  logExpirations: boolean; // Log when entries expire
}

const DEFAULT_CONFIG: CacheExpirationConfig = {
  checkIntervalMs: 60000, // Check every 60 seconds
  enableAutoCleanup: true,
  logExpirations: true,
};

class CacheExpirationMonitor {
  private config: CacheExpirationConfig;
  private cleanupIntervalId: NodeJS.Timeout | null = null;
  private expirationLog: Array<{ key: string; expiredAt: Date; ttl: number }> = [];

  constructor(config: Partial<CacheExpirationConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Start monitoring for cache expiration
   */
  start(): void {
    if (this.cleanupIntervalId) {
      console.warn('Cache expiration monitor already running');
      return;
    }

    this.cleanupIntervalId = setInterval(() => {
      this.checkAndCleanExpiredEntries();
    }, this.config.checkIntervalMs);

    console.log(`Cache expiration monitor started (check interval: ${this.config.checkIntervalMs}ms)`);
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId);
      this.cleanupIntervalId = null;
      console.log('Cache expiration monitor stopped');
    }
  }

  /**
   * Check and clean expired entries
   */
  private checkAndCleanExpiredEntries(): void {
    const expiredCount = predictionCache.clearExpired();

    if (expiredCount > 0 && this.config.logExpirations) {
      console.log(`[Cache] Cleaned ${expiredCount} expired entries`);
    }
  }

  /**
   * Get cache health status
   */
  getHealthStatus(): {
    isRunning: boolean;
    cacheSize: number;
    stats: any;
    expirationLogSize: number;
  } {
    return {
      isRunning: this.cleanupIntervalId !== null,
      cacheSize: predictionCache.size(),
      stats: predictionCache.getStats(),
      expirationLogSize: this.expirationLog.length,
    };
  }

  /**
   * Get expiration log
   */
  getExpirationLog(): Array<{ key: string; expiredAt: Date; ttl: number }> {
    return [...this.expirationLog];
  }

  /**
   * Clear expiration log
   */
  clearExpirationLog(): void {
    this.expirationLog = [];
  }
}

// Export singleton instance
export const cacheExpirationMonitor = new CacheExpirationMonitor({
  checkIntervalMs: 60000, // Check every 60 seconds
  enableAutoCleanup: true,
  logExpirations: true,
});

/**
 * Middleware to prevent serving expired predictions
 */
export function preventStaleDataMiddleware(
  data: any,
  cacheKey: string,
  maxAgeMs: number = 15 * 60 * 1000 // 15 minutes default
): { isStale: boolean; data: any; warning?: string } {
  if (!data || !data.timestamp) {
    return { isStale: false, data };
  }

  const dataAge = Date.now() - new Date(data.timestamp).getTime();

  if (dataAge > maxAgeMs) {
    return {
      isStale: true,
      data: null,
      warning: `Data for ${cacheKey} is stale (${(dataAge / 1000).toFixed(0)}s old, max ${(maxAgeMs / 1000).toFixed(0)}s)`,
    };
  }

  return {
    isStale: false,
    data,
  };
}

/**
 * Helper to get cache TTL remaining
 */
export function getCacheTTLRemaining(cacheKey: string): {
  hasEntry: boolean;
  remainingMs: number;
  remainingSeconds: number;
  isExpired: boolean;
} {
  const remaining = predictionCache.getTimeRemaining(cacheKey);

  return {
    hasEntry: remaining > 0,
    remainingMs: remaining,
    remainingSeconds: Math.ceil(remaining / 1000),
    isExpired: remaining <= 0,
  };
}

/**
 * Batch check multiple cache entries for expiration
 */
export function batchCheckCacheExpiration(
  cacheKeys: string[]
): Array<{ key: string; expired: boolean; remainingMs: number }> {
  return cacheKeys.map(key => {
    const remaining = predictionCache.getTimeRemaining(key);
    return {
      key,
      expired: remaining <= 0,
      remainingMs: remaining,
    };
  });
}

/**
 * Get cache efficiency metrics
 */
export function getCacheEfficiencyMetrics(): {
  hitRate: number;
  missRate: number;
  expirationRate: number;
  avgCacheSize: number;
  recommendation: string;
} {
  const stats = predictionCache.getStats();
  const total = stats.hits + stats.misses;
  const hitRate = total > 0 ? (stats.hits / total) * 100 : 0;
  const missRate = total > 0 ? (stats.misses / total) * 100 : 0;
  const expirationRate = total > 0 ? (stats.expirations / total) * 100 : 0;

  let recommendation = '';
  if (hitRate < 50) {
    recommendation = 'Low hit rate - consider increasing TTL values';
  } else if (expirationRate > 30) {
    recommendation = 'High expiration rate - consider longer TTL values';
  } else if (hitRate > 80) {
    recommendation = 'Excellent cache efficiency - current TTL values are optimal';
  }

  return {
    hitRate: parseFloat(hitRate.toFixed(2)),
    missRate: parseFloat(missRate.toFixed(2)),
    expirationRate: parseFloat(expirationRate.toFixed(2)),
    avgCacheSize: stats.size,
    recommendation,
  };
}
