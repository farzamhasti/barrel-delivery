import { getDb } from "./db";
import { orders } from "../drizzle/schema";
import { sql } from "drizzle-orm";

/**
 * Relative Demand Analysis System
 * 
 * Analyzes delivery demand geographically relative to Fort Erie-wide averages
 * using adaptive density clustering and smooth heatmap visualization.
 */

// Fort Erie boundary polygon (approximate coordinates)
// Defines the geographic constraint for all analysis
const FORT_ERIE_BOUNDARY = {
  minLat: 42.88,
  maxLat: 42.94,
  minLon: -78.98,
  maxLon: -78.92,
};

/**
 * Represents a localized geographic region with relative demand metrics
 */
export interface RelativeDemandRegion {
  id: string;
  centerLat: number;
  centerLon: number;
  orderCount: number;
  avgDeliveryTime: number;
  avgWaitingTime: number;
  
  // Relative metrics (compared to city-wide average)
  relativeDemandScore: number; // 0-100, where 50 = average
  relativeDeliveryPerformance: number; // 0-100
  relativeWaitingTime: number; // 0-100
  relativeOperationalIntensity: number; // 0-100
  
  // Classification
  classification: 'very_high' | 'high' | 'average' | 'weak' | 'underperforming';
  
  // Color for visualization
  color: string;
}

/**
 * City-wide statistics for relative comparison
 */
export interface CityWideStats {
  totalOrders: number;
  avgOrderDensity: number; // orders per sq km
  avgDeliveryTime: number;
  avgWaitingTime: number;
  avgOperationalIntensity: number;
}

/**
 * Point in 2D space for clustering
 */
interface Point {
  lat: number;
  lon: number;
}

/**
 * Cluster result from K-means
 */
interface Cluster {
  center: Point;
  points: Point[];
}

/**
 * Adaptive Density Clustering using K-means algorithm
 * Creates localized regions based on delivery density
 */
function adaptiveDensityClustering(points: Point[]): Cluster[] {
  if (points.length === 0) return [];
  if (points.length <= 5) {
    return [{
      center: {
        lat: points.reduce((sum, p) => sum + p.lat, 0) / points.length,
        lon: points.reduce((sum, p) => sum + p.lon, 0) / points.length,
      },
      points,
    }];
  }
  
  // Determine optimal number of clusters (adaptive)
  const k = Math.min(Math.ceil(Math.sqrt(points.length / 2)), 8);
  
  // Initialize centers randomly
  let centers: Point[] = [];
  for (let i = 0; i < k; i++) {
    centers.push(points[Math.floor(Math.random() * points.length)]);
  }
  
  // K-means iterations
  for (let iter = 0; iter < 10; iter++) {
    // Assign points to nearest center
    const clusters: Cluster[] = centers.map(center => ({
      center,
      points: [],
    }));
    
    for (const point of points) {
      let minDist = Infinity;
      let nearestCluster = 0;
      
      for (let i = 0; i < centers.length; i++) {
        const dist = Math.sqrt(
          Math.pow(point.lat - centers[i].lat, 2) +
          Math.pow(point.lon - centers[i].lon, 2)
        );
        if (dist < minDist) {
          minDist = dist;
          nearestCluster = i;
        }
      }
      clusters[nearestCluster].points.push(point);
    }
    
    // Update centers
    const newCenters = clusters.map(cluster => ({
      lat: cluster.points.reduce((sum, p) => sum + p.lat, 0) / Math.max(cluster.points.length, 1),
      lon: cluster.points.reduce((sum, p) => sum + p.lon, 0) / Math.max(cluster.points.length, 1),
    }));
    
    centers = newCenters;
  }
  
  // Final clustering
  const finalClusters: Cluster[] = centers.map(center => ({
    center,
    points: [],
  }));
  
  for (const point of points) {
    let minDist = Infinity;
    let nearestCluster = 0;
    
    for (let i = 0; i < centers.length; i++) {
      const dist = Math.sqrt(
        Math.pow(point.lat - centers[i].lat, 2) +
        Math.pow(point.lon - centers[i].lon, 2)
      );
      if (dist < minDist) {
        minDist = dist;
        nearestCluster = i;
      }
    }
    finalClusters[nearestCluster].points.push(point);
  }
  
  // Filter out empty clusters
  return finalClusters.filter(c => c.points.length > 0);
}

/**
 * Calculate city-wide statistics for relative comparison
 */
