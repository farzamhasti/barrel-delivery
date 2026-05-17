/**
 * Operational Risk Engine
 * Predicts operational risks: overload, delay, staffing, kitchen pressure, driver shortages
 */

import { logger } from '../utils/logger';

interface RiskAssessment {
  overloadProbability: number;
  delayProbability: number;
  staffingRisk: number;
  kitchenPressure: number;
  driverShortage: number;
  overallRiskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  recommendations: string[];
  timestamp: number;
}

interface OperationalMetrics {
  activeOrders: number;
  averageOrderTime: number;
  kitchenCapacity: number;
  kitchenUtilization: number;
  activeDrivers: number;
  ordersPerDriver: number;
  avgDeliveryTime: number;
  maxDeliveryTime: number;
}

/**
 * Operational Risk Engine
 * Analyzes current operational state and predicts risks
 */
export class OperationalRiskEngine {
  private readonly OVERLOAD_THRESHOLD = 50; // Orders
  private readonly DELAY_THRESHOLD = 45; // Minutes
  private readonly KITCHEN_CAPACITY_THRESHOLD = 0.85; // 85% utilization
  private readonly MIN_DRIVERS_RATIO = 0.1; // 1 driver per 10 orders

  constructor() {
    logger.info('Operational Risk Engine initialized');
  }

  /**
   * Assess operational risks based on current metrics
   */
  assessRisks(metrics: OperationalMetrics): RiskAssessment {
    const overloadProbability = this.calculateOverloadRisk(metrics);
    const delayProbability = this.calculateDelayRisk(metrics);
    const staffingRisk = this.calculateStaffingRisk(metrics);
    const kitchenPressure = this.calculateKitchenPressure(metrics);
    const driverShortage = this.calculateDriverShortage(metrics);

    const overallRiskScore =
      (overloadProbability * 0.2 +
        delayProbability * 0.25 +
        staffingRisk * 0.2 +
        kitchenPressure * 0.2 +
        driverShortage * 0.15) /
      5;

    const riskLevel = this.getRiskLevel(overallRiskScore);
    const recommendations = this.generateRecommendations(
      metrics,
      overloadProbability,
      delayProbability,
      staffingRisk,
      kitchenPressure,
      driverShortage
    );

    const assessment: RiskAssessment = {
      overloadProbability,
      delayProbability,
      staffingRisk,
      kitchenPressure,
      driverShortage,
      overallRiskScore,
      riskLevel,
      recommendations,
      timestamp: Date.now(),
    };

    logger.info(
      `Risk assessment: ${riskLevel} (score: ${overallRiskScore.toFixed(2)}), overload: ${overloadProbability.toFixed(2)}, delay: ${delayProbability.toFixed(2)}`
    );

    return assessment;
  }

  /**
   * Calculate overload probability
   */
  private calculateOverloadRisk(metrics: OperationalMetrics): number {
    const orderRatio = metrics.activeOrders / this.OVERLOAD_THRESHOLD;

    if (orderRatio >= 1.0) {
      return Math.min(0.95, 0.5 + (orderRatio - 1) * 0.3);
    } else if (orderRatio >= 0.8) {
      return 0.5 + (orderRatio - 0.8) * 2.5;
    } else if (orderRatio >= 0.6) {
      return 0.3 + (orderRatio - 0.6) * 1.0;
    }

    return Math.max(0.1, orderRatio * 0.5);
  }

  /**
   * Calculate delay probability
   */
  private calculateDelayRisk(metrics: OperationalMetrics): number {
    const timeRatio = metrics.averageOrderTime / this.DELAY_THRESHOLD;
    const orderDensity = metrics.activeOrders / Math.max(metrics.activeDrivers, 1);

    const timeComponent = Math.min(0.5, timeRatio * 0.5);
    const densityComponent = Math.min(0.5, (orderDensity / 5) * 0.5);

    return Math.min(0.95, timeComponent + densityComponent);
  }

  /**
   * Calculate staffing risk
   */
  private calculateStaffingRisk(metrics: OperationalMetrics): number {
    const requiredDrivers = metrics.activeOrders * this.MIN_DRIVERS_RATIO;
    const driverShortfall = Math.max(0, requiredDrivers - metrics.activeDrivers);
    const shortfallRatio = driverShortfall / Math.max(requiredDrivers, 1);

    if (shortfallRatio >= 0.5) {
      return Math.min(0.95, 0.6 + shortfallRatio * 0.35);
    } else if (shortfallRatio >= 0.2) {
      return 0.3 + shortfallRatio * 1.5;
    }

    return Math.max(0.1, shortfallRatio * 1.5);
  }

  /**
   * Calculate kitchen pressure
   */
  private calculateKitchenPressure(metrics: OperationalMetrics): number {
    const utilizationRatio = metrics.kitchenUtilization / this.KITCHEN_CAPACITY_THRESHOLD;

    if (utilizationRatio >= 1.0) {
      return Math.min(0.95, 0.6 + (utilizationRatio - 1) * 0.35);
    } else if (utilizationRatio >= 0.8) {
      return 0.4 + (utilizationRatio - 0.8) * 1.0;
    } else if (utilizationRatio >= 0.6) {
      return 0.2 + (utilizationRatio - 0.6) * 1.0;
    }

    return Math.max(0.05, utilizationRatio * 0.3);
  }

