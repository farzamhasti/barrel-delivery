/**
 * Demand Surge Detection Module
 * 
 * Detects demand surges within operating hours only.
 * Identifies peak hour patterns, pre-closing surges, and weekend extended hour activity.
 */

import {
  isDuringPeakHours,
  isDuringPreClosingSurge,
  getDayCategory,
  DayCategory,
} from './operatingHours';
import { extractTemporalFeaturesForML, TemporalFeatures } from './temporalFeatures';

/**
 * Surge severity levels
 */
export enum SurgeSeverity {
  CRITICAL = 'critical',    // > 80% demand intensity
  HIGH = 'high',             // 60-80% demand intensity
  MODERATE = 'moderate',     // 40-60% demand intensity
  LOW = 'low',               // 20-40% demand intensity
  MINIMAL = 'minimal',       // < 20% demand intensity
}

/**
 * Surge type classification
 */
export enum SurgeType {
  EARLY_PEAK = 'early_peak',           // 5-7 PM
  MAIN_PEAK = 'main_peak',             // 7-9 PM (highest demand)
  LATE_PEAK = 'late_peak',             // 9-10 PM (weekdays) or 9-11 PM (Fri/Sat)
  PRE_CLOSING_SURGE = 'pre_closing',   // Last 30 minutes
  WEEKEND_EXTENDED = 'weekend_extended', // 10-11 PM Friday/Saturday
  NONE = 'none',                        // No surge detected
}

/**
 * Surge detection result
 */
export interface SurgeDetectionResult {
  isSurging: boolean;
  surgeType: SurgeType;
  severity: SurgeSeverity;
  demandIntensity: number;           // 0.0-1.0
  expectedDuration: number;           // minutes
  recommendations: string[];
  temporalContext: {
    dayCategory: DayCategory;
    hour: number;
    minutesUntilClose: number;
    isPeakHour: boolean;
    isPreClosing: boolean;
  };
}

/**
 * Detect demand surge at a given time
 * Returns surge information if within operating hours, null otherwise
 */
export function detectDemandSurge(date: Date = new Date()): SurgeDetectionResult | null {
  const temporalFeatures = extractTemporalFeaturesForML(date);
  const dayCategory = getDayCategory(date);
  
  // Check if within operating hours - only return surge if actually surging
  if (!temporalFeatures.isPeakHour && !temporalFeatures.isPreClosingSurge) {
    return null;
  }
  
  // Determine surge type
  let surgeType = SurgeType.NONE;
  let expectedDuration = 0;
  
  if (temporalFeatures.isMainPeak) {
    surgeType = SurgeType.MAIN_PEAK;
    expectedDuration = 120; // 2 hours
  } else if (temporalFeatures.isLatePeak && temporalFeatures.isPreClosingSurge) {
    surgeType = SurgeType.PRE_CLOSING_SURGE;
    expectedDuration = 30; // 30 minutes
  } else if (temporalFeatures.isLatePeak) {
    surgeType = SurgeType.LATE_PEAK;
    expectedDuration = 60; // 1 hour
  } else if (temporalFeatures.isEarlyPeak) {
    surgeType = SurgeType.EARLY_PEAK;
    expectedDuration = 120; // 2 hours
  }
  
  // Determine severity
  const severity = getSeverityFromIntensity(temporalFeatures.demandIntensity);
  
  // Generate recommendations based on surge type and severity
  const recommendations = generateRecommendations(surgeType, severity, dayCategory, temporalFeatures);
  
  return {
    isSurging: surgeType !== SurgeType.NONE,
    surgeType,
    severity,
    demandIntensity: temporalFeatures.demandIntensity,
    expectedDuration,
    recommendations,
    temporalContext: {
      dayCategory,
      hour: temporalFeatures.hour,
      minutesUntilClose: temporalFeatures.minutesUntilClose,
      isPeakHour: temporalFeatures.isPeakHour,
      isPreClosing: temporalFeatures.isPreClosingSurge,
    },
  };
}

/**
 * Get surge severity from demand intensity
 */
function getSeverityFromIntensity(intensity: number): SurgeSeverity {
  if (intensity > 0.8) return SurgeSeverity.CRITICAL;
  if (intensity > 0.6) return SurgeSeverity.HIGH;
  if (intensity > 0.4) return SurgeSeverity.MODERATE;
  if (intensity > 0.2) return SurgeSeverity.LOW;
  return SurgeSeverity.MINIMAL;
}

/**
 * Generate operational recommendations based on surge type and severity
 */