async function calculateCityWideStats(
  startDate: Date,
  endDate: Date
): Promise<CityWideStats> {
  const db = await getDb();
  if (!db) {
    return {
      totalOrders: 0,
      avgOrderDensity: 0,
      avgDeliveryTime: 0,
      avgWaitingTime: 0,
      avgOperationalIntensity: 0,
    };
  }
  
  const result = await db
    .select({
      totalOrders: sql<number>`COUNT(*)`,
      avgDeliveryTime: sql<number>`AVG(TIMESTAMPDIFF(MINUTE, createdAt, delivered_at))`,
      avgWaitingTime: sql<number>`AVG(TIMESTAMPDIFF(MINUTE, createdAt, ready_at))`,
    })
    .from(orders)
    .where(
      sql`delivered_at IS NOT NULL 
        AND createdAt >= ${startDate} 
        AND createdAt <= ${endDate}
        AND customer_latitude IS NOT NULL 
        AND customer_longitude IS NOT NULL`
    );
  
  const stats = result[0] || {
    totalOrders: 0,
    avgDeliveryTime: 0,
    avgWaitingTime: 0,
  };
  
  // Calculate area in sq km (Fort Erie is approximately 32 sq km)
  const fortErieAreaKm = 32;
  const avgOrderDensity = stats.totalOrders / fortErieAreaKm;
  return {
    totalOrders: stats.totalOrders || 0,
    avgOrderDensity,
    avgDeliveryTime: stats.avgDeliveryTime || 0,
    avgWaitingTime: stats.avgWaitingTime || 0,
    avgOperationalIntensity: (stats.avgDeliveryTime || 0) + (stats.avgWaitingTime || 0),
  };
}

/**
 * Classify region based on relative demand score
 */
function classifyRegion(score: number): RelativeDemandRegion['classification'] {
  if (score >= 80) return 'very_high';
  if (score >= 65) return 'high';
  if (score >= 45) return 'average';
  if (score >= 25) return 'weak';
  return 'underperforming';
}

/**
 * Get color for classification
 */
function getColorForClassification(classification: RelativeDemandRegion['classification']): string {
  const colors: Record<RelativeDemandRegion['classification'], string> = {
    very_high: '#001f3f',      // Dark blue
    high: '#0074D9',           // Blue
    average: '#7FDBCA',        // Teal
    weak: '#FF851B',           // Orange
    underperforming: '#FF4136', // Red
  };
  return colors[classification];
}

/**
 * Perform complete relative demand analysis
 */
