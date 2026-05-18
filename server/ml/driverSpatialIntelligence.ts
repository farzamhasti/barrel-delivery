/**
 * Driver Spatial Intelligence
 * Predicts driver imbalance, shortage regions, and inefficient coverage zones
 */

import { logger } from '../utils/logger';

interface DriverLocation {
  driverId: string;
  lat: number;
  lng: number;
  status: 'available' | 'busy' | 'offline';
  activeOrders: number;
  timestamp: number;
}

interface DriverImbalance {
  zoneId: string;
  zoneName: string;
  demandLevel: number;
  driverCount: number;
  imbalanceScore: number; // 0-1, higher = more imbalanced
  severity: 'low' | 'medium' | 'high' | 'critical';
  recommendation: string;
}

interface DriverShortageRegion {
  regionId: string;
  center: { lat: number; lng: number };
  radius: number;
  expectedDemand: number;
  availableDrivers: number;
  shortageScore: number;
  estimatedWaitTime: number; // minutes
  urgency: 'low' | 'medium' | 'high' | 'critical';
}

interface InefficientCoverageZone {
  zoneId: string;
  zoneName: string;
  coverage: number; // 0-1
  efficiency: number; // 0-1
  issue: string;
  recommendation: string;
}

/**
 * Driver Spatial Intelligence Engine
 */
export class DriverSpatialIntelligence {
  /**
   * Detect driver imbalance across zones
   */
  detectDriverImbalance(
    drivers: DriverLocation[],
    demandByZone: Map<string, number>,
    zones: Map<string, { lat: number; lng: number; name: string }>
  ): DriverImbalance[] {
    const imbalances: DriverImbalance[] = [];

    // Count drivers per zone
    const driversByZone = new Map<string, number>();
    for (const zone of zones.keys()) {
      driversByZone.set(zone, 0);
    }

    for (const driver of drivers) {
      const zone = this.getZoneForCoordinates(driver.lat, driver.lng, zones);
      if (zone) {
        driversByZone.set(zone, (driversByZone.get(zone) || 0) + 1);
      }
    }

    // Calculate imbalance
    for (const [zoneId, zone] of zones) {
      const demand = demandByZone.get(zoneId) || 0;
      const driverCount = driversByZone.get(zoneId) || 0;
      const optimalDrivers = Math.ceil(demand / 3); // 3 orders per driver

      const imbalanceScore = Math.abs(driverCount - optimalDrivers) / Math.max(optimalDrivers, 1);

      let severity: 'low' | 'medium' | 'high' | 'critical';
      if (imbalanceScore > 0.7) severity = 'critical';
      else if (imbalanceScore > 0.5) severity = 'high';
      else if (imbalanceScore > 0.3) severity = 'medium';
      else severity = 'low';

      let recommendation = '';
      if (driverCount < optimalDrivers) {
        recommendation = `Need ${optimalDrivers - driverCount} more drivers in ${zone.name}`;
      } else if (driverCount > optimalDrivers) {
        recommendation = `Excess ${driverCount - optimalDrivers} drivers in ${zone.name}, consider redeployment`;
      }

      imbalances.push({
        zoneId,
        zoneName: zone.name,
        demandLevel: demand,
        driverCount,
        imbalanceScore,
        severity,
        recommendation,
      });
    }

    return imbalances.sort((a, b) => b.imbalanceScore - a.imbalanceScore);
  }

  /**
   * Detect driver shortage regions
   */
  detectDriverShortageRegions(
    drivers: DriverLocation[],
    demandPoints: Array<{ lat: number; lng: number; demand: number }>,
    shortageThreshold: number = 0.3
  ): DriverShortageRegion[] {
    const shortageRegions: DriverShortageRegion[] = [];

    // Create grid for analysis
    const gridSize = 0.05; // ~5km cells
    const minLat = 42.88;
    const maxLat = 43.15;
    const minLng = -79.3;
    const maxLng = -79.0;

    for (let lat = minLat; lat < maxLat; lat += gridSize) {
      for (let lng = minLng; lng < maxLng; lng += gridSize) {
        const cellCenter = { lat: lat + gridSize / 2, lng: lng + gridSize / 2 };

        // Count demand in cell
        let demand = 0;
        for (const point of demandPoints) {
          if (this.isPointInCell(point, lat, lng, gridSize)) {
            demand += point.demand;
          }
        }

        // Count available drivers in cell
        let availableDrivers = 0;
        for (const driver of drivers) {
          if (driver.status === 'available' && this.isPointInCell(driver, lat, lng, gridSize)) {
            availableDrivers++;
          }
        }

        // Calculate shortage score
        const optimalDrivers = Math.ceil(demand / 3);
        const shortageScore = Math.max(0, (optimalDrivers - availableDrivers) / Math.max(optimalDrivers, 1));

        if (shortageScore > shortageThreshold) {
          const waitTime = this.estimateWaitTime(demand, availableDrivers);

          let urgency: 'low' | 'medium' | 'high' | 'critical';
          if (shortageScore > 0.8) urgency = 'critical';
          else if (shortageScore > 0.6) urgency = 'high';
          else if (shortageScore > 0.4) urgency = 'medium';
          else urgency = 'low';

          shortageRegions.push({
            regionId: `shortage_${lat}_${lng}`,
            center: cellCenter,
            radius: gridSize * 111, // Convert to km (rough)
            expectedDemand: Math.round(demand),
            availableDrivers,
            shortageScore,
            estimatedWaitTime: waitTime,
            urgency,
          });
        }
      }
    }

    return shortageRegions.sort((a, b) => b.shortageScore - a.shortageScore);
  }

