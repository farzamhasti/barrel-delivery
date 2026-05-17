/**
 * Spatial Demand Forecasting
 * Forecasts demand geographically by zone, cluster, neighborhood, and corridor
 */

import { logger } from '../utils/logger';

interface SpatialForecast {
  id: string;
  location: { lat: number; lng: number };
  locationType: 'zone' | 'cluster' | 'neighborhood' | 'corridor';
  locationName: string;
  forecastedDemand: number;
  confidence: number;
  timeWindow: { start: Date; end: Date };
  trend: 'increasing' | 'decreasing' | 'stable';
  riskFactors: string[];
  recommendations: string[];
  timestamp: number;
}

interface DeliveryCorridorForecast {
  corridorId: string;
  startZone: string;
  endZone: string;
  expectedOrders: number;
  estimatedTime: number; // minutes
  congestionLevel: 'low' | 'medium' | 'high' | 'critical';
  driverRequirement: number;
  timestamp: number;
}

/**
 * Spatial Demand Forecasting Engine
 */
export class SpatialDemandForecaster {
  private zones: Map<string, { lat: number; lng: number; name: string }> = new Map();
  private corridors: Map<string, DeliveryCorridorForecast> = new Map();

  constructor() {
    this.initializeZones();
    this.initializeCorridors();
  }

  /**
   * Initialize Fort Erie zones
   */
  private initializeZones(): void {
    const fortErieZones = [
      { id: 'downtown', lat: 43.0, lng: -79.15, name: 'Downtown Fort Erie' },
      { id: 'north', lat: 43.12, lng: -79.15, name: 'North Fort Erie' },
      { id: 'south', lat: 42.88, lng: -79.15, name: 'South Fort Erie' },
      { id: 'east', lat: 43.0, lng: -79.0, name: 'East Fort Erie' },
      { id: 'west', lat: 43.0, lng: -79.3, name: 'West Fort Erie' },
      { id: 'ridgeway', lat: 43.15, lng: -79.2, name: 'Ridgeway' },
      { id: 'crystal_beach', lat: 43.08, lng: -79.05, name: 'Crystal Beach' },
    ];

    for (const zone of fortErieZones) {
      this.zones.set(zone.id, { lat: zone.lat, lng: zone.lng, name: zone.name });
    }
  }

