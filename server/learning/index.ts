/**
 * PHASE 3: Real Machine Learning Integration
 * 
 * Orchestrates all learning components with ML baseline:
 * - ML Baseline Forecasting (weighted regression)
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

import {
  generateMLBaseline,
  type MLForecast,
} from './mlBaseline';

import {
  recordOrderOutcome,
  getModelPerformanceMetrics,
  getLearningProgress as getLearningProgressFeedback,
  getAccuracyTrend,
  getAccuracyBreakdown,
} from './learningFeedback';

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
    modelType: string;
    historicalAverage: number;
    trend: string;
    temporalConsistency: number;
    dataVolume: number;
    volatility?: number;
  };
}

/**
 * Generate a learning-based forecast for a zone using ML baseline
 * 
 * This function now uses statistical ML (weighted regression) instead of simple heuristics.
 * The ML model learns from historical patterns and applies temporal weights.
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
    // Step 1: Generate ML baseline forecast (replaces simple heuristic)
    const forecastTime = new Date();
    forecastTime.setHours(params.currentHour);
    
    const mlForecast = await generateMLBaseline(params.zoneId, forecastTime);
    const baselineForecast = mlForecast.baselineForecast;
    
    console.log(`[Learning] ML baseline forecast for zone ${params.zoneId}: ${baselineForecast.toFixed(1)} orders (confidence: ${(mlForecast.confidenceScore * 100).toFixed(0)}%)`);
    
    // Get historical patterns for adaptation context
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

    // Get trend analysis for context
    const trend = await calculateDemandTrend(params.zoneId);

    // Step 2: Use ML model's confidence score (already calculated)
    const metrics = await calculateAccuracyMetrics(params.zoneId);
    const confidenceFactors = {
      overallConfidence: mlForecast.confidenceScore,
      dataVolumeConfidence: Math.min(1.0, mlForecast.modelMetadata.trainingDataPoints / 100),
      accuracyConfidence: (metrics?.accuracyRate || 50) / 100,
      temporalConsistencyConfidence: 1 - mlForecast.modelMetadata.volatility,
      uncertaintyConfidence: 1 - mlForecast.modelMetadata.volatility,
    };

    // Step 3: Adapt ML forecast based on real-time factors
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

    // Step 4: Determine learning phase based on ML model performance
    const learningProgress = await getLearningProgress(params.zoneId);
    const learningPhase = determineLearningPhase(
      mlForecast.modelMetadata.trainingDataPoints,
      mlForecast.confidenceScore * 100,
    );

    // Step 5: Store ML forecast for later comparison and retraining
    await storeForecast({
      zoneId: params.zoneId,
      forecastTime: forecastTime,
      forecastedDemand: adaptationFactors.finalAdaptedForecast,
      forecastedConfidence: confidenceFactors.overallConfidence,
      learningPhase,
    });

    // Step 6: Return aggregated learning result with ML insights
    return {
      zoneId: params.zoneId,
      baselineForecast: Math.round(baselineForecast),
      adaptedForecast: adaptationFactors.finalAdaptedForecast,
      confidence: confidenceFactors.overallConfidence,
      confidenceExplanation: mlForecast.confidenceExplanation,
      learningPhase,
      learningProgress: learningProgress?.progress || 0,
      adaptationReasons: adaptationFactors.adaptationReason,
      adaptationExplanation: getAdaptationExplanation(adaptationFactors),
      metadata: {
        modelType: 'ml_weighted_regression',
        historicalAverage: mlForecast.modelMetadata.averageHistoricalDemand,
        trend: mlForecast.modelMetadata.trendDirection,
        temporalConsistency: 1 - mlForecast.modelMetadata.volatility,
        dataVolume: mlForecast.modelMetadata.trainingDataPoints,
        volatility: mlForecast.modelMetadata.volatility,
      },
    };

  } catch (error) {
    console.error('[Learning] Error generating learning forecast:', error);
    console.error('[Learning] Stack trace:', (error as Error).stack);
    return null;
  }
}

/**
 * Update learning system with actual order outcome
 * 
 * This feeds real outcomes back into the ML model for continuous improvement.
 * In production, this would trigger model retraining.
 */
export async function updateLearningWithOutcome(
  zoneId: string,
  forecastTime: Date,
  actualDemand: number,
): Promise<void> {
  try {
    const outcome = await recordActualOutcome(zoneId, forecastTime, actualDemand);
    const feedbackOutcome = await recordOrderOutcome(zoneId, forecastTime, actualDemand);
    
    if (outcome || feedbackOutcome) {
      console.log(`[Learning] Updated ML system with actual outcome for zone ${zoneId}: ${actualDemand} orders`);
      console.log(`[Learning] This data will be used for model retraining and continuous improvement`);
      
      const metrics = await getModelPerformanceMetrics(zoneId);
      const progress = await getLearningProgressFeedback(zoneId);
      console.log(`[Learning] Current model accuracy: ${(metrics.totalAccuracy * 100).toFixed(1)}%`);
      console.log(`[Learning] Learning phase: ${progress.phase} (${progress.progress.toFixed(0)}% progress)`);
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
  generateMLBaseline,
  recordOrderOutcome,
  getModelPerformanceMetrics,
  getAccuracyTrend,
  getAccuracyBreakdown,
};
