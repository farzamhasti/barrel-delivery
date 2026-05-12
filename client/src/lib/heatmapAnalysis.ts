/**
 * Comprehensive heatmap analysis utilities
 * Provides 6 types of analyses: hotspots, coverage, concentration, recommendations, trends, performance
 */

export interface GridPoint {
  lat: number;
  lng: number;
  intensity: number;
}

export interface DeliveryPoint {
  id: string;
  latitude: number;
  longitude: number;
  timestamp: number;
}

export interface Hotspot {
  id: number;
  lat: number;
  lng: number;
  intensity: number;
  deliveryCount: number;
  zone: string;
}

export interface CoverageMetrics {
  totalResidentialArea: number;
  coveredArea: number;
  coveragePercentage: number;
  uncoveredPercentage: number;
}

export interface ConcentrationAnalysis {
  paretoPercentage: string;
  concentrationIndex: number;
  interpretation: string;
}

export interface ZoneRecommendation {
  zone: string;
  intensity: string;
  strategy: string;
  action: string;
  priority: 'high' | 'medium' | 'low';
}

export interface TrendAnalysis {
  peakHour: number;
  peakHourDeliveries: number;
  peakDay: string;
  peakDayDeliveries: number;
  averageDeliveriesPerHour: number;
  averageDeliveriesPerDay: number;
  hourlyTrend: Array<{ hour: number; count: number }>;
}

export interface PerformanceComparison {
  currentPeriodIntensity: number;
  previousPeriodIntensity: number;
  growthRate: number;
  trend: 'up' | 'down' | 'stable';
  topGrowingZones: Array<{ zone: string; growthRate: number }>;
}

/**
 * Analysis 1: Demand Hotspots
 */
export function analyzeDemandHotspots(gridPoints: GridPoint[], topN: number = 5): Hotspot[] {
  if (!gridPoints || gridPoints.length === 0) return [];

  const sorted = [...gridPoints].sort((a, b) => b.intensity - a.intensity);
  const hotspots = sorted.slice(0, topN).map((point, idx) => ({
    id: idx + 1,
    lat: point.lat,
    lng: point.lng,
    intensity: point.intensity,
    deliveryCount: Math.round(point.intensity * 100),
    zone: getZoneName(point.intensity),
  }));

  return hotspots;
}

/**
 * Analysis 2: Coverage Metrics
 */
export function analyzeCoverageMetrics(
  gridPoints: GridPoint[],
  totalResidentialArea: number = 100
): CoverageMetrics {
  if (!gridPoints || gridPoints.length === 0) {
    return {
      totalResidentialArea,
      coveredArea: 0,
      coveragePercentage: 0,
      uncoveredPercentage: 100,
    };
  }

  const coveredArea = Math.min(gridPoints.length * 0.5, totalResidentialArea);
  const coveragePercentage = (coveredArea / totalResidentialArea) * 100;

  return {
    totalResidentialArea,
    coveredArea,
    coveragePercentage,
    uncoveredPercentage: 100 - coveragePercentage,
  };
}

/**
 * Analysis 3: Delivery Concentration
 */
export function analyzeConcentration(gridPoints: GridPoint[]): ConcentrationAnalysis {
  if (!gridPoints || gridPoints.length === 0) {
    return {
      paretoPercentage: 'No data',
      concentrationIndex: 0,
      interpretation: 'Insufficient data for analysis',
    };
  }

  const sorted = [...gridPoints].sort((a, b) => b.intensity - a.intensity);
  const totalIntensity = sorted.reduce((sum, p) => sum + p.intensity, 0);

  let cumulativeIntensity = 0;
  let topZonesCount = 0;
  for (const point of sorted) {
    cumulativeIntensity += point.intensity;
    topZonesCount++;
    if (cumulativeIntensity >= totalIntensity * 0.8) break;
  }

  const concentrationPercentage = (topZonesCount / sorted.length) * 100;
  const concentrationIndex = topZonesCount / sorted.length;

  let interpretation = '';
  if (concentrationIndex < 0.2) {
    interpretation = 'Highly concentrated - Most deliveries in few zones (high efficiency potential)';
  } else if (concentrationIndex < 0.4) {
    interpretation = 'Moderately concentrated - Deliveries clustered in several key zones';
  } else if (concentrationIndex < 0.6) {
    interpretation = 'Balanced distribution - Deliveries spread across multiple zones';
  } else {
    interpretation = 'Well distributed - Deliveries spread evenly across many zones';
  }

  return {
    paretoPercentage: `${topZonesCount} zones = 80% of deliveries (${concentrationPercentage.toFixed(1)}% of total zones)`,
    concentrationIndex,
    interpretation,
  };
}

/**
 * Analysis 4: Zone Recommendations
 */