export async function analyzeRelativeDemand(
  startDate: Date,
  endDate: Date
): Promise<{
  success: boolean;
  regions: RelativeDemandRegion[];
  cityWideStats: CityWideStats;
  interpretation: string;
}> {
  console.log('[Relative Demand Analysis] Date range:', {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  });
  
  const db = await getDb();
  if (!db) {
    return {
      success: false,
      regions: [],
      cityWideStats: {
        totalOrders: 0,
        avgOrderDensity: 0,
        avgDeliveryTime: 0,
        avgWaitingTime: 0,
        avgOperationalIntensity: 0,
      },
      interpretation: 'Database connection unavailable',
    };
  }
  
  // Fetch all completed delivery orders within date range
  const deliveryOrders = await db
    .select({
      id: orders.id,
      lat: orders.customerLatitude,
      lon: orders.customerLongitude,
      createdAt: orders.createdAt,
      readyAt: orders.readyAt,
      deliveredAt: orders.deliveredAt,
    })
    .from(orders)
    .where(
      sql`delivered_at IS NOT NULL 
        AND createdAt >= ${startDate} 
        AND createdAt <= ${endDate}
        AND customer_latitude IS NOT NULL 
        AND customer_longitude IS NOT NULL`
    );
  
  console.log('[Relative Demand Analysis] Found orders:', deliveryOrders.length);
  
  // Filter to Fort Erie boundary
  const fortErieOrders = deliveryOrders.filter(
    o => o.lat && o.lon &&
      Number(o.lat) >= FORT_ERIE_BOUNDARY.minLat &&
      Number(o.lat) <= FORT_ERIE_BOUNDARY.maxLat &&
      Number(o.lon) >= FORT_ERIE_BOUNDARY.minLon &&
      Number(o.lon) <= FORT_ERIE_BOUNDARY.maxLon
  );
  
  console.log('[Relative Demand Analysis] Orders in Fort Erie:', fortErieOrders.length);
  
  // Get city-wide statistics
  const cityStats = await calculateCityWideStats(startDate, endDate);
  
  // Perform adaptive density clustering
  const clusters = adaptiveDensityClustering(
    fortErieOrders.map(o => ({
      lat: Number(o.lat),
      lon: Number(o.lon),
    }))
  );
  
  console.log('[Relative Demand Analysis] Clusters found:', clusters.length);
  
  // Calculate relative metrics for each region
  const regions: RelativeDemandRegion[] = clusters.map((cluster, idx) => {
    const orderCount = cluster.points.length;
    
    // Get delivery times for this cluster
    const clusterOrders = (fortErieOrders as any[]).filter((o: any) =>
      cluster.points.some(p =>
        Math.abs(Number(o.lat) - p.lat) < 0.01 &&
        Math.abs(Number(o.lon) - p.lon) < 0.01
      )
    );
    
    const avgDeliveryTime = clusterOrders.reduce((sum: number, o: any) => {
      if (o.deliveredAt && o.createdAt) {
        const deliveredTime = o.deliveredAt instanceof Date ? o.deliveredAt : new Date(o.deliveredAt);
        const createdTime = o.createdAt instanceof Date ? o.createdAt : new Date(o.createdAt);
        const minutes = (deliveredTime.getTime() - createdTime.getTime()) / (1000 * 60);
        return sum + minutes;
      }
      return sum;
    }, 0) / Math.max(clusterOrders.length, 1);
    
    const avgWaitingTime = clusterOrders.reduce((sum: number, o: any) => {
      if (o.readyAt && o.createdAt) {
        const readyTime = o.readyAt instanceof Date ? o.readyAt : new Date(o.readyAt);
        const createdTime = o.createdAt instanceof Date ? o.createdAt : new Date(o.createdAt);
        const minutes = (readyTime.getTime() - createdTime.getTime()) / (1000 * 60);
        return sum + minutes;
      }
      return sum;
    }, 0) / Math.max(clusterOrders.length, 1);
    
    // Calculate relative demand score (0-100)
    // Compare this region's order density to city average
    const regionDensity = orderCount / 32; // sq km
    const relativeDensity = cityStats.avgOrderDensity > 0 
      ? (regionDensity / cityStats.avgOrderDensity) * 50 + 50
      : 50;
    const relativeDemandScore = Math.min(100, Math.max(0, relativeDensity));
    
    // Calculate relative delivery performance
    const relativeDeliveryPerformance = cityStats.avgDeliveryTime > 0
      ? Math.min(100, Math.max(0, (cityStats.avgDeliveryTime / avgDeliveryTime) * 50 + 50))
      : 50;
    
    // Calculate relative waiting time
    const relativeWaitingTime = cityStats.avgWaitingTime > 0
      ? Math.min(100, Math.max(0, (cityStats.avgWaitingTime / avgWaitingTime) * 50 + 50))
      : 50;
    
    // Operational intensity (combined delivery + waiting time)
    const relativeOperationalIntensity = (relativeDeliveryPerformance + relativeWaitingTime) / 2;
    
    const classification = classifyRegion(relativeDemandScore);
    
    return {
      id: `region-${idx}`,
      centerLat: cluster.center.lat,
      centerLon: cluster.center.lon,
      orderCount,
      avgDeliveryTime,
      avgWaitingTime,
      relativeDemandScore,
      relativeDeliveryPerformance,
      relativeWaitingTime,
      relativeOperationalIntensity,
      classification,
      color: getColorForClassification(classification),
    };
  });
  
  // Generate business interpretation
  let interpretation = '';
  if (regions.length === 0) {
    interpretation = `No delivery data available for the selected period.`;
  } else {
    const highDemandZones = regions.filter(r => r.classification === 'very_high' || r.classification === 'high');
    const lowDemandZones = regions.filter(r => r.classification === 'weak' || r.classification === 'underperforming');
    
    if (highDemandZones.length > 0) {
      interpretation += `High-demand zones identified: ${highDemandZones.length} region(s). `;
    }
    if (lowDemandZones.length > 0) {
      interpretation += `Underperforming zones: ${lowDemandZones.length} region(s). `;
    }
    
    const avgScore = regions.reduce((sum, r) => sum + r.relativeDemandScore, 0) / regions.length;
    if (avgScore > 60) {
      interpretation += `Geographic demand analysis for Fort Erie: Demand is relatively evenly distributed across Fort Erie with minor localized variations.`;
    } else if (avgScore > 40) {
      interpretation += `Geographic demand analysis for Fort Erie: Moderate concentration in specific zones with opportunities for market expansion.`;
    } else {
      interpretation += `Geographic demand analysis for Fort Erie: Demand is relatively evenly distributed across Fort Erie with minor localized variations.`;
    }
  }
  
  return {
    success: true,
    regions,
    cityWideStats: cityStats,
    interpretation,
  };
}