function generateRecommendations(
  surgeType: SurgeType,
  severity: SurgeSeverity,
  dayCategory: DayCategory,
  features?: TemporalFeatures
): string[] {
  const recommendations: string[] = [];
  
  // Base recommendations by surge type
  switch (surgeType) {
    case SurgeType.MAIN_PEAK:
      recommendations.push('Allocate maximum drivers for 7-9 PM peak demand');
      recommendations.push('Prepare kitchen for high order volume');
      if (severity === SurgeSeverity.CRITICAL) {
        recommendations.push('Consider temporary delivery fee increase');
        recommendations.push('Monitor order queue closely');
      }
      break;
      
    case SurgeType.LATE_PEAK:
      recommendations.push('Maintain elevated driver allocation for late orders');
      recommendations.push('Prepare for wind-down after peak');
      if (dayCategory === DayCategory.SATURDAY) {
        recommendations.push('Extended hours (until 11 PM) - maintain staffing');
      }
      break;
      
    case SurgeType.EARLY_PEAK:
      recommendations.push('Ramp up driver availability for 5-7 PM period');
      recommendations.push('Prepare kitchen for initial rush');
      break;
      
    case SurgeType.PRE_CLOSING_SURGE:
      recommendations.push('Last-minute orders incoming - prepare for final rush');
      recommendations.push('Ensure drivers are available for final deliveries');
      recommendations.push('Monitor completion times closely for SLA compliance');
      break;
      
    case SurgeType.NONE:
      recommendations.push('Normal demand levels - standard operations');
      break;
  }
  
  // Severity-based recommendations
  if (severity === SurgeSeverity.CRITICAL) {
    recommendations.push('Alert management to critical demand surge');
    recommendations.push('Monitor delivery times for SLA compliance');
  } else if (severity === SurgeSeverity.HIGH) {
    recommendations.push('Elevated demand - monitor operations');
  }
  
  return recommendations;
}

/**
 * Detect surge for multiple timestamps
 * Useful for predicting and planning
 */
export function detectBatchSurges(dates: Date[]): SurgeDetectionResult[] {
  return dates
    .map(date => detectDemandSurge(date))
    .filter((result): result is SurgeDetectionResult => result !== null);
}

/**
 * Predict upcoming surges for the next N hours
 */
export function predictUpcomingSurges(hoursAhead: number = 3): SurgeDetectionResult[] {
  const now = new Date();
  const dates: Date[] = [];
  
  for (let i = 0; i < hoursAhead * 60; i += 15) {
    const date = new Date(now.getTime() + i * 60 * 1000);
    dates.push(date);
  }
  
  return detectBatchSurges(dates);
}

/**
 * Get current surge status
 */
export function getCurrentSurgeStatus(): SurgeDetectionResult | null {
  return detectDemandSurge();
}

/**
 * Check if currently in a surge period
 */
export function isCurrentlySurging(): boolean {
  const surge = getCurrentSurgeStatus();
  return surge?.isSurging ?? false;
}

/**
 * Get surge statistics for a time period
 */
export interface SurgeStatistics {
  totalSurges: number;
  bySurgeType: Record<SurgeType, number>;
  bySeverity: Record<SurgeSeverity, number>;
  averageIntensity: number;
  maxIntensity: number;
  minIntensity: number;
}

export function calculateSurgeStatistics(surges: SurgeDetectionResult[]): SurgeStatistics {
  const stats: SurgeStatistics = {
    totalSurges: surges.length,
    bySurgeType: {
      [SurgeType.EARLY_PEAK]: 0,
      [SurgeType.MAIN_PEAK]: 0,
      [SurgeType.LATE_PEAK]: 0,
      [SurgeType.PRE_CLOSING_SURGE]: 0,
      [SurgeType.WEEKEND_EXTENDED]: 0,
      [SurgeType.NONE]: 0,
    },
    bySeverity: {
      [SurgeSeverity.CRITICAL]: 0,
      [SurgeSeverity.HIGH]: 0,
      [SurgeSeverity.MODERATE]: 0,
      [SurgeSeverity.LOW]: 0,
      [SurgeSeverity.MINIMAL]: 0,
    },
    averageIntensity: 0,
    maxIntensity: 0,
    minIntensity: 1.0,
  };
  
  if (surges.length === 0) {
    return stats;
  }
  
  let totalIntensity = 0;
  
  for (const surge of surges) {
    stats.bySurgeType[surge.surgeType]++;
    stats.bySeverity[surge.severity]++;
    
    totalIntensity += surge.demandIntensity;
    stats.maxIntensity = Math.max(stats.maxIntensity, surge.demandIntensity);
    stats.minIntensity = Math.min(stats.minIntensity, surge.demandIntensity);
  }
  
  stats.averageIntensity = totalIntensity / surges.length;
  
  return stats;
}

/**
 * Format surge detection result for display
 */
export function formatSurgeAlert(surge: SurgeDetectionResult): string {
  const timeStr = `${surge.temporalContext.hour}:00`;
  const intensityPercent = Math.round(surge.demandIntensity * 100);
  
  return `${surge.surgeType.toUpperCase()} at ${timeStr} - ${intensityPercent}% demand intensity (${surge.severity})`;
}