  /**
   * Calculate driver shortage risk
   */
  private calculateDriverShortage(metrics: OperationalMetrics): number {
    const ordersPerDriver = metrics.ordersPerDriver;

    if (ordersPerDriver >= 8) {
      return Math.min(0.95, 0.6 + (ordersPerDriver - 8) * 0.05);
    } else if (ordersPerDriver >= 5) {
      return 0.3 + (ordersPerDriver - 5) * 0.1;
    } else if (ordersPerDriver >= 3) {
      return 0.1 + (ordersPerDriver - 3) * 0.1;
    }

    return 0.05;
  }

  /**
   * Determine risk level from score
   */
  private getRiskLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score >= 0.75) return 'critical';
    if (score >= 0.5) return 'high';
    if (score >= 0.25) return 'medium';
    return 'low';
  }

  /**
   * Generate actionable recommendations
   */
  private generateRecommendations(
    metrics: OperationalMetrics,
    overload: number,
    delay: number,
    staffing: number,
    kitchen: number,
    drivers: number
  ): string[] {
    const recommendations: string[] = [];

    if (overload > 0.7) {
      recommendations.push('🚨 CRITICAL: System approaching overload capacity');
      recommendations.push('→ Consider temporarily pausing new orders');
      recommendations.push('→ Increase delivery radius to distribute load');
    } else if (overload > 0.5) {
      recommendations.push('⚠️ HIGH: Significant order volume');
      recommendations.push('→ Monitor kitchen capacity closely');
      recommendations.push('→ Prepare additional drivers');
    }

    if (delay > 0.7) {
      recommendations.push('🚨 CRITICAL: High delay probability');
      recommendations.push('→ Prioritize fast-prep orders');
      recommendations.push('→ Consider increasing delivery time estimates');
    } else if (delay > 0.5) {
      recommendations.push('⚠️ HIGH: Delays likely');
      recommendations.push('→ Optimize delivery routes');
    }

    if (staffing > 0.7) {
      recommendations.push('🚨 CRITICAL: Severe driver shortage');
      recommendations.push('→ Call in additional drivers immediately');
      recommendations.push('→ Reduce delivery radius');
    } else if (staffing > 0.5) {
      recommendations.push('⚠️ HIGH: Driver shortage detected');
      recommendations.push('→ Prepare on-call drivers');
    }

    if (kitchen > 0.8) {
      recommendations.push('🍳 ALERT: Kitchen at high capacity');
      recommendations.push('→ Coordinate with kitchen staff');
      recommendations.push('→ Consider order pacing');
    }

    if (drivers > 0.7) {
      recommendations.push('🚗 ALERT: Driver utilization critical');
      recommendations.push('→ Optimize delivery routes');
      recommendations.push('→ Consider driver breaks');
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ System operating normally');
      recommendations.push('→ Continue monitoring');
    }

    return recommendations;
  }

  /**
   * Predict risk at future time
   */
  predictFutureRisk(
    currentMetrics: OperationalMetrics,
    minutesAhead: number,
    expectedNewOrders: number
  ): RiskAssessment {
    const futureMetrics: OperationalMetrics = {
      ...currentMetrics,
      activeOrders: currentMetrics.activeOrders + expectedNewOrders,
      kitchenUtilization: Math.min(
        1.0,
        currentMetrics.kitchenUtilization + expectedNewOrders * 0.02
      ),
      ordersPerDriver: (currentMetrics.activeOrders + expectedNewOrders) / currentMetrics.activeDrivers,
    };

    return this.assessRisks(futureMetrics);
  }

  /**
   * Get risk trend
   */
  getRiskTrend(
    previousAssessment: RiskAssessment,
    currentAssessment: RiskAssessment
  ): {
    trend: 'improving' | 'stable' | 'deteriorating';
    change: number;
    direction: string;
  } {
    const change = currentAssessment.overallRiskScore - previousAssessment.overallRiskScore;

    let trend: 'improving' | 'stable' | 'deteriorating';
    if (change < -0.1) trend = 'improving';
    else if (change > 0.1) trend = 'deteriorating';
    else trend = 'stable';

    return {
      trend,
      change,
      direction: change > 0 ? '📈' : change < 0 ? '📉' : '→',
    };
  }

  /**
   * Simulate risk scenario
   */
  simulateScenario(
    baseMetrics: OperationalMetrics,
    scenario: 'heavy_snow' | 'demand_surge' | 'driver_loss' | 'sports_event'
  ): RiskAssessment {
    let scenarioMetrics = { ...baseMetrics };

    switch (scenario) {
      case 'heavy_snow':
        scenarioMetrics.avgDeliveryTime *= 1.5;
        scenarioMetrics.activeDrivers *= 0.7;
        scenarioMetrics.ordersPerDriver *= 1.43;
        break;

      case 'demand_surge':
        scenarioMetrics.activeOrders *= 1.8;
        scenarioMetrics.kitchenUtilization *= 1.5;
        scenarioMetrics.ordersPerDriver *= 1.8;
        break;

      case 'driver_loss':
        scenarioMetrics.activeDrivers *= 0.5;
        scenarioMetrics.ordersPerDriver *= 2.0;
        break;

      case 'sports_event':
        scenarioMetrics.activeOrders *= 2.2;
        scenarioMetrics.kitchenUtilization *= 1.8;
        scenarioMetrics.ordersPerDriver *= 2.2;
        break;
    }

    logger.info(`Simulating scenario: ${scenario}`);
    return this.assessRisks(scenarioMetrics);
  }
}

// Export singleton instance
export const operationalRiskEngine = new OperationalRiskEngine();
