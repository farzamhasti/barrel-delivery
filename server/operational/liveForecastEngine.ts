/**
 * Live Predict Update Engine
 * Updates predicts every few minutes and adapts to new orders
 */

import { logger } from '../utils/logger';

interface PredictUpdate {
  timestamp: number;
  zoneId: string;
  predictedDemand: number;
  confidence: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  newOrdersCount: number;
  adaptationFactor: number;
}

interface LivePredictState {
  lastUpdate: number;
  predicts: Map<string, PredictUpdate>;
  updateInterval: number;
  newOrdersSinceUpdate: number;
  adaptationThreshold: number;
}

/**
 * Live Predict Engine
 * Continuously updates predicts based on real-time order data
 */
export class LivePredictEngine {
  private state: LivePredictState;
  private updateIntervals: Map<string, NodeJS.Timeout> = new Map();
  private readonly DEFAULT_UPDATE_INTERVAL = 5 * 60 * 1000; // 5 minutes
  private readonly ADAPTATION_THRESHOLD = 3; // Trigger update after 3 new orders

  constructor() {
    this.state = {
      lastUpdate: Date.now(),
      predicts: new Map(),
      updateInterval: this.DEFAULT_UPDATE_INTERVAL,
      newOrdersSinceUpdate: 0,
      adaptationThreshold: this.ADAPTATION_THRESHOLD,
    };
    logger.info('Live Predict Engine initialized');
  }

  /**
   * Start live predict updates for a zone
   */
  startLiveUpdates(zoneId: string, updateInterval?: number): void {
    const interval = updateInterval || this.DEFAULT_UPDATE_INTERVAL;

    // Clear existing interval if any
    if (this.updateIntervals.has(zoneId)) {
      clearInterval(this.updateIntervals.get(zoneId)!);
    }

    // Set up periodic updates
    const intervalId = setInterval(() => {
      this.updatePredict(zoneId);
    }, interval);

    this.updateIntervals.set(zoneId, intervalId);
    logger.info(`Live predict updates started for zone ${zoneId} (interval: ${interval}ms)`);
  }

  /**
   * Stop live predict updates for a zone
   */
  stopLiveUpdates(zoneId: string): void {
    if (this.updateIntervals.has(zoneId)) {
      clearInterval(this.updateIntervals.get(zoneId)!);
      this.updateIntervals.delete(zoneId);
      logger.info(`Live predict updates stopped for zone ${zoneId}`);
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
      this.updatePredict(zoneId);
      return true;
    }

    return false;
  }

  /**
   * Update predict for a zone
   */
  private updatePredict(zoneId: string): void {
    const now = Date.now();
    const timeSinceLastUpdate = now - this.state.lastUpdate;

    // Calculate adaptation factor based on new orders
    const adaptationFactor = Math.min(1.0 + this.state.newOrdersSinceUpdate * 0.1, 1.5);

    // Get current predict
    const currentPredict = this.state.predicts.get(zoneId);

    // Calculate new predict (simplified - in production would use ML model)
    const newPredict: PredictUpdate = {
      timestamp: now,
      zoneId,
      predictedDemand: currentPredict
        ? currentPredict.predictedDemand * adaptationFactor
        : 25 * adaptationFactor,
      confidence: Math.min(0.5 + this.state.newOrdersSinceUpdate * 0.1, 0.95),
      trend: this.calculateTrend(currentPredict),
      newOrdersCount: this.state.newOrdersSinceUpdate,
      adaptationFactor,
    };

    this.state.predicts.set(zoneId, newPredict);
    this.state.lastUpdate = now;
    this.state.newOrdersSinceUpdate = 0;

    logger.info(
      `Predict updated for zone ${zoneId}: demand=${newPredict.predictedDemand.toFixed(1)}, confidence=${newPredict.confidence.toFixed(2)}, factor=${adaptationFactor.toFixed(2)}`
    );
  }

  /**
   * Calculate trend based on previous predict
   */
  private calculateTrend(
    previousPredict: PredictUpdate | undefined
  ): 'increasing' | 'decreasing' | 'stable' {
    if (!previousPredict) return 'stable';

    const change = this.state.newOrdersSinceUpdate;
    if (change >= 2) return 'increasing';
    if (change <= -2) return 'decreasing';
    return 'stable';
  }

