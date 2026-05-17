/**
 * PHASE 2: Real Learning Pipeline Integration
 * 
 * Orchestrates all learning components:
 * - Historical Order Learning
 * - Forecast Memory System
 * - Confidence Engine
 * - Forecast Adaptation
 */

import {
  buildHistoricalPatterns,
  calculateDemandTrend,
  getHistoricalDemandForTimeSlot,
} from './historicalOrderLearning';

import {
  storeForecast,
  recordActualOutcome,
  calculateAccuracyMetrics,
  determineLearningPhase,
  getLearningProgress,
} from './forecastMemory';

import {
  assessConfidence,
  getConfidenceExplanation,
  shouldUseForecast,
} from './confidenceEngine';

import {
  adaptForecast,
  getAdaptationExplanation,
} from './forecastAdaptation';

export interface LearningForecast {
  zoneId: string;
  baselineForecast: number;
  adaptedForecast: number;
  confidence: number;
  confidenceExplanation: string;
  learningPhase: 'early_learning' | 'learning' | 'trained';
  learningProgress: number;
  adaptationReasons: string[];
  adaptationExplanation: string;
  metadata: {
    historicalAverage: number;
    trend: string;
    temporalConsistency: number;
    dataVolume: number;
  };
}

/**
 * Generate a learning-based forecast for a zone
 */
export async function generateLearningForecast(params: {
  zoneId: string;
  currentHour: number;
  dayOfWeek: number;
  ordersInLastHour: number;
  availableDrivers: number;
  totalDrivers: number;
  currentBacklog: number;
  maxCapacity: number;
  weatherCondition: string;
  activeEvents: Array<{ type: string; intensity: 'low' | 'medium' | 'high' }>;
  hoursUntilDeadline: number;
}): Promise<LearningForecast | null> {
  try {
    // Step 1: Get historical patterns
    const patterns = await buildHistoricalPatterns(params.zoneId);
    const historicalDemand = await getHistoricalDemandForTimeSlot(
      params.zoneId,
      params.currentHour,
      params.dayOfWeek,
    );

    if (!historicalDemand) {
      console.log(`[Learning] No historical data for zone ${params.zoneId}`);
      return null;
    }

    // Step 2: Get trend analysis
    const trend = await calculateDemandTrend(params.zoneId);

    // Step 3: Calculate baseline forecast
    let baselineForecast = historicalDemand.average;
    if (trend) {
      // Adjust for trend
      if (trend.trend === 'increasing') {
        baselineForecast *= 1.05;
      } else if (trend.trend === 'decreasing') {
        baselineForecast *= 0.95;
      }
    }

    // Step 4: Assess confidence
    const metrics = await calculateAccuracyMetrics(params.zoneId);
    const confidenceFactors = assessConfidence({
      sampleCount: patterns.length,
      accuracyRate: metrics?.accuracyRate || 50,
      demandVariance: historicalDemand.variance,
      averageDemand: historicalDemand.average,
      hasWeatherAlert: params.weatherCondition !== 'clear',
      isHoliday: false, // Would check calendar
    });

    // Step 5: Adapt forecast based on real-time factors
    const adaptationFactors = adaptForecast({
      baselineForecast: Math.round(baselineForecast),
      ordersInLastHour: params.ordersInLastHour,
      historicalAveragePerHour: historicalDemand.average,
      availableDrivers: params.availableDrivers,
      totalDrivers: params.totalDrivers,
      currentBacklog: params.currentBacklog,
      maxCapacity: params.maxCapacity,
      weatherCondition: params.weatherCondition,
      activeEvents: params.activeEvents,
      currentHour: params.currentHour,
      hoursUntilDeadline: params.hoursUntilDeadline,
    });

    // Step 6: Get learning progress
    const learningProgress = await getLearningProgress(params.zoneId);
    const learningPhase = determineLearningPhase(
      patterns.length,
      metrics?.accuracyRate || 50,
    );

    // Step 7: Store forecast for later comparison
    await storeForecast({
      zoneId: params.zoneId,
      forecastTime: new Date(),
      forecastedDemand: adaptationFactors.finalAdaptedForecast,
      forecastedConfidence: confidenceFactors.overallConfidence,
      learningPhase,
    });

    return {
      zoneId: params.zoneId,
      baselineForecast: Math.round(baselineForecast),
      adaptedForecast: adaptationFactors.finalAdaptedForecast,
      confidence: confidenceFactors.overallConfidence,
      confidenceExplanation: getConfidenceExplanation(confidenceFactors.overallConfidence),
      learningPhase,
      learningProgress: learningProgress?.progress || 0,
      adaptationReasons: adaptationFactors.adaptationReason,
      adaptationExplanation: getAdaptationExplanation(adaptationFactors),
      metadata: {
        historicalAverage: historicalDemand.average,
        trend: trend?.trend || 'stable',
        temporalConsistency: confidenceFactors.temporalConsistencyConfidence,
        dataVolume: patterns.length,
      },
    };

  } catch (error) {
    console.error('[Learning] Error generating learning forecast:', error);
    return null;
  }
}

/**
 * Update learning system with actual order outcome
 */
export async function updateLearningWithOutcome(
  zoneId: string,
  forecastTime: Date,
  actualDemand: number,
): Promise<void> {
  try {
    const outcome = await recordActualOutcome(zoneId, forecastTime, actualDemand);
    if (outcome) {
      console.log(`[Learning] Updated learning system with actual outcome for zone ${zoneId}`);
    }
  } catch (error) {
    console.error('[Learning] Error updating learning system:', error);
  }
}

export {
  buildHistoricalPatterns,
  calculateDemandTrend,
  getHistoricalDemandForTimeSlot,
  storeForecast,
  recordActualOutcome,
  calculateAccuracyMetrics,
  determineLearningPhase,
  getLearningProgress,
  assessConfidence,
  getConfidenceExplanation,
  shouldUseForecast,
  adaptForecast,
  getAdaptationExplanation,
};
