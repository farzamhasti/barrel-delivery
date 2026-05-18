/**
 * Scenario Simulation System
 * Simulates various operational scenarios for what-if analysis
 */

import { logger } from '../utils/logger';
import { operationalRiskEngine, OperationalMetrics } from './operationalRiskEngine';

interface ScenarioResult {
  scenarioName: string;
  description: string;
  duration: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  impactMetrics: {
    orderDelayIncrease: number; // percentage
    driverUtilizationIncrease: number; // percentage
    kitchenPressureIncrease: number; // percentage
    costIncrease: number; // percentage
  };
  riskAssessment: any;
  recommendations: string[];
  recoveryTime: string;
  timestamp: number;
}

/**
 * Scenario Simulation Engine
 */
export class ScenarioSimulation {
  private readonly scenarios = {
    heavy_snow: {
      name: 'Heavy Snow',
      description: 'Severe winter weather conditions',
      duration: '4-6 hours',
      severity: 'high' as const,
      factors: {
        deliveryTimeMultiplier: 1.8,
        driverAvailabilityReduction: 0.4,
        orderVolumeIncrease: 0.3,
        kitchenPressureIncrease: 0.2,
      },
      recoveryTime: '2-3 hours after snow stops',
    },
    demand_surge: {
      name: 'Sudden Demand Surge',
      description: 'Unexpected spike in order volume',
      duration: '1-3 hours',
      severity: 'high' as const,
      factors: {
        deliveryTimeMultiplier: 1.3,
        driverAvailabilityReduction: 0.0,
        orderVolumeIncrease: 1.8,
        kitchenPressureIncrease: 1.5,
      },
      recoveryTime: '30-60 minutes after surge ends',
    },
    driver_loss: {
      name: 'Driver Loss',
      description: 'Sudden loss of drivers (accident, illness, etc.)',
      duration: '2-8 hours',
      severity: 'critical' as const,
      factors: {
        deliveryTimeMultiplier: 1.5,
        driverAvailabilityReduction: 0.5,
        orderVolumeIncrease: 0.0,
        kitchenPressureIncrease: 0.3,
      },
      recoveryTime: '4-6 hours to call in replacements',
    },
    major_sports_event: {
      name: 'Major Sports Event',
      description: 'NHL game or major sporting event',
      duration: '3-4 hours',
      severity: 'high' as const,
      factors: {
        deliveryTimeMultiplier: 1.2,
        driverAvailabilityReduction: 0.1,
        orderVolumeIncrease: 2.2,
        kitchenPressureIncrease: 1.8,
      },
      recoveryTime: '1-2 hours after event ends',
    },
    system_failure: {
      name: 'System Failure',
      description: 'Temporary system/app outage',
      duration: '15-60 minutes',
      severity: 'critical' as const,
      factors: {
        deliveryTimeMultiplier: 2.0,
        driverAvailabilityReduction: 0.8,
        orderVolumeIncrease: 0.0,
        kitchenPressureIncrease: 0.5,
      },
      recoveryTime: '30-120 minutes to restore',
    },
    holiday_rush: {
      name: 'Holiday Rush',
      description: 'Holiday or special occasion surge',
      duration: '6-8 hours',
      severity: 'high' as const,
      factors: {
        deliveryTimeMultiplier: 1.4,
        driverAvailabilityReduction: 0.2,
        orderVolumeIncrease: 2.5,
        kitchenPressureIncrease: 2.0,
      },
      recoveryTime: '2-4 hours after rush period',
    },
  };

  constructor() {
    logger.info('Scenario Simulation Engine initialized');
  }