  /**
   * Detect inefficient coverage zones
   */
  detectInefficientCoverageZones(
    drivers: DriverLocation[],
    demandByZone: Map<string, number>,
    deliveryTimesByZone: Map<string, number[]>,
    zones: Map<string, { lat: number; lng: number; name: string }>
  ): InefficientCoverageZone[] {
    const inefficient: InefficientCoverageZone[] = [];

    for (const [zoneId, zone] of zones) {
      const demand = demandByZone.get(zoneId) || 0;
      const deliveryTimes = deliveryTimesByZone.get(zoneId) || [];

      if (demand === 0 || deliveryTimes.length === 0) continue;

      // Count drivers in zone
      const driverCount = drivers.filter((d) => this.getZoneForCoordinates(d.lat, d.lng, zones) === zoneId).length;

      // Calculate coverage (drivers / demand ratio)
      const coverage = driverCount / Math.max(demand, 1);

      // Calculate efficiency (average delivery time vs target)
      const avgDeliveryTime = deliveryTimes.reduce((a, b) => a + b, 0) / deliveryTimes.length;
      const targetDeliveryTime = 30; // 30 minutes target
      const efficiency = Math.max(0, 1 - (avgDeliveryTime - targetDeliveryTime) / targetDeliveryTime);

      // Identify issues
      let issue = '';
      let recommendation = '';

      if (coverage < 0.1) {
        issue = 'Insufficient driver coverage';
        recommendation = 'Deploy additional drivers to this zone';
      } else if (efficiency < 0.7) {
        issue = 'Poor delivery efficiency';
        recommendation = 'Optimize routes or add drivers for faster delivery';
      } else if (coverage > 0.5 && efficiency > 0.9) {
        issue = 'Over-coverage';
        recommendation = 'Consider redeploying drivers to shortage areas';
      }

      if (issue) {
        inefficient.push({
          zoneId,
          zoneName: zone.name,
          coverage,
          efficiency,
          issue,
          recommendation,
        });
      }
    }

    return inefficient;
  }

  /**
   * Predict driver shortage in next N hours
   */
  predictFutureDriverShortage(
    currentDrivers: DriverLocation[],
    predictedDemand: Map<string, number>,
    zones: Map<string, { lat: number; lng: number; name: string }>,
    hoursAhead: number = 1
  ): DriverImbalance[] {
    // Assume some drivers will go offline
    const expectedAvailable = Math.ceil(currentDrivers.length * 0.8);

    // Assume demand increases
    const demandMultiplier = 1 + hoursAhead * 0.1; // 10% increase per hour

    const adjustedDemand = new Map<string, number>();
    for (const [zone, demand] of predictedDemand) {
      adjustedDemand.set(zone, demand * demandMultiplier);
    }

    // Create mock driver locations for available drivers
    const availableDrivers = currentDrivers.slice(0, expectedAvailable).map((d) => ({
      ...d,
      status: 'available' as const,
    }));

    return this.detectDriverImbalance(availableDrivers, adjustedDemand, zones);
  }

  /**
   * Get driver deployment recommendations
   */
  getDeploymentRecommendations(
    imbalances: DriverImbalance[],
    shortages: DriverShortageRegion[]
  ): Array<{ from: string; to: string; count: number; reason: string }> {
    const recommendations: Array<{ from: string; to: string; count: number; reason: string }> = [];

    // Find zones with excess drivers
    const excessZones = imbalances.filter((i) => i.driverCount > Math.ceil(i.demandLevel / 3));

    // Find zones with shortages
    const shortageZones = imbalances.filter((i) => i.driverCount < Math.ceil(i.demandLevel / 3));

    // Create deployment recommendations
    for (const shortage of shortageZones) {
      for (const excess of excessZones) {
        if (excess.driverCount > Math.ceil(excess.demandLevel / 3) + 1) {
          const transferCount = Math.min(
            1,
            excess.driverCount - Math.ceil(excess.demandLevel / 3)
          );

          recommendations.push({
            from: excess.zoneId,
            to: shortage.zoneId,
            count: transferCount,
            reason: `Transfer ${transferCount} driver(s) from ${excess.zoneName} to ${shortage.zoneName}`,
          });

          excess.driverCount -= transferCount;
          shortage.driverCount += transferCount;
        }
      }
    }

    return recommendations;
  }

  /**
   * Helper: Get zone for coordinates
   */
  private getZoneForCoordinates(
    lat: number,
    lng: number,
    zones: Map<string, { lat: number; lng: number; name: string }>
  ): string | null {
    let closest: { zoneId: string; distance: number } | null = null;

    for (const [zoneId, zone] of zones) {
      const distance = this.distance(lat, lng, zone.lat, zone.lng);
      if (!closest || distance < closest.distance) {
        closest = { zoneId, distance };
      }
    }

    return closest && closest.distance < 5 ? closest.zoneId : null; // 5km threshold
  }

  /**
   * Helper: Check if point is in cell
   */
  private isPointInCell(point: { lat: number; lng: number }, lat: number, lng: number, size: number): boolean {
    return point.lat >= lat && point.lat < lat + size && point.lng >= lng && point.lng < lng + size;
  }

  /**
   * Helper: Calculate distance
   */
  private distance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Helper: Estimate wait time
   */
  private estimateWaitTime(demand: number, drivers: number): number {
    if (drivers === 0) return 60; // Max wait time
    const ordersPerDriver = demand / drivers;
    return Math.min(60, Math.ceil(ordersPerDriver * 10)); // ~10 minutes per order
  }
}

// Export singleton instance
export const driverSpatialIntelligence = new DriverSpatialIntelligence();
