/**
 * Spatial Demand Forecasting Module
 * 
 * Predicts future geographic demand patterns based on historical trends.
 * Analyzes the rate of change in order density and extrapolates to forecast
 * future demand zones and their classifications.
 */

import { SpatialZone } from './spatialDemandShift';
import { filterZonesByBoundary } from './geographicBoundaryFilter';

export interface DemandTrend {
  hexId: string;
  latitude: number;
  longitude: number;
  previousDensity: number;
  currentDensity: number;
  densityChange: number;
  growthRate: number; // percentage change
  trendDirection: 'increasing' | 'decreasing' | 'stable';
  trendMagnitude: 'strong' | 'moderate' | 'weak'; // based on growth rate magnitude
}

export interface ForecastedZone {
  hexId: string;
  latitude: number;
  longitude: number;
  currentDensity: number;
  projectedDensity7d: number; // 7-day forecast
  projectedDensity30d: number; // 30-day forecast
  projectedDensity90d: number; // 90-day forecast
  trendDirection: 'increasing' | 'decreasing' | 'stable';
  predictionConfidence: number; // 0-1, higher is more confident
  forecastedClassification: string; // Expected Growth, Expected Decline, Expected Stability, etc.
  riskLevel: 'low' | 'medium' | 'high'; // confidence risk
}

export interface SpatialForecastResult {
  trends: DemandTrend[];
  forecasts: ForecastedZone[];
  forecastPeriod: {
    startDate: Date;
    endDate: Date;
    daysAnalyzed: number;
  };
  forecastSummary: string;
}

/**
 * Analyze demand trends from spatial zones
 * Calculates growth rates and trend directions
 */
export function analyzeDemandTrends(zones: SpatialZone[]): DemandTrend[] {
  // Filter zones by Fort Erie boundary
  const boundaryFilteredZones = filterZonesByBoundary(zones);
  
  return boundaryFilteredZones.map(zone => {
    const densityChange = zone.currentDensity - zone.previousDensity;
    const growthRate = zone.previousDensity > 0 
      ? (densityChange / zone.previousDensity) * 100 
      : (zone.currentDensity > 0 ? 100 : 0);

    // Determine trend direction
    let trendDirection: 'increasing' | 'decreasing' | 'stable';
    if (Math.abs(growthRate) < 5) {
      trendDirection = 'stable';
    } else if (growthRate > 0) {
      trendDirection = 'increasing';
    } else {
      trendDirection = 'decreasing';
    }

    // Determine trend magnitude
    const absGrowthRate = Math.abs(growthRate);
    let trendMagnitude: 'strong' | 'moderate' | 'weak';
    if (absGrowthRate >= 30) {
      trendMagnitude = 'strong';
    } else if (absGrowthRate >= 10) {
      trendMagnitude = 'moderate';
    } else {
      trendMagnitude = 'weak';
    }

    return {
      hexId: zone.hexId,
      latitude: zone.latitude,
      longitude: zone.longitude,
      previousDensity: zone.previousDensity,
      currentDensity: zone.currentDensity,
      densityChange,
      growthRate,
      trendDirection,
      trendMagnitude,
    };
  });
}

/**
 * Project future demand density based on trends
 * Uses linear extrapolation with trend decay factor
 */
export function projectFutureDensity(
  currentDensity: number,
  growthRate: number,
  daysAhead: number,
  trendDecayFactor: number = 0.95 // Trends decay over time
): number {
  if (currentDensity === 0) return 0;

  // Apply decay factor for each day (trends weaken over time)
  const decayedGrowthRate = growthRate * Math.pow(trendDecayFactor, daysAhead / 7);
  
  // Linear projection: future = current * (1 + (growth_rate/100) * (days/7))
  const projectedDensity = currentDensity * (1 + (decayedGrowthRate / 100) * (daysAhead / 7));
  
  // Ensure non-negative density
  return Math.max(0, projectedDensity);
}

/**
 * Calculate prediction confidence based on trend stability and data points
 * Higher confidence for stable, consistent trends
 */
export function calculateConfidence(
  growthRate: number,
  trendMagnitude: 'strong' | 'moderate' | 'weak',
  daysAnalyzed: number
): number {
  // Base confidence on trend stability
  let baseConfidence = 0.5;

  // Stable trends are more predictable
  if (Math.abs(growthRate) < 5) {
    baseConfidence = 0.75;
  } else if (Math.abs(growthRate) < 20) {
    baseConfidence = 0.65;
  } else {
    baseConfidence = 0.55;
  }

  // Adjust based on data period (more data = higher confidence)
  const dataQualityFactor = Math.min(daysAnalyzed / 30, 1); // Max out at 30 days
  const confidence = baseConfidence * (0.5 + 0.5 * dataQualityFactor);

  return Math.min(Math.max(confidence, 0), 1); // Clamp between 0-1
}

/**
 * Classify forecasted zones based on projected density changes
 */