  /**
   * Simulate a specific scenario
   */
  simulateScenario(
    scenarioType: keyof typeof this.scenarios,
    baseMetrics: OperationalMetrics
  ): ScenarioResult {
    const scenario = this.scenarios[scenarioType];
    if (!scenario) {
      throw new Error(`Unknown scenario: ${scenarioType}`);
    }

    // Apply scenario factors to base metrics
    const affectedMetrics: OperationalMetrics = {
      ...baseMetrics,
      activeOrders: Math.round(
        baseMetrics.activeOrders * (1 + scenario.factors.orderVolumeIncrease)
      ),
      averageOrderTime: Math.round(
        baseMetrics.averageOrderTime * scenario.factors.deliveryTimeMultiplier
      ),
      activeDrivers: Math.round(
        baseMetrics.activeDrivers * (1 - scenario.factors.driverAvailabilityReduction)
      ),
      kitchenUtilization: Math.min(
        1.0,
        baseMetrics.kitchenUtilization * (1 + scenario.factors.kitchenPressureIncrease)
      ),
      avgDeliveryTime: Math.round(
        baseMetrics.avgDeliveryTime * scenario.factors.deliveryTimeMultiplier
      ),
      maxDeliveryTime: Math.round(
        baseMetrics.maxDeliveryTime * scenario.factors.deliveryTimeMultiplier
      ),
      ordersPerDriver: Math.round(
        baseMetrics.ordersPerDriver *
          (1 + scenario.factors.orderVolumeIncrease) *
          (1 / (1 - scenario.factors.driverAvailabilityReduction))
      ),
    };

    // Get risk assessment for affected metrics
    const riskAssessment = operationalRiskEngine.assessRisks(affectedMetrics);

    // Calculate impact metrics
    const impactMetrics = {
      orderDelayIncrease: Math.round(
        (scenario.factors.deliveryTimeMultiplier - 1) * 100
      ),
      driverUtilizationIncrease: Math.round(
        (scenario.factors.driverAvailabilityReduction * 100)
      ),
      kitchenPressureIncrease: Math.round(
        (scenario.factors.kitchenPressureIncrease * 100)
      ),
      costIncrease: Math.round(
        (scenario.factors.orderVolumeIncrease * 0.15 +
          scenario.factors.driverAvailabilityReduction * 0.25) *
          100
      ),
    };

    // Generate recommendations
    const recommendations = this.generateScenarioRecommendations(
      scenarioType,
      riskAssessment,
      affectedMetrics
    );

    const result: ScenarioResult = {
      scenarioName: scenario.name,
      description: scenario.description,
      duration: scenario.duration,
      severity: scenario.severity,
      impactMetrics,
      riskAssessment,
      recommendations,
      recoveryTime: scenario.recoveryTime,
      timestamp: Date.now(),
    };

    logger.info(`Scenario simulated: ${scenario.name}, risk level: ${riskAssessment.riskLevel}`);

    return result;
  }

  /**
   * Generate scenario-specific recommendations
   */
  private generateScenarioRecommendations(
    scenarioType: keyof typeof this.scenarios,
    riskAssessment: any,
    metrics: OperationalMetrics
  ): string[] {
    const recommendations: string[] = [];

    switch (scenarioType) {
      case 'heavy_snow':
        recommendations.push('❄️ Activate snow protocol');
        recommendations.push('→ Increase delivery time estimates by 50-80%');
        recommendations.push('→ Call in additional drivers');
        recommendations.push('→ Consider temporary delivery radius reduction');
        recommendations.push('→ Coordinate with kitchen on order pacing');
        recommendations.push('→ Monitor road conditions continuously');
        break;

      case 'demand_surge':
        recommendations.push('📈 Activate surge protocol');
        recommendations.push('→ Pause new order acceptance if overload > 0.8');
        recommendations.push('→ Activate on-call drivers');
        recommendations.push('→ Increase kitchen staffing');
        recommendations.push('→ Implement order queuing system');
        recommendations.push('→ Provide customers with realistic delivery times');
        break;

      case 'driver_loss':
        recommendations.push('🚨 CRITICAL: Activate emergency protocol');
        recommendations.push('→ Call all available on-call drivers immediately');
        recommendations.push('→ Consider temporary service suspension');
        recommendations.push('→ Contact affected customers with updated ETAs');
        recommendations.push('→ Prioritize existing orders');
        recommendations.push('→ Implement driver rotation to prevent burnout');
        break;

      case 'major_sports_event':
        recommendations.push('🏒 Activate sports event protocol');
        recommendations.push('→ Prepare for 2x normal order volume');
        recommendations.push('→ Pre-position drivers in high-demand areas');
        recommendations.push('→ Increase kitchen staffing 2-3 hours before event');
        recommendations.push('→ Set realistic delivery time expectations');
        recommendations.push('→ Monitor demand patterns during event');
        break;

      case 'system_failure':
        recommendations.push('⚠️ CRITICAL: System failure detected');
        recommendations.push('→ Activate manual order taking procedures');
        recommendations.push('→ Notify drivers of system status');
        recommendations.push('→ Prioritize existing orders in system');
        recommendations.push('→ Prepare communication for customers');
        recommendations.push('→ Document all manual orders for recovery');
        break;

      case 'holiday_rush':
        recommendations.push('🎉 Activate holiday rush protocol');
        recommendations.push('→ Increase staffing across all departments');
        recommendations.push('→ Pre-prepare common items');
        recommendations.push('→ Activate all available drivers');
        recommendations.push('→ Implement order batching for efficiency');
        recommendations.push('→ Prepare for 2.5x normal order volume');
        break;
    }

    // Add generic recommendations based on risk level
    if (riskAssessment.riskLevel === 'critical') {
      recommendations.push('🔴 CRITICAL RISK: Consider temporary service suspension');
    } else if (riskAssessment.riskLevel === 'high') {
      recommendations.push('🟠 HIGH RISK: Implement all mitigation measures');
    }

    return recommendations;
  }