  /**
   * Initialize delivery corridors
   */
  private initializeCorridors(): void {
    const corridors = [
      { from: 'downtown', to: 'north', name: 'Downtown-North' },
      { from: 'downtown', to: 'south', name: 'Downtown-South' },
      { from: 'downtown', to: 'east', name: 'Downtown-East' },
      { from: 'downtown', to: 'west', name: 'Downtown-West' },
      { from: 'north', to: 'ridgeway', name: 'North-Ridgeway' },
      { from: 'east', to: 'crystal_beach', name: 'East-Crystal Beach' },
    ];

    for (const corridor of corridors) {
      this.corridors.set(`${corridor.from}_${corridor.to}`, {
        corridorId: `${corridor.from}_${corridor.to}`,
        startZone: corridor.from,
        endZone: corridor.to,
        expectedOrders: 0,
        estimatedTime: 0,
        congestionLevel: 'low',
        driverRequirement: 0,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Forecast demand by zone
   */
  forecastByZone(
    zoneId: string,
    historicalDemand: number[],
    currentConditions: { weather?: string; events?: string[]; timeOfDay?: string }
  ): SpatialForecast {
    const zone = this.zones.get(zoneId);
    if (!zone) {
      throw new Error(`Zone ${zoneId} not found`);
    }

    // Calculate base forecast from historical data
    const avgDemand = historicalDemand.reduce((a, b) => a + b, 0) / Math.max(historicalDemand.length, 1);
    const trend = this.calculateTrend(historicalDemand);

    // Apply weather multiplier
    let weatherMultiplier = 1.0;
    if (currentConditions.weather === 'rain') weatherMultiplier = 1.3;
    else if (currentConditions.weather === 'snow') weatherMultiplier = 1.5;
    else if (currentConditions.weather === 'clear') weatherMultiplier = 0.9;

    // Apply event multiplier
    let eventMultiplier = 1.0;
    if (currentConditions.events && currentConditions.events.length > 0) {
      eventMultiplier = 1.2 * currentConditions.events.length;
    }

    // Apply time of day multiplier
    let timeMultiplier = 1.0;
    if (currentConditions.timeOfDay === 'peak') timeMultiplier = 1.4;
    else if (currentConditions.timeOfDay === 'off_peak') timeMultiplier = 0.6;

    const forecastedDemand = avgDemand * weatherMultiplier * eventMultiplier * timeMultiplier;
    const confidence = this.calculateConfidence(historicalDemand, currentConditions);

    const riskFactors: string[] = [];
    const recommendations: string[] = [];

    if (weatherMultiplier > 1.2) {
      riskFactors.push('Adverse weather conditions');
      recommendations.push('Increase driver availability');
    }

    if (forecastedDemand > avgDemand * 1.5) {
      recommendations.push('Pre-position drivers in zone');
      recommendations.push('Prepare for surge pricing');
    }

    return {
      id: `forecast_zone_${zoneId}_${Date.now()}`,
      location: { lat: zone.lat, lng: zone.lng },
      locationType: 'zone',
      locationName: zone.name,
      forecastedDemand,
      confidence,
      timeWindow: {
        start: new Date(),
        end: new Date(Date.now() + 3600000), // 1 hour
      },
      trend,
      riskFactors,
      recommendations,
      timestamp: Date.now(),
    };
  }

  /**
   * Forecast demand by cluster
   */
  forecastByCluster(
    clusterId: string,
    clusterCenter: { lat: number; lng: number },
    clusterPoints: number,
    historicalDemand: number[]
  ): SpatialForecast {
    const avgDemand = historicalDemand.reduce((a, b) => a + b, 0) / Math.max(historicalDemand.length, 1);
    const densityFactor = clusterPoints / 10; // Normalize by typical cluster size
    const forecastedDemand = avgDemand * densityFactor;
    const confidence = Math.min(1, clusterPoints / 20); // Higher confidence with more points

    return {
      id: `forecast_cluster_${clusterId}_${Date.now()}`,
      location: clusterCenter,
      locationType: 'cluster',
      locationName: `Cluster ${clusterId}`,
      forecastedDemand,
      confidence,
      timeWindow: {
        start: new Date(),
        end: new Date(Date.now() + 3600000),
      },
      trend: this.calculateTrend(historicalDemand),
      riskFactors: [],
      recommendations: clusterPoints > 15 ? ['Deploy additional drivers to hotspot'] : [],
      timestamp: Date.now(),
    };
  }

  /**
   * Forecast demand by neighborhood
   */
  forecastByNeighborhood(
    neighborhoodId: string,
    neighborhoodName: string,
    center: { lat: number; lng: number },
    historicalDemand: number[],
    competitorDensity: number
  ): SpatialForecast {
    const avgDemand = historicalDemand.reduce((a, b) => a + b, 0) / Math.max(historicalDemand.length, 1);

    // Adjust for competitor density
    const competitorFactor = Math.max(0.5, 1 - competitorDensity * 0.1);
    const forecastedDemand = avgDemand * competitorFactor;

    const riskFactors: string[] = [];
    const recommendations: string[] = [];

    if (competitorDensity > 3) {
      riskFactors.push('High competitor density');
      recommendations.push('Focus on delivery speed and quality');
      recommendations.push('Consider promotional pricing');
    }

    return {
      id: `forecast_neighborhood_${neighborhoodId}_${Date.now()}`,
      location: center,
      locationType: 'neighborhood',
      locationName: neighborhoodName,
      forecastedDemand,
      confidence: 0.75,
      timeWindow: {
        start: new Date(),
        end: new Date(Date.now() + 3600000),
      },
      trend: this.calculateTrend(historicalDemand),
      riskFactors,
      recommendations,
      timestamp: Date.now(),
    };
  }

  /**
   * Forecast demand by delivery corridor
   */
  forecastByCorridorDemand(
    startZoneId: string,
    endZoneId: string,
    historicalOrders: number[],
    currentDrivers: number
  ): DeliveryCorridorForecast {
    const corridorId = `${startZoneId}_${endZoneId}`;
    const avgOrders = historicalOrders.reduce((a, b) => a + b, 0) / Math.max(historicalOrders.length, 1);

    // Estimate delivery time (simplified)
    const estimatedTime = 15 + Math.random() * 20; // 15-35 minutes

    // Determine congestion level
    let congestionLevel: 'low' | 'medium' | 'high' | 'critical';
    const ordersPerDriver = avgOrders / Math.max(currentDrivers, 1);
    if (ordersPerDriver > 5) congestionLevel = 'critical';
    else if (ordersPerDriver > 3) congestionLevel = 'high';
    else if (ordersPerDriver > 1.5) congestionLevel = 'medium';
    else congestionLevel = 'low';

    // Calculate driver requirement
    const driverRequirement = Math.ceil(avgOrders / 3); // 3 orders per driver

    return {
      corridorId,
      startZone: startZoneId,
      endZone: endZoneId,
      expectedOrders: Math.round(avgOrders),
      estimatedTime: Math.round(estimatedTime),
      congestionLevel,
      driverRequirement,
      timestamp: Date.now(),
    };
  }

  /**
   * Calculate trend from historical data
   */
  private calculateTrend(data: number[]): 'increasing' | 'decreasing' | 'stable' {
    if (data.length < 2) return 'stable';

    const recent = data.slice(-5);
    const older = data.slice(-10, -5);

    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;

    const change = (recentAvg - olderAvg) / Math.max(olderAvg, 1);

    if (change > 0.1) return 'increasing';
    if (change < -0.1) return 'decreasing';
    return 'stable';
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(
    data: number[],
    conditions: { weather?: string; events?: string[]; timeOfDay?: string }
  ): number {
    let confidence = 0.7; // Base confidence

    // Increase confidence with more historical data
    confidence += Math.min(0.2, data.length / 100);

    // Decrease confidence with extreme conditions
    if (conditions.weather === 'snow') confidence -= 0.1;
    if (conditions.events && conditions.events.length > 2) confidence -= 0.1;

    return Math.max(0.3, Math.min(1, confidence));
  }

  /**
   * Get all zone forecasts
   */
  getAllZoneForecasts(
    historicalData: Map<string, number[]>,
    conditions: { weather?: string; events?: string[]; timeOfDay?: string }
  ): SpatialForecast[] {
    const forecasts: SpatialForecast[] = [];

    for (const [zoneId] of this.zones) {
      const data = historicalData.get(zoneId) || [5, 6, 7, 8, 9];
      forecasts.push(this.forecastByZone(zoneId, data, conditions));
    }

    return forecasts;
  }

  /**
   * Get corridor forecasts
   */
  getCorridorForecasts(
    historicalData: Map<string, number[]>,
    driverLocations: Map<string, number>
  ): DeliveryCorridorForecast[] {
    const forecasts: DeliveryCorridorForecast[] = [];

    for (const [corridorId, corridor] of this.corridors) {
      const data = historicalData.get(corridorId) || [3, 4, 5, 6, 7];
      const drivers = driverLocations.get(corridor.startZone) || 2;
      forecasts.push(
        this.forecastByCorridorDemand(corridor.startZone, corridor.endZone, data, drivers)
      );
    }

    return forecasts;
  }
}

// Export singleton instance
export const spatialDemandForecaster = new SpatialDemandForecaster();