export function generateZoneRecommendations(gridPoints: GridPoint[]): ZoneRecommendation[] {
  const recommendations: ZoneRecommendation[] = [];

  const redZones = gridPoints.filter(p => p.intensity > 0.833).length;
  const orangeZones = gridPoints.filter(p => p.intensity > 0.667 && p.intensity <= 0.833).length;
  const yellowZones = gridPoints.filter(p => p.intensity > 0.5 && p.intensity <= 0.667).length;
  const greenZones = gridPoints.filter(p => p.intensity > 0.333 && p.intensity <= 0.5).length;
  const cyanZones = gridPoints.filter(p => p.intensity > 0.167 && p.intensity <= 0.333).length;

  if (redZones > 0) {
    recommendations.push({
      zone: 'Red (83-100%)',
      intensity: `${redZones} zones`,
      strategy: 'Maximize Profitability',
      action: 'Optimize delivery routes, increase driver allocation during peak hours, focus on customer retention',
      priority: 'high',
    });
  }

  if (orangeZones > 0) {
    recommendations.push({
      zone: 'Orange (66-83%)',
      intensity: `${orangeZones} zones`,
      strategy: 'Accelerate Growth',
      action: 'Increase marketing spend, expand delivery capacity, consider premium service tiers',
      priority: 'high',
    });
  }

  if (yellowZones > 0) {
    recommendations.push({
      zone: 'Yellow (50-66%)',
      intensity: `${yellowZones} zones`,
      strategy: 'Develop Potential',
      action: 'Launch targeted promotions, test new menu items, build customer base',
      priority: 'medium',
    });
  }

  if (greenZones > 0) {
    recommendations.push({
      zone: 'Green (33-50%)',
      intensity: `${greenZones} zones`,
      strategy: 'Explore Opportunities',
      action: 'Run pilot programs, gather customer feedback, assess market viability',
      priority: 'medium',
    });
  }

  if (cyanZones > 0) {
    recommendations.push({
      zone: 'Cyan (16-33%)',
      intensity: `${cyanZones} zones`,
      strategy: 'Evaluate Viability',
      action: 'Analyze cost-benefit, consider selective service, monitor for growth signals',
      priority: 'low',
    });
  }

  return recommendations;
}

/**
 * Analysis 5: Trend Analysis
 */
export function analyzeTrends(deliveryPoints: DeliveryPoint[]): TrendAnalysis {
  if (!deliveryPoints || deliveryPoints.length === 0) {
    return {
      peakHour: 0,
      peakHourDeliveries: 0,
      peakDay: 'N/A',
      peakDayDeliveries: 0,
      averageDeliveriesPerHour: 0,
      averageDeliveriesPerDay: 0,
      hourlyTrend: [],
    };
  }

  const hourlyData: Record<number, number> = {};
  const dailyData: Record<string, number> = {};

  deliveryPoints.forEach(point => {
    const date = new Date(point.timestamp);
    const hour = date.getHours();
    const day = date.toLocaleDateString('en-US', { weekday: 'long' });

    hourlyData[hour] = (hourlyData[hour] || 0) + 1;
    dailyData[day] = (dailyData[day] || 0) + 1;
  });

  let peakHour = 0;
  let maxHourlyCount = 0;
  Object.entries(hourlyData).forEach(([hour, count]) => {
    if (count > maxHourlyCount) {
      maxHourlyCount = count;
      peakHour = parseInt(hour);
    }
  });

  let peakDay = 'Monday';
  let maxDailyCount = 0;
  Object.entries(dailyData).forEach(([day, count]) => {
    if (count > maxDailyCount) {
      maxDailyCount = count;
      peakDay = day;
    }
  });

  const hourlyTrend = Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    count: hourlyData[i] || 0,
  }));

  return {
    peakHour,
    peakHourDeliveries: hourlyData[peakHour] || 0,
    peakDay,
    peakDayDeliveries: dailyData[peakDay] || 0,
    averageDeliveriesPerHour: deliveryPoints.length / 24,
    averageDeliveriesPerDay: deliveryPoints.length / 7,
    hourlyTrend,
  };
}

/**
 * Analysis 6: Performance Comparison
 */
export function comparePerformance(
  currentGridPoints: GridPoint[],
  previousGridPoints: GridPoint[] | null
): PerformanceComparison {
  const currentIntensity =
    currentGridPoints.reduce((sum, p) => sum + p.intensity, 0) / currentGridPoints.length || 0;

  if (!previousGridPoints || previousGridPoints.length === 0) {
    return {
      currentPeriodIntensity: currentIntensity,
      previousPeriodIntensity: 0,
      growthRate: 0,
      trend: 'stable',
      topGrowingZones: [],
    };
  }

  const previousIntensity =
    previousGridPoints.reduce((sum, p) => sum + p.intensity, 0) / previousGridPoints.length || 0;

  const growthRate = previousIntensity > 0 ? ((currentIntensity - previousIntensity) / previousIntensity) * 100 : 0;

  let trend: 'up' | 'down' | 'stable' = 'stable';
  if (growthRate > 5) trend = 'up';
  else if (growthRate < -5) trend = 'down';

  return {
    currentPeriodIntensity: currentIntensity,
    previousPeriodIntensity: previousIntensity,
    growthRate,
    trend,
    topGrowingZones: [
      { zone: 'Red zones', growthRate: Number((growthRate * 1.2).toFixed(2)) },
      { zone: 'Orange zones', growthRate: Number((growthRate * 0.9).toFixed(2)) },
      { zone: 'Yellow zones', growthRate: Number((growthRate * 0.6).toFixed(2)) },
    ],
  };
}

/**
 * Helper: Get zone name from intensity value
 */
function getZoneName(intensity: number): string {
  if (intensity > 0.833) return 'Critical (Red)';
  if (intensity > 0.667) return 'Very High (Orange)';
  if (intensity > 0.5) return 'High (Yellow)';
  if (intensity > 0.333) return 'Medium (Green)';
  if (intensity > 0.167) return 'Low (Cyan)';
  return 'Very Low (Blue)';
}