export function classifyForecast(
  currentDensity: number,
  projectedDensity: number,
  confidence: number
): { classification: string; riskLevel: 'low' | 'medium' | 'high' } {
  const projectionChange = projectedDensity - currentDensity;
  const projectionRate = currentDensity > 0 ? (projectionChange / currentDensity) * 100 : 0;

  let classification: string;
  let riskLevel: 'low' | 'medium' | 'high';

  // Classify based on projected change and confidence
  if (Math.abs(projectionRate) < 5) {
    classification = 'Expected Stability';
    riskLevel = confidence > 0.7 ? 'low' : 'medium';
  } else if (projectionRate > 30) {
    classification = 'Expected Strong Growth';
    riskLevel = confidence > 0.7 ? 'low' : 'medium';
  } else if (projectionRate > 10) {
    classification = 'Expected Moderate Growth';
    riskLevel = confidence > 0.6 ? 'low' : 'medium';
  } else if (projectionRate < -30) {
    classification = 'Expected Rapid Decline';
    riskLevel = confidence > 0.7 ? 'low' : 'high';
  } else if (projectionRate < -10) {
    classification = 'Expected Moderate Decline';
    riskLevel = confidence > 0.6 ? 'low' : 'medium';
  } else {
    classification = 'Expected Minor Change';
    riskLevel = 'medium';
  }

  // Increase risk if confidence is low
  if (confidence < 0.5) {
    riskLevel = 'high';
  }

  return { classification, riskLevel };
}

/**
 * Generate forecasted zones from trends
 */
export function generateForecasts(
  trends: DemandTrend[],
  daysAnalyzed: number
): ForecastedZone[] {
  return trends.map(trend => {
    const confidence = calculateConfidence(trend.growthRate, trend.trendMagnitude, daysAnalyzed);

    // Project for 7, 30, and 90 days
    const projected7d = projectFutureDensity(trend.currentDensity, trend.growthRate, 7);
    const projected30d = projectFutureDensity(trend.currentDensity, trend.growthRate, 30);
    const projected90d = projectFutureDensity(trend.currentDensity, trend.growthRate, 90);

    // Use 30-day forecast for classification
    const { classification, riskLevel } = classifyForecast(
      trend.currentDensity,
      projected30d,
      confidence
    );

    return {
      hexId: trend.hexId,
      latitude: trend.latitude,
      longitude: trend.longitude,
      currentDensity: trend.currentDensity,
      projectedDensity7d: projected7d,
      projectedDensity30d: projected30d,
      projectedDensity90d: projected90d,
      trendDirection: trend.trendDirection,
      predictionConfidence: confidence,
      forecastedClassification: classification,
      riskLevel,
    };
  });
}

/**
 * Generate summary text for forecast results
 */
export function generateForecastSummary(
  forecasts: ForecastedZone[],
  forecastPeriod: { startDate: Date; endDate: Date; daysAnalyzed: number }
): string {
  if (forecasts.length === 0) {
    return 'No forecast data available for the selected period.';
  }

  // Count zones by classification
  const classificationCounts = forecasts.reduce((acc, zone) => {
    acc[zone.forecastedClassification] = (acc[zone.forecastedClassification] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Find high confidence forecasts
  const highConfidenceZones = forecasts.filter(z => z.predictionConfidence > 0.7);

  // Build summary
  const lines: string[] = [];
  lines.push(`Spatial demand forecast based on ${forecastPeriod.daysAnalyzed}-day analysis period.`);
  lines.push(`Analyzed ${forecasts.length} zones with ${highConfidenceZones.length} high-confidence predictions.`);

  // Add classification breakdown
  const classifications = Object.entries(classificationCounts)
    .map(([name, count]) => `${count} zones showing ${name}`)
    .join(', ');
  if (classifications) {
    lines.push(`Forecast breakdown: ${classifications}.`);
  }

  // Add confidence note
  const avgConfidence = forecasts.reduce((sum, z) => sum + z.predictionConfidence, 0) / forecasts.length;
  const confidenceLevel = avgConfidence > 0.7 ? 'high' : avgConfidence > 0.5 ? 'moderate' : 'low';
  lines.push(`Overall forecast confidence: ${confidenceLevel} (${(avgConfidence * 100).toFixed(0)}%).`);

  return lines.join(' ');
}

/**
 * Complete forecasting pipeline
 */
export function forecastSpatialDemand(
  zones: SpatialZone[],
  forecastPeriod: { startDate: Date; endDate: Date }
): SpatialForecastResult {
  // Calculate days analyzed
  const daysAnalyzed = Math.ceil(
    (forecastPeriod.endDate.getTime() - forecastPeriod.startDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Analyze trends
  const trends = analyzeDemandTrends(zones);

  // Generate forecasts
  const forecasts = generateForecasts(trends, daysAnalyzed);

  // Generate summary
  const forecastSummary = generateForecastSummary(forecasts, {
    startDate: forecastPeriod.startDate,
    endDate: forecastPeriod.endDate,
    daysAnalyzed,
  });

  return {
    trends,
    forecasts,
    forecastPeriod: {
      startDate: forecastPeriod.startDate,
      endDate: forecastPeriod.endDate,
      daysAnalyzed,
    },
    forecastSummary,
  };
}
