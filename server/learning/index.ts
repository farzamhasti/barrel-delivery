/**
 * PHASE 3: Real Machine Learning Integration
 * 
 * Orchestrates all learning components with ML baseline:
 * - ML Baseline Predicting (weighted regression)
 * - Historical Order Learning
 * - Predict Memory System
 * - Confidence Engine
 * - Predict Adaptation
 */

import {
  buildHistoricalPatterns,
  calculateDemandTrend,
  getHistoricalDemandForTimeSlot,
} from './historicalOrderLearning';

import {
  storePredict,
  recordActualOutcome,
  calculateAccuracyMetrics,
  determineLearningPhase,
  getLearningProgress,
} from './forecastMemory';

import {
  assessConfidence,
  getConfidenceExplanation,
  shouldUsePredict,
} from './confidenceEngine';

import {
  adaptPredict,
  getAdaptationExplanation,
} from './forecastAdaptation';

import {
  generateMLBaseline,
  type MLPredict,
} from './mlBaseline';

import {
  recordOrderOutcome,
  getModelPerformanceMetrics,
  getLearningProgress as getLearningProgressFeedback,
  getAccuracyTrend,
  getAccuracyBreakdown,
} from './learningFeedback';

export interface LearningPredict {
  zoneId: string;
  baselinePredict: number;
  adaptedPredict: number;
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
 * Generate a learning-based predict for a zone using ML baseline
 * 
 * This function now uses statistical ML (weighted regression) instead of simple heuristics.
 * The ML model learns from historical patterns and applies temporal weights.
 */
export async function generateLearningPredict(params: {
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
}): Promise<LearningPredict | null> {
  try {
    // Step 1: Generate ML baseline predict (replaces simple heuristic)
    const predictTime = new Date();
    predictTime.setHours(params.currentHour);
    
    const mlPredict = await generateMLBaseline(params.zoneId, predictTime);
    const baselinePredict = mlPredict.baselinePredict;
    
    console.log(`[Learning] ML baseline predict for zone ${params.zoneId}: ${baselinePredict.toFixed(1)} orders (confidence: ${(mlPredict.confidenceScore * 100).toFixed(0)}%)`);
    
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
      overallConfidence: mlPredict.confidenceScore,
      dataVolumeConfidence: Math.min(1.0, mlPredict.modelMetadata.trainingDataPoints / 100),
      accuracyConfidence: (metrics?.accuracyRate || 50) / 100,
      temporalConsistencyConfidence: 1 - mlPredict.modelMetadata.volatility,
      uncertaintyConfidence: 1 - mlPredict.modelMetadata.volatility,
    };

    // Step 3: Adapt ML predict based on real-time factors
    const adaptationFactors = adaptPredict({
      baselinePredict: Math.round(baselinePredict),
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
      mlPredict.modelMetadata.trainingDataPoints,
      mlPredict.confidenceScore * 100,
    );

    // Step 5: Store ML predict for later comparison and retraining
    await storePredict({
      zoneId: params.zoneId,
      predictTime: predictTime,
      predictedDemand: adaptationFactors.finalAdaptedPredict,
      predictedConfidence: confidenceFactors.overallConfidence,
      learningPhase,
    });

    // Step 6: Return aggregated learning result with ML insights
    return {
      zoneId: params.zoneId,
      baselinePredict: Math.round(baselinePredict),
      adaptedPredict: adaptationFactors.finalAdaptedPredict,
      confidence: confidenceFactors.overallConfidence,
      confidenceExplanation: mlPredict.confidenceExplanation,
      learningPhase,
      learningProgress: learningProgress?.progress || 0,
      adaptationReasons: adaptationFactors.adaptationReason,
      adaptationExplanation: getAdaptationExplanation(adaptationFactors),
      metadata: {
        modelType: 'ml_weighted_regression',
        historicalAverage: mlPredict.modelMetadata.averageHistoricalDemand,
        trend: mlPredict.modelMetadata.trendDirection,
        temporalConsistency: 1 - mlPredict.modelMetadata.volatility,
        dataVolume: mlPredict.modelMetadata.trainingDataPoints,
        volatility: mlPredict.modelMetadata.volatility,
      },
    };

  } catch (error) {
    console.error('[Learning] Error generating learning predict:', error);
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
  predictTime: Date,
  actualDemand: number,
): Promise<void> {
  try {
    const outcome = await recordActualOutcome(zoneId, predictTime, actualDemand);
    const feedbackOutcome = await recordOrderOutcome(zoneId, predictTime, actualDemand);
    
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
  storePredict,
  recordActualOutcome,
  calculateAccuracyMetrics,
  determineLearningPhase,
  getLearningProgress,
  assessConfidence,
  getConfidenceExplanation,
  shouldUsePredict,
  adaptPredict,
  getAdaptationExplanation,
  generateMLBaseline,
  recordOrderOutcome,
  getModelPerformanceMetrics,
  getAccuracyTrend,
  getAccuracyBreakdown,
};
