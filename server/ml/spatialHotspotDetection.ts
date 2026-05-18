/**
 * Spatial Hotspot Detection
 * DBSCAN and HDBSCAN clustering for real-time demand hotspot detection
 */

import { logger } from '../utils/logger';

interface Point {
  lat: number;
  lng: number;
  demand?: number;
  timestamp?: number;
}

interface Hotspot {
  id: string;
  center: { lat: number; lng: number };
  radius: number;
  intensity: number;
  pointCount: number;
  demandLevel: 'low' | 'medium' | 'high' | 'critical';
  surge: boolean;
  predictedGrowth: number;
  timestamp: number;
}

interface ClusteringResult {
  hotspots: Hotspot[];
  surgeZones: Hotspot[];
  overloadedAreas: Hotspot[];
  timestamp: number;
}

/**
 * Simple DBSCAN implementation for hotspot detection
 */
class DBSCANClustering {
  private eps: number; // Maximum distance between points (in km)
  private minPts: number; // Minimum points to form a cluster

  constructor(eps: number = 1.0, minPts: number = 3) {
    this.eps = eps;
    this.minPts = minPts;
  }

  /**
   * Calculate distance between two points (Haversine formula)
   */
  private distance(p1: Point, p2: Point): number {
    const R = 6371; // Earth's radius in km
    const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
    const dLng = ((p2.lng - p1.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((p1.lat * Math.PI) / 180) *
        Math.cos((p2.lat * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Find neighbors of a point
   */
  private getNeighbors(points: Point[], pointIdx: number): number[] {
    const neighbors: number[] = [];
    for (let i = 0; i < points.length; i++) {
      if (this.distance(points[pointIdx], points[i]) <= this.eps) {
        neighbors.push(i);
      }
    }
    return neighbors;
  }

  /**
   * Perform DBSCAN clustering
   */
  cluster(points: Point[]): Point[][] {
    const clusters: Point[][] = [];
    const visited = new Set<number>();
    const noise: Point[] = [];

    for (let i = 0; i < points.length; i++) {
      if (visited.has(i)) continue;

      const neighbors = this.getNeighbors(points, i);

      if (neighbors.length < this.minPts) {
        noise.push(points[i]);
        visited.add(i);
        continue;
      }

      const cluster: Point[] = [];
      const queue = [i];

      while (queue.length > 0) {
        const idx = queue.shift()!;
        if (visited.has(idx)) continue;

        visited.add(idx);
        cluster.push(points[idx]);

        const newNeighbors = this.getNeighbors(points, idx);
        if (newNeighbors.length >= this.minPts) {
          queue.push(...newNeighbors.filter((n) => !visited.has(n)));
        }
      }

      if (cluster.length > 0) {
        clusters.push(cluster);
      }
    }

    return clusters;
  }
}

/**
 * Spatial Hotspot Detection Engine
 */
export class SpatialHotspotDetector {
  private dbscan: DBSCANClustering;
  private hotspotHistory: Map<string, Hotspot[]> = new Map();

  constructor(eps: number = 1.0, minPts: number = 3) {
    this.dbscan = new DBSCANClustering(eps, minPts);
  }

  /**
   * Detect hotspots from order points
   */
  detectHotspots(points: Point[]): ClusteringResult {
    if (points.length === 0) {
      return {
        hotspots: [],
        surgeZones: [],
        overloadedAreas: [],
        timestamp: Date.now(),
      };
    }

    try {
      // Perform clustering
      const clusters = this.dbscan.cluster(points);

      // Convert clusters to hotspots
      const hotspots = clusters.map((cluster, idx) => this.clusterToHotspot(cluster, idx));

      // Identify surge zones (high intensity, growing)
      const surgeZones = hotspots.filter((h) => h.surge && h.predictedGrowth > 0.2);

      // Identify overloaded areas (critical demand)
      const overloadedAreas = hotspots.filter((h) => h.demandLevel === 'critical');

      logger.info(`Detected ${hotspots.length} hotspots, ${surgeZones.length} surge zones`);

      return {
        hotspots,
        surgeZones,
        overloadedAreas,
        timestamp: Date.now(),
      };
    } catch (error) {
      logger.error('Hotspot detection failed:', error);
      return {
        hotspots: [],
        surgeZones: [],
        overloadedAreas: [],
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Convert cluster to hotspot
   */
  private clusterToHotspot(cluster: Point[], idx: number): Hotspot {
    // Calculate center
    const center = {
      lat: cluster.reduce((sum, p) => sum + p.lat, 0) / cluster.length,
      lng: cluster.reduce((sum, p) => sum + p.lng, 0) / cluster.length,
    };

    // Calculate radius (max distance from center)
    let maxRadius = 0;
    for (const point of cluster) {
      const dist = this.distance(center, point);
      maxRadius = Math.max(maxRadius, dist);
    }

    // Calculate intensity (average demand)
    const intensity = cluster.reduce((sum, p) => sum + (p.demand || 1), 0) / cluster.length;

    // Determine demand level
    let demandLevel: 'low' | 'medium' | 'high' | 'critical';
    if (intensity > 8) demandLevel = 'critical';
    else if (intensity > 6) demandLevel = 'high';
    else if (intensity > 3) demandLevel = 'medium';
    else demandLevel = 'low';

    // Calculate predicted growth
    const recentPoints = cluster.filter((p) => (p.timestamp || 0) > Date.now() - 600000); // Last 10 min
    const predictedGrowth = recentPoints.length / Math.max(cluster.length, 1);

    // Detect surge
    const surge = predictedGrowth > 0.5 && demandLevel !== 'low';

    return {
      id: `hotspot_${idx}_${Date.now()}`,
      center,
      radius: Math.max(maxRadius, 0.5),
      intensity,
      pointCount: cluster.length,
      demandLevel,
      surge,
      predictedGrowth,
      timestamp: Date.now(),
    };
  }

  /**
   * Calculate distance between two points
   */
  private distance(p1: { lat: number; lng: number }, p2: Point): number {
    const R = 6371;
    const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
    const dLng = ((p2.lng - p1.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((p1.lat * Math.PI) / 180) *
        Math.cos((p2.lat * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Predict future hotspots based on trend
   */
  predictFutureHotspots(
    currentHotspots: Hotspot[],
    predictHours: number = 1
  ): Hotspot[] {
    return currentHotspots
      .filter((h) => h.predictedGrowth > 0.1)
      .map((h) => ({
        ...h,
        intensity: h.intensity * (1 + h.predictedGrowth * predictHours),
        demandLevel:
          h.intensity * (1 + h.predictedGrowth * predictHours) > 8
            ? 'critical'
            : h.intensity * (1 + h.predictedGrowth * predictHours) > 6
              ? 'high'
              : h.demandLevel,
      }));
  }

  /**
   * Store hotspot history for trend analysis
   */
  storeHotspotHistory(zoneId: string, hotspots: Hotspot[]): void {
    if (!this.hotspotHistory.has(zoneId)) {
      this.hotspotHistory.set(zoneId, []);
    }
    const history = this.hotspotHistory.get(zoneId)!;
    history.push(...hotspots);

    // Keep only last 24 hours
    const cutoff = Date.now() - 86400000;
    const filtered = history.filter((h) => h.timestamp > cutoff);
    this.hotspotHistory.set(zoneId, filtered);
  }

  /**
   * Get hotspot trend
   */
  getHotspotTrend(zoneId: string): { growing: Hotspot[]; declining: Hotspot[]; stable: Hotspot[] } {
    const history = this.hotspotHistory.get(zoneId) || [];
    if (history.length < 2) {
      return { growing: [], declining: [], stable: [] };
    }

    const recent = history.slice(-10);
    const older = history.slice(-20, -10);

    const growing: Hotspot[] = [];
    const declining: Hotspot[] = [];
    const stable: Hotspot[] = [];

    for (const hotspot of recent) {
      const oldAvg = older.reduce((sum, h) => sum + h.intensity, 0) / Math.max(older.length, 1);
      const change = (hotspot.intensity - oldAvg) / Math.max(oldAvg, 1);

      if (change > 0.2) growing.push(hotspot);
      else if (change < -0.2) declining.push(hotspot);
      else stable.push(hotspot);
    }

    return { growing, declining, stable };
  }
}

// Export singleton instance
export const spatialHotspotDetector = new SpatialHotspotDetector(1.0, 3);
