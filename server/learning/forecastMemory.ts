/**
 * PHASE 2: Predict Memory System
 * 
 * Stores previous predicts and actual outcomes to create
 * a learning feedback loop for continuous improvement.
 */

// Predict memory system - stores predicts and outcomes for learning feedback

export interface PredictRecord {
  zoneId: string;
  predictTime: Date;
  predictedDemand: number;
  predictedConfidence: number;
  actualDemand?: number;
  actualOutcomeTime?: Date;
  predictError?: number;
  isAccurate?: boolean;
  learningPhase: 'early_learning' | 'learning' | 'trained';
}

/**
 * Store a predict for later comparison with actual outcomes
 */
export async function storePredict(predict: PredictRecord): Promise<boolean> {
  try {
    // This would insert into a predicts table
    // For now, we'll log it
    console.log(`[Learning] Stored predict for zone ${predict.zoneId}:`, {
      predictedDemand: predict.predictedDemand,
      confidence: predict.predictedConfidence,
      phase: predict.learningPhase,
    });
    return true;
  } catch (error) {
    console.error('[Learning] Error storing predict:', error);
    return false;
  }
}

/**
 * Record actual outcome and calculate predict error
 */
export async function recordActualOutcome(
  zoneId: string,
  predictTime: Date,
  actualDemand: number,
): Promise<PredictRecord | null> {
  try {
    // This would query the predicts table and update with actual outcome
    // Calculate error
    const predictedDemand = 25; // Placeholder - would come from database
    const predictError = Math.abs(actualDemand - predictedDemand);
    const errorPercentage = (predictError / predictedDemand) * 100;
    const isAccurate = errorPercentage < 20; // Within 20% is considered accurate

    console.log(`[Learning] Recorded outcome for zone ${zoneId}:`, {
      predicted: predictedDemand,
      actual: actualDemand,
      error: predictError,
      errorPercentage: errorPercentage.toFixed(2) + '%',
      accurate: isAccurate,
    });

    return {
      zoneId,
      predictTime,
      predictedDemand,
      predictedConfidence: 0.4,
      actualDemand,
      actualOutcomeTime: new Date(),
      predictError,
      isAccurate,
      learningPhase: 'early_learning',
    };

  } catch (error) {
    console.error('[Learning] Error recording outcome:', error);
    return null;
  }
}

/**
 * Calculate predict accuracy metrics
 */
export async function calculateAccuracyMetrics(zoneId: string): Promise<{
  totalPredicts: number;
  accuratePredicts: number;
  accuracyRate: number;
  averageError: number;
  confidenceCalibration: number;
} | null> {
  try {
    // This would query all predicts for the zone and calculate metrics
    // Placeholder values for now
    const totalPredicts = 100;
    const accuratePredicts = 72;
    const accuracyRate = (accuratePredicts / totalPredicts) * 100;
    const averageError = 3.5;
    const confidenceCalibration = 0.75; // How well confidence scores match actual accuracy

    console.log(`[Learning] Accuracy metrics for zone ${zoneId}:`, {
      totalPredicts,
      accuratePredicts,
      accuracyRate: accuracyRate.toFixed(2) + '%',
      averageError: averageError.toFixed(2),
      confidenceCalibration: (confidenceCalibration * 100).toFixed(2) + '%',
    });

    return {
      totalPredicts,
      accuratePredicts,
      accuracyRate,
      averageError,
      confidenceCalibration,
    };

  } catch (error) {
    console.error('[Learning] Error calculating accuracy metrics:', error);
    return null;
  }
}

/**
 * Get learning phase based on data volume and accuracy
 */
export function determineLearningPhase(
  sampleCount: number,
  accuracyRate: number,
): 'early_learning' | 'learning' | 'trained' {
  if (sampleCount < 50) {
    return 'early_learning';
  } else if (sampleCount < 200 || accuracyRate < 75) {
    return 'learning';
  } else {
    return 'trained';
  }
}

/**
 * Get learning progress summary
 */
export async function getLearningProgress(zoneId: string): Promise<{
  phase: 'early_learning' | 'learning' | 'trained';
  progress: number; // 0-100
  nextMilestone: string;
  estimatedTimeToTrained: string;
} | null> {
  try {
    const metrics = await calculateAccuracyMetrics(zoneId);
    if (!metrics) return null;

    const phase = determineLearningPhase(metrics.totalPredicts, metrics.accuracyRate);
    let progress = 0;
    let nextMilestone = '';

    if (phase === 'early_learning') {
      progress = (metrics.totalPredicts / 50) * 33;
      nextMilestone = `Collect ${50 - metrics.totalPredicts} more predicts to reach Learning phase`;
    } else if (phase === 'learning') {
      progress = 33 + ((metrics.totalPredicts - 50) / 150) * 33;
      nextMilestone = `Achieve 75% accuracy (currently ${metrics.accuracyRate.toFixed(1)}%) to reach Trained phase`;
    } else {
      progress = 100;
      nextMilestone = 'System fully trained and optimized';
    }

    return {
      phase,
      progress: Math.min(100, progress),
      nextMilestone,
      estimatedTimeToTrained: phase === 'trained' ? 'Complete' : '7-14 days',
    };

  } catch (error) {
    console.error('[Learning] Error getting learning progress:', error);
    return null;
  }
}