  /**
   * Get current predict for a zone
   */
  getPredict(zoneId: string): PredictUpdate | null {
    return this.state.predicts.get(zoneId) || null;
  }

  /**
   * Get all active predicts
   */
  getAllPredicts(): Map<string, PredictUpdate> {
    return new Map(this.state.predicts);
  }

  /**
   * Get predict statistics
   */
  getPredictStats(): {
    totalZones: number;
    averageDemand: number;
    averageConfidence: number;
    lastUpdateTime: number;
    timeSinceLastUpdate: number;
  } {
    const predicts = Array.from(this.state.predicts.values());

    return {
      totalZones: predicts.length,
      averageDemand:
        predicts.length > 0
          ? predicts.reduce((sum, f) => sum + f.predictedDemand, 0) / predicts.length
          : 0,
      averageConfidence:
        predicts.length > 0
          ? predicts.reduce((sum, f) => sum + f.confidence, 0) / predicts.length
          : 0,
      lastUpdateTime: this.state.lastUpdate,
      timeSinceLastUpdate: Date.now() - this.state.lastUpdate,
    };
  }

  /**
   * Predict next update time
   */
  getNextUpdateTime(zoneId: string): number {
    const predict = this.state.predicts.get(zoneId);
    if (!predict) return Date.now() + this.state.updateInterval;

    const timeSinceUpdate = Date.now() - predict.timestamp;
    const nextUpdate = predict.timestamp + this.state.updateInterval;

    return Math.max(nextUpdate, Date.now());
  }

  /**
   * Get predict validity period
   */
  getPredictValidity(zoneId: string): {
    validFrom: number;
    validUntil: number;
    isValid: boolean;
    ageSeconds: number;
  } {
    const predict = this.state.predicts.get(zoneId);
    if (!predict) {
      return {
        validFrom: 0,
        validUntil: 0,
        isValid: false,
        ageSeconds: 0,
      };
    }

    const now = Date.now();
    const ageSeconds = Math.floor((now - predict.timestamp) / 1000);
    const validityPeriod = 15 * 60 * 1000; // 15 minutes

    return {
      validFrom: predict.timestamp,
      validUntil: predict.timestamp + validityPeriod,
      isValid: ageSeconds < 900, // Valid for 15 minutes
      ageSeconds,
    };
  }

  /**
   * Simulate predict update with custom parameters
   */
  simulateUpdate(zoneId: string, newOrders: number, weatherFactor?: number): PredictUpdate {
    const currentPredict = this.state.predicts.get(zoneId);
    const baseDemand = currentPredict?.predictedDemand || 25;

    const weather = weatherFactor || 1.0;
    const orderFactor = 1.0 + newOrders * 0.15;

    const simulatedPredict: PredictUpdate = {
      timestamp: Date.now(),
      zoneId,
      predictedDemand: baseDemand * orderFactor * weather,
      confidence: Math.min(0.5 + newOrders * 0.1, 0.95),
      trend: newOrders > 0 ? 'increasing' : newOrders < 0 ? 'decreasing' : 'stable',
      newOrdersCount: newOrders,
      adaptationFactor: orderFactor * weather,
    };

    logger.info(
      `Simulated predict for zone ${zoneId}: demand=${simulatedPredict.predictedDemand.toFixed(1)}`
    );

    return simulatedPredict;
  }

  /**
   * Get predict trend analysis
   */
  getTrendAnalysis(zoneId: string): {
    trend: string;
    momentum: number;
    direction: 'up' | 'down' | 'stable';
    confidence: number;
  } {
    const predict = this.state.predicts.get(zoneId);
    if (!predict) {
      return {
        trend: 'no_data',
        momentum: 0,
        direction: 'stable',
        confidence: 0,
      };
    }

    const momentum = predict.newOrdersCount * 0.2; // Simplified momentum calculation
    const direction =
      predict.trend === 'increasing' ? 'up' : predict.trend === 'decreasing' ? 'down' : 'stable';

    return {
      trend: predict.trend,
      momentum,
      direction,
      confidence: predict.confidence,
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
    this.state.predicts.clear();
    logger.info('Live Predict Engine destroyed');
  }
}

// Export singleton instance
export const livePredictEngine = new LivePredictEngine();
