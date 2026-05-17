/**
 * Live Forecast Update Engine
 * Updates forecasts every few minutes and adapts to new orders
 */

import { logger } from '../utils/logger';

interface ForecastUpdate {
  timestamp: number;
  zoneId: string;
  predictedDemand: number;
  confidence: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  newOrdersCount: number;
  adaptationFactor: number;
}

interface LiveForecastState {
  lastUpdate: number;
  forecasts: Map<string, ForecastUpdate>;
  updateInterval: number;
  newOrdersSinceUpdate: number;
  adaptationThreshold: number;
}

/**
 * Live Forecast Engine
 * Continuously updates forecasts based on real-time order data
 */
export class LiveForecastEngine {
  private state: LiveForecastState;
  private updateIntervals: Map<string, NodeJS.Timeout> = new Map();
  private readonly DEFAULT_UPDATE_INTERVAL = 5 * 60 * 1000; // 5 minutes
  private readonly ADAPTATION_THRESHOLD = 3; // Trigger update after 3 new orders

  constructor() {
    this.state = {
      lastUpdate: Date.now(),
      forecasts: new Map(),
      updateInterval: this.DEFAULT_UPDATE_INTERVAL,
      newOrdersSinceUpdate: 0,
      adaptationThreshold: this.ADAPTATION_THRESHOLD,
    };
    logger.info('Live Forecast Engine initialized');
  }

  /**
   * Start live forecast updates for a zone
   */
  startLiveUpdates(zoneId: string, updateInterval?: number): void {
    const interval = updateInterval || this.DEFAULT_UPDATE_INTERVAL;

    // Clear existing interval if any
    if (this.updateIntervals.has(zoneId)) {
      clearInterval(this.updateIntervals.get(zoneId)!);
    }

    // Set up periodic updates
    const intervalId = setInterval(() => {
      this.updateForecast(zoneId);
    }, interval);

    this.updateIntervals.set(zoneId, intervalId);
    logger.info(`Live forecast updates started for zone ${zoneId} (interval: ${interval}ms)`);
  }

  /**
   * Stop live forecast updates for a zone
   */
  stopLiveUpdates(zoneId: string): void {
    if (this.updateIntervals.has(zoneId)) {
      clearInterval(this.updateIntervals.get(zoneId)!);
      this.updateIntervals.delete(zoneId);
      logger.info(`Live forecast updates stopped for zone ${zoneId}`);
    }
  }

  /**
   * Record new order and check if adaptation is needed
   */
  recordNewOrder(zoneId: string, orderData: any): boolean {
    this.state.newOrdersSinceUpdate++;

    // Check if we should trigger immediate update
    if (this.state.newOrdersSinceUpdate >= this.state.adaptationThreshold) {
      logger.info(
        `Adaptation threshold reached (${this.state.newOrdersSinceUpdate} orders). Triggering immediate update.`
      );
      this.updateForecast(zoneId);
      return true;
    }

    return false;
  }

  /**
   * Update forecast for a zone
   */
  private updateForecast(zoneId: string): void {
    const now = Date.now();
    const timeSinceLastUpdate = now - this.state.lastUpdate;

    // Calculate adaptation factor based on new orders
    const adaptationFactor = Math.min(1.0 + this.state.newOrdersSinceUpdate * 0.1, 1.5);

    // Get current forecast
    const currentForecast = this.state.forecasts.get(zoneId);

    // Calculate new forecast (simplified - in production would use ML model)
    const newForecast: ForecastUpdate = {
      timestamp: now,
      zoneId,
      predictedDemand: currentForecast
        ? currentForecast.predictedDemand * adaptationFactor
        : 25 * adaptationFactor,
      confidence: Math.min(0.5 + this.state.newOrdersSinceUpdate * 0.1, 0.95),
      trend: this.calculateTrend(currentForecast),
      newOrdersCount: this.state.newOrdersSinceUpdate,
      adaptationFactor,
    };

    this.state.forecasts.set(zoneId, newForecast);
    this.state.lastUpdate = now;
    this.state.newOrdersSinceUpdate = 0;

    logger.info(
      `Forecast updated for zone ${zoneId}: demand=${newForecast.predictedDemand.toFixed(1)}, confidence=${newForecast.confidence.toFixed(2)}, factor=${adaptationFactor.toFixed(2)}`
    );
  }

  /**
   * Calculate trend based on previous forecast
   */
  private calculateTrend(
    previousForecast: ForecastUpdate | undefined
  ): 'increasing' | 'decreasing' | 'stable' {
    if (!previousForecast) return 'stable';

    const change = this.state.newOrdersSinceUpdate;
    if (change >= 2) return 'increasing';
    if (change <= -2) return 'decreasing';
    return 'stable';
  }

