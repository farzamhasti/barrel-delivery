/**
 * Predict Cache Management
 * Handles caching of predicts with TTL (Time To Live)
 * Prevents stale data and manages cache expiration
 */

interface CachedPredict {
  data: any;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
  expiresAt: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  expirations: number;
}

class PredictCache {
  private cache: Map<string, CachedPredict> = new Map();
  private stats: CacheStats = { hits: 0, misses: 0, expirations: 0 };

  /**
   * Cache TTL constants (in milliseconds)
   */
  static readonly TTL = {
    DEMAND_FORECAST: 5 * 60 * 1000, // 5 minutes
    HOTSPOT_DATA: 10 * 60 * 1000, // 10 minutes
    RISK_ASSESSMENT: 15 * 60 * 1000, // 15 minutes
    WEATHER_DATA: 5 * 60 * 1000, // 5 minutes
    RECOMMENDATIONS: 10 * 60 * 1000, // 10 minutes
  };

  /**
   * Set a predict in cache with TTL
   */
  set(key: string, data: any, ttl: number): void {
    const now = Date.now();
    this.cache.set(key, {
      data,
      timestamp: now,
      ttl,
      expiresAt: now + ttl,
    });
  }

  /**
   * Get a predict from cache
   * Returns null if expired or not found
   */
  get(key: string): any | null {
    const cached = this.cache.get(key);

    if (!cached) {
      this.stats.misses++;
      return null;
    }

    // Check if expired
    if (Date.now() > cached.expiresAt) {
      this.cache.delete(key);
      this.stats.expirations++;
      return null;
    }

    this.stats.hits++;
    return cached.data;
  }

  /**
   * Check if a key exists and is not expired
   */
  has(key: string): boolean {
    const cached = this.cache.get(key);

    if (!cached) {
      return false;
    }

    if (Date.now() > cached.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Get time remaining until expiration (in milliseconds)
   * Returns 0 if expired or not found
   */
  getTimeRemaining(key: string): number {
    const cached = this.cache.get(key);

    if (!cached) {
      return 0;
    }

    const remaining = cached.expiresAt - Date.now();
    return remaining > 0 ? remaining : 0;
  }

  /**
   * Delete a specific cache entry
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Clear expired entries
   */
  clearExpired(): number {
    const now = Date.now();
    let count = 0;

    for (const [key, cached] of this.cache.entries()) {
      if (now > cached.expiresAt) {
        this.cache.delete(key);
        count++;
      }
    }

    return count;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats & { size: number; hitRate: number } {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;

    return {
      ...this.stats,
      size: this.cache.size,
      hitRate: parseFloat(hitRate.toFixed(2)),
    };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = { hits: 0, misses: 0, expirations: 0 };
  }

  /**
   * Get all cache keys
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }
}

// Export singleton instance
export const predictCache = new PredictCache();

/**
 * Helper function to generate cache keys
 */
export function generateCacheKey(type: string, params: Record<string, any>): string {
  const paramStr = Object.entries(params)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}:${JSON.stringify(v)}`)
    .join('|');

  return `${type}:${paramStr}`;
}

/**
 * Helper function to get appropriate TTL for predict type
 */
export function getTTLForType(type: string): number {
  const typeUpper = type.toUpperCase();

  if (typeUpper.includes('DEMAND')) {
    return PredictCache.TTL.DEMAND_FORECAST;
  } else if (typeUpper.includes('HOTSPOT')) {
    return PredictCache.TTL.HOTSPOT_DATA;
  } else if (typeUpper.includes('RISK')) {
    return PredictCache.TTL.RISK_ASSESSMENT;
  } else if (typeUpper.includes('WEATHER')) {
    return PredictCache.TTL.WEATHER_DATA;
  } else if (typeUpper.includes('RECOMMENDATION')) {
    return PredictCache.TTL.RECOMMENDATIONS;
  }

  return 10 * 60 * 1000; // Default 10 minutes
}
