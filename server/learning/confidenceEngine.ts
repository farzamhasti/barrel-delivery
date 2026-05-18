/**
 * PHASE 2: Confidence Engine
 * 
 * Replaces static confidence scoring with dynamic calculation based on:
 * - Data volume confidence
 * - Model accuracy confidence
 * - Temporal consistency confidence
 * - Uncertainty confidence
 */

export interface ConfidenceFactors {
  dataVolumeConfidence: number;
  accuracyConfidence: number;
  temporalConsistencyConfidence: number;
  uncertaintyConfidence: number;
  overallConfidence: number;
}

/**
 * Calculate confidence based on data volume
 * More historical data = higher confidence
 */
export function calculateDataVolumeConfidence(sampleCount: number): number {
  if (sampleCount < 10) return 0.1;
  if (sampleCount < 50) return 0.3;
  if (sampleCount < 100) return 0.5;
  if (sampleCount < 200) return 0.7;
  return 0.95; // Cap at 95% - always some uncertainty
}

/**
 * Calculate confidence based on model accuracy
 * Higher historical accuracy = higher confidence
 */
export function calculateAccuracyConfidence(accuracyRate: number): number {
  // Convert accuracy rate (0-100) to confidence (0-1)
  if (accuracyRate < 50) return 0.1;
  if (accuracyRate < 60) return 0.25;
  if (accuracyRate < 70) return 0.4;
  if (accuracyRate < 80) return 0.6;
  if (accuracyRate < 90) return 0.8;
  return 0.95;
}

/**
 * Calculate confidence based on temporal consistency
 * How consistent are predicts across similar time periods?
 */
export function calculateTemporalConsistencyConfidence(
  demandVariance: number,
  averageDemand: number,
): number {
  // Coefficient of variation
  const cv = Math.sqrt(demandVariance) / averageDemand;
  
  if (cv > 1.0) return 0.2; // High variability
  if (cv > 0.5) return 0.4;
  if (cv > 0.3) return 0.6;
  if (cv > 0.1) return 0.8;
  return 0.95; // Very consistent
}

/**
 * Calculate confidence based on uncertainty factors
 * Weather, events, holidays, etc. reduce confidence
 */
export function calculateUncertaintyConfidence(factors: {
  hasActiveEvent?: boolean;
  hasWeatherAlert?: boolean;
  isHoliday?: boolean;
  isNewZone?: boolean;
  recentPriceChange?: boolean;
}): number {
  let confidence = 1.0;

  if (factors.hasActiveEvent) confidence *= 0.7;
  if (factors.hasWeatherAlert) confidence *= 0.8;
  if (factors.isHoliday) confidence *= 0.6;
  if (factors.isNewZone) confidence *= 0.3;
  if (factors.recentPriceChange) confidence *= 0.85;

  return Math.max(0.1, confidence);
}

/**
 * Calculate overall confidence score
 */
export function calculateOverallConfidence(factors: ConfidenceFactors): number {
  // Weighted average of all confidence factors
  const weights = {
    dataVolume: 0.25,
    accuracy: 0.35,
    temporalConsistency: 0.25,
    uncertainty: 0.15,
  };

  const overall =
    factors.dataVolumeConfidence * weights.dataVolume +
    factors.accuracyConfidence * weights.accuracy +
    factors.temporalConsistencyConfidence * weights.temporalConsistency +
    factors.uncertaintyConfidence * weights.uncertainty;

  return Math.min(0.95, Math.max(0.1, overall));
}

/**
 * Get comprehensive confidence assessment
 */
export function assessConfidence(params: {
  sampleCount: number;
  accuracyRate: number;
  demandVariance: number;
  averageDemand: number;
  hasActiveEvent?: boolean;
  hasWeatherAlert?: boolean;
  isHoliday?: boolean;
  isNewZone?: boolean;
  recentPriceChange?: boolean;
}): ConfidenceFactors {
  const factors: ConfidenceFactors = {
    dataVolumeConfidence: calculateDataVolumeConfidence(params.sampleCount),
    accuracyConfidence: calculateAccuracyConfidence(params.accuracyRate),
    temporalConsistencyConfidence: calculateTemporalConsistencyConfidence(
      params.demandVariance,
      params.averageDemand,
    ),
    uncertaintyConfidence: calculateUncertaintyConfidence({
      hasActiveEvent: params.hasActiveEvent,
      hasWeatherAlert: params.hasWeatherAlert,
      isHoliday: params.isHoliday,
      isNewZone: params.isNewZone,
      recentPriceChange: params.recentPriceChange,
    }),
    overallConfidence: 0, // Will be calculated below
  };

  factors.overallConfidence = calculateOverallConfidence(factors);

  return factors;
}

/**
 * Get confidence explanation for UI display
 */
export function getConfidenceExplanation(confidence: number): string {
  if (confidence < 0.3) {
    return 'Very Low - Limited data or high uncertainty';
  } else if (confidence < 0.5) {
    return 'Low - Early learning phase';
  } else if (confidence < 0.7) {
    return 'Moderate - Learning in progress';
  } else if (confidence < 0.85) {
    return 'High - Well-trained model';
  } else {
    return 'Very High - Highly accurate predicts';
  }
}

/**
 * Determine if predict should be used or if fallback is needed
 */
export function shouldUsePredict(confidence: number, threshold: number = 0.3): boolean {
  return confidence >= threshold;
}
