/**
 * PHASE 2: Forecast Memory System
 * 
 * Stores previous forecasts and actual outcomes to create
 * a learning feedback loop for continuous improvement.
 */

// Forecast memory system - stores forecasts and outcomes for learning feedback

export interface ForecastRecord {
  zoneId: string;
  forecastTime: Date;
  forecastedDemand: number;
  forecastedConfidence: number;
  actualDemand?: number;
  actualOutcomeTime?: Date;
  forecastError?: number;
  isAccurate?: boolean;
  learningPhase: 'early_learning' | 'learning' | 'trained';
}

/**
 * Store a forecast for later comparison with actual outcomes
 */
export async function storeForecast(forecast: ForecastRecord): Promise<boolean> {
  try {
    // This would insert into a forecasts table
    // For now, we'll log it
    console.log(`[Learning] Stored forecast for zone ${forecast.zoneId}:`, {
      forecastedDemand: forecast.forecastedDemand,
      confidence: forecast.forecastedConfidence,
      phase: forecast.learningPhase,
    });
    return true;
  } catch (error) {
    console.error('[Learning] Error storing forecast:', error);
    return false;
  }
}

/**
 * Record actual outcome and calculate forecast error
 */
export async function recordActualOutcome(
  zoneId: string,
  forecastTime: Date,
  actualDemand: number,
): Promise<ForecastRecord | null> {
  try {
    // This would query the forecasts table and update with actual outcome
    // Calculate error
    const forecastedDemand = 25; // Placeholder - would come from database
    const forecastError = Math.abs(actualDemand - forecastedDemand);
    const errorPercentage = (forecastError / forecastedDemand) * 100;
    const isAccurate = errorPercentage < 20; // Within 20% is considered accurate

    console.log(`[Learning] Recorded outcome for zone ${zoneId}:`, {
      forecasted: forecastedDemand,
      actual: actualDemand,
      error: forecastError,
      errorPercentage: errorPercentage.toFixed(2) + '%',
      accurate: isAccurate,
    });

    return {
      zoneId,
      forecastTime,
      forecastedDemand,
      forecastedConfidence: 0.4,
      actualDemand,
      actualOutcomeTime: new Date(),
      forecastError,
      isAccurate,
      learningPhase: 'early_learning',
    };

  } catch (error) {
    console.error('[Learning] Error recording outcome:', error);
    return null;
  }
}

/**
 * Calculate forecast accuracy metrics
 */
export async function calculateAccuracyMetrics(zoneId: string): Promise<{
  totalForecasts: number;
  accurateForecasts: number;
  accuracyRate: number;
  averageError: number;
  confidenceCalibration: number;
} | null> {
  try {
    // This would query all forecasts for the zone and calculate metrics
    // Placeholder values for now
    const totalForecasts = 100;
    const accurateForecasts = 72;
    const accuracyRate = (accurateForecasts / totalForecasts) * 100;
    const averageError = 3.5;
    const confidenceCalibration = 0.75; // How well confidence scores match actual accuracy

    console.log(`[Learning] Accuracy metrics for zone ${zoneId}:`, {
      totalForecasts,
      accurateForecasts,
      accuracyRate: accuracyRate.toFixed(2) + '%',
      averageError: averageError.toFixed(2),
      confidenceCalibration: (confidenceCalibration * 100).toFixed(2) + '%',
    });

    return {
      totalForecasts,
      accurateForecasts,
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

    const phase = determineLearningPhase(metrics.totalForecasts, metrics.accuracyRate);
    let progress = 0;
    let nextMilestone = '';

    if (phase === 'early_learning') {
      progress = (metrics.totalForecasts / 50) * 33;
      nextMilestone = `Collect ${50 - metrics.totalForecasts} more forecasts to reach Learning phase`;
    } else if (phase === 'learning') {
      progress = 33 + ((metrics.totalForecasts - 50) / 150) * 33;
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