  /**
   * Get current forecast for a zone
   */
  getForecast(zoneId: string): ForecastUpdate | null {
    return this.state.forecasts.get(zoneId) || null;
  }

  /**
   * Get all active forecasts
   */
  getAllForecasts(): Map<string, ForecastUpdate> {
    return new Map(this.state.forecasts);
  }

  /**
   * Get forecast statistics
   */
  getForecastStats(): {
    totalZones: number;
    averageDemand: number;
    averageConfidence: number;
    lastUpdateTime: number;
    timeSinceLastUpdate: number;
  } {
    const forecasts = Array.from(this.state.forecasts.values());

    return {
      totalZones: forecasts.length,
      averageDemand:
        forecasts.length > 0
          ? forecasts.reduce((sum, f) => sum + f.predictedDemand, 0) / forecasts.length
          : 0,
      averageConfidence:
        forecasts.length > 0
          ? forecasts.reduce((sum, f) => sum + f.confidence, 0) / forecasts.length
          : 0,
      lastUpdateTime: this.state.lastUpdate,
      timeSinceLastUpdate: Date.now() - this.state.lastUpdate,
    };
  }

  /**
   * Predict next update time
   */
  getNextUpdateTime(zoneId: string): number {
    const forecast = this.state.forecasts.get(zoneId);
    if (!forecast) return Date.now() + this.state.updateInterval;

    const timeSinceUpdate = Date.now() - forecast.timestamp;
    const nextUpdate = forecast.timestamp + this.state.updateInterval;

    return Math.max(nextUpdate, Date.now());
  }

  /**
   * Get forecast validity period
   */
  getForecastValidity(zoneId: string): {
    validFrom: number;
    validUntil: number;
    isValid: boolean;
    ageSeconds: number;
  } {
    const forecast = this.state.forecasts.get(zoneId);
    if (!forecast) {
      return {
        validFrom: 0,
        validUntil: 0,
        isValid: false,
        ageSeconds: 0,
      };
    }

    const now = Date.now();
    const ageSeconds = Math.floor((now - forecast.timestamp) / 1000);
    const validityPeriod = 15 * 60 * 1000; // 15 minutes

    return {
      validFrom: forecast.timestamp,
      validUntil: forecast.timestamp + validityPeriod,
      isValid: ageSeconds < 900, // Valid for 15 minutes
      ageSeconds,
    };
  }

  /**
   * Simulate forecast update with custom parameters
   */
  simulateUpdate(zoneId: string, newOrders: number, weatherFactor?: number): ForecastUpdate {
    const currentForecast = this.state.forecasts.get(zoneId);
    const baseDemand = currentForecast?.predictedDemand || 25;

    const weather = weatherFactor || 1.0;
    const orderFactor = 1.0 + newOrders * 0.15;

    const simulatedForecast: ForecastUpdate = {
      timestamp: Date.now(),
      zoneId,
      predictedDemand: baseDemand * orderFactor * weather,
      confidence: Math.min(0.5 + newOrders * 0.1, 0.95),
      trend: newOrders > 0 ? 'increasing' : newOrders < 0 ? 'decreasing' : 'stable',
      newOrdersCount: newOrders,
      adaptationFactor: orderFactor * weather,
    };

    logger.info(
      `Simulated forecast for zone ${zoneId}: demand=${simulatedForecast.predictedDemand.toFixed(1)}`
    );

    return simulatedForecast;
  }

  /**
   * Get forecast trend analysis
   */
  getTrendAnalysis(zoneId: string): {
    trend: string;
    momentum: number;
    direction: 'up' | 'down' | 'stable';
    confidence: number;
  } {
    const forecast = this.state.forecasts.get(zoneId);
    if (!forecast) {
      return {
        trend: 'no_data',
        momentum: 0,
        direction: 'stable',
        confidence: 0,
      };
    }

    const momentum = forecast.newOrdersCount * 0.2; // Simplified momentum calculation
    const direction =
      forecast.trend === 'increasing' ? 'up' : forecast.trend === 'decreasing' ? 'down' : 'stable';

    return {
      trend: forecast.trend,
      momentum,
      direction,
      confidence: forecast.confidence,
    };
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    for (const [zoneId, intervalId] of this.updateIntervals.entries()) {
      clearInterval(intervalId);
    }
    this.updateIntervals.clear();
    this.state.forecasts.clear();
    logger.info('Live Forecast Engine destroyed');
  }
}

// Export singleton instance
export const liveForecastEngine = new LiveForecastEngine();