  /**
   * Compare multiple scenarios
   */
  compareScenarios(
    baseMetrics: OperationalMetrics,
    scenarioTypes: (keyof typeof this.scenarios)[]
  ): {
    scenarios: ScenarioResult[];
    worstCase: ScenarioResult;
    bestCase: ScenarioResult;
    averageImpact: any;
  } {
    const results = scenarioTypes.map((type) => this.simulateScenario(type, baseMetrics));

    const worstCase = results.reduce((worst, current) =>
      this.getRiskScore(current.riskAssessment) >
      this.getRiskScore(worst.riskAssessment)
        ? current
        : worst
    );

    const bestCase = results.reduce((best, current) =>
      this.getRiskScore(current.riskAssessment) <
      this.getRiskScore(best.riskAssessment)
        ? current
        : best
    );

    const averageImpact = {
      orderDelayIncrease:
        results.reduce((sum, r) => sum + r.impactMetrics.orderDelayIncrease, 0) /
        results.length,
      driverUtilizationIncrease:
        results.reduce((sum, r) => sum + r.impactMetrics.driverUtilizationIncrease, 0) /
        results.length,
      kitchenPressureIncrease:
        results.reduce((sum, r) => sum + r.impactMetrics.kitchenPressureIncrease, 0) /
        results.length,
      costIncrease:
        results.reduce((sum, r) => sum + r.impactMetrics.costIncrease, 0) / results.length,
    };

    return {
      scenarios: results,
      worstCase,
      bestCase,
      averageImpact,
    };
  }

  /**
   * Get risk score for comparison
   */
  private getRiskScore(riskAssessment: any): number {
    const scoreMap: Record<string, number> = {
      low: 0.1,
      medium: 0.5,
      high: 0.75,
      critical: 0.95,
    };
    return scoreMap[riskAssessment.riskLevel as string] || 0;
  }

  /**
   * Get all available scenarios
   */
  getAvailableScenarios(): Array<{
    id: string;
    name: string;
    description: string;
    severity: string;
  }> {
    return Object.entries(this.scenarios).map(([id, scenario]) => ({
      id,
      name: scenario.name,
      description: scenario.description,
      severity: scenario.severity,
    }));
  }

  /**
   * Estimate recovery time
   */
  estimateRecoveryTime(scenarioType: keyof typeof this.scenarios): {
    scenario: string;
    estimatedMinutes: number;
    description: string;
  } {
    const scenario = this.scenarios[scenarioType];
    if (!scenario) {
      throw new Error(`Unknown scenario: ${scenarioType}`);
    }

    // Extract minutes from recovery time string
    const match = scenario.recoveryTime.match(/(\d+)-(\d+)/);
    const avgMinutes = match
      ? (parseInt(match[1]) + parseInt(match[2])) / 2
      : 60;

    return {
      scenario: scenario.name,
      estimatedMinutes: Math.round(avgMinutes * 60),
      description: scenario.recoveryTime,
    };
  }
}

// Export singleton instance
export const scenarioSimulation = new ScenarioSimulation();
