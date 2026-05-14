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
  minLat: 42.8,
  maxLat: 43.0,
  minLon: -79.3,
  maxLon: -79.0,
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
  avgDeliveryTime: number; // minutes
  avgWaitingTime: number; // minutes
  avgOperationalIntensity: number;
}

/**
 * Adaptive density clustering using K-means-like approach
 * Creates localized spatial regions based on order density
 */
function adaptiveDensityClustering(
  orders: Array<{ lat: number; lon: number }>,
  targetClusterCount: number = 8
): Array<{ centerLat: number; centerLon: number; points: typeof orders }> {
  if (orders.length === 0) return [];
  
  // Initialize cluster centers randomly from order locations
  const initialCenters = orders
    .sort(() => Math.random() - 0.5)
    .slice(0, Math.min(targetClusterCount, orders.length))
    .map(o => ({ lat: o.lat, lon: o.lon }));
  
  let centers = initialCenters;
  let clusters: Array<{ centerLat: number; centerLon: number; points: typeof orders }> = [];
  
  // K-means iterations (simplified, 3 iterations for performance)
  for (let iter = 0; iter < 3; iter++) {
    // Assign points to nearest center
    const newClusters = centers.map(center => ({
      centerLat: center.lat,
      centerLon: center.lon,
      points: [] as typeof orders,
    }));
    
    for (const order of orders as any[]) {
      let nearestIdx = 0;
      let minDist = Infinity;
      
      for (let i = 0; i < centers.length; i++) {
        const dist = Math.hypot(
          order.lat - centers[i].lat,
          order.lon - centers[i].lon
        );
        if (dist < minDist) {
          minDist = dist;
          nearestIdx = i;
        }
      }
      
      newClusters[nearestIdx].points.push(order);
    }
    
    // Remove empty clusters
    clusters = newClusters.filter((c: any) => c.points.length > 0);
    
    // Update centers
    centers = clusters.map(cluster => {
      const avgLat = cluster.points.reduce((sum, p) => sum + p.lat, 0) / cluster.points.length;
      const avgLon = cluster.points.reduce((sum, p) => sum + p.lon, 0) / cluster.points.length;
      return { lat: avgLat, lon: avgLon };
    });
  }
  
  return clusters;
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
      avgDeliveryTime: sql<number>`AVG(TIMESTAMPDIFF(MINUTE, ${orders.createdAt}, ${orders.deliveredAt}))`,
      avgWaitingTime: sql<number>`AVG(TIMESTAMPDIFF(MINUTE, ${orders.createdAt}, ${orders.readyAt}))`,
    })
    .from(orders)
    .where(
      sql`${orders.deliveredAt} IS NOT NULL 
        AND ${orders.createdAt} >= ${startDate} 
        AND ${orders.createdAt} <= ${endDate}
        AND ${orders.customerLatitude} IS NOT NULL 
        AND ${orders.customerLongitude} IS NOT NULL`
    );
  
  const stats = result[0] || {
    totalOrders: 0,
    avgDeliveryTime: 0,
    avgWaitingTime: 0,
  };
  
  // Calculate area in sq km (Fort Erie is approximately 32 sq km)
  const fortErieAreaKm = 32;  const avgOrderDensity = stats.totalOrders / fortErieAreaKm;
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
 * Get color for region classification
 */
function getColorForClassification(classification: RelativeDemandRegion['classification']): string {
  const colors: Record<RelativeDemandRegion['classification'], string> = {
    very_high: '#001f3f', // Dark Blue
    high: '#0074D9', // Blue
    average: '#FFDC00', // Yellow
    weak: '#FF851B', // Orange
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
  regions: RelativeDemandRegion[];
  cityWideStats: CityWideStats;
  interpretation: string;
}> {
  const db = await getDb();
  if (!db) {
    return {
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
      sql`${orders.deliveredAt} IS NOT NULL 
        AND ${orders.createdAt} >= ${startDate} 
        AND ${orders.createdAt} <= ${endDate}
        AND ${orders.customerLatitude} IS NOT NULL 
        AND ${orders.customerLongitude} IS NOT NULL`
    );
  
  // Filter to Fort Erie boundary
  const fortErieOrders = deliveryOrders.filter(
    o => o.lat && o.lon &&
      Number(o.lat) >= FORT_ERIE_BOUNDARY.minLat &&
      Number(o.lat) <= FORT_ERIE_BOUNDARY.maxLat &&
      Number(o.lon) >= FORT_ERIE_BOUNDARY.minLon &&
      Number(o.lon) <= FORT_ERIE_BOUNDARY.maxLon
  );
  
  // Get city-wide statistics
  const cityStats = await calculateCityWideStats(startDate, endDate);
  
  // Perform adaptive density clustering
  const clusters = adaptiveDensityClustering(
    fortErieOrders.map(o => ({
      lat: Number(o.lat),
      lon: Number(o.lon),
    }))
  );
  
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
        const minutes = (o.deliveredAt.getTime() - o.createdAt.getTime()) / (1000 * 60);
        return sum + minutes;
      }
      return sum;
    }, 0) / Math.max(clusterOrders.length, 1);
    
    const avgWaitingTime = clusterOrders.reduce((sum: number, o: any) => {
      if (o.readyAt && o.createdAt) {
        const minutes = (o.readyAt.getTime() - o.createdAt.getTime()) / (1000 * 60);
        return sum + minutes;
      }
      return sum;
    }, 0) / Math.max(clusterOrders.length, 1);
    
    // Calculate relative demand score (0-100)
    const localDensity = orderCount / 32; // Fort Erie area ~32 sq km
    const demandRatio = cityStats.avgOrderDensity > 0 
      ? localDensity / cityStats.avgOrderDensity 
      : 1;
    const relativeDemandScore = Math.min(100, Math.max(0, demandRatio * 50));
    
    // Calculate relative delivery performance (0-100, where 50 = average)
    const deliveryRatio = cityStats.avgDeliveryTime > 0
      ? avgDeliveryTime / cityStats.avgDeliveryTime
      : 1;
    const relativeDeliveryPerformance = Math.min(100, Math.max(0, (1 / deliveryRatio) * 50));
    
    // Calculate relative waiting time (0-100)
    const waitingRatio = cityStats.avgWaitingTime > 0
      ? avgWaitingTime / cityStats.avgWaitingTime
      : 1;
    const relativeWaitingTime = Math.min(100, Math.max(0, (1 / waitingRatio) * 50));
    
    // Calculate operational intensity
    const operationalIntensity = avgDeliveryTime + avgWaitingTime;
    const operationalRatio = cityStats.avgOperationalIntensity > 0
      ? operationalIntensity / cityStats.avgOperationalIntensity
      : 1;
    const relativeOperationalIntensity = Math.min(100, Math.max(0, (1 / operationalRatio) * 50));
    
    const classification = classifyRegion(relativeDemandScore);
    
    return {
      id: `region_${idx}`,
      centerLat: cluster.centerLat,
      centerLon: cluster.centerLon,
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
  const veryHighRegions = regions.filter(r => r.classification === 'very_high');
  const underperformingRegions = regions.filter(r => r.classification === 'underperforming');
  
  let interpretation = 'Geographic demand analysis for Fort Erie: ';
  
  if (veryHighRegions.length > 0) {
    interpretation += `Central and high-density residential neighborhoods are performing significantly above city-wide average delivery demand levels. `;
  }
  
  if (underperformingRegions.length > 0) {
    interpretation += `Peripheral and lower-density residential areas remain below expected spatial demand intensity. `;
  }
  
  if (veryHighRegions.length === 0 && underperformingRegions.length === 0) {
    interpretation += `Demand is relatively evenly distributed across Fort Erie with minor localized variations.`;
  }
  
  return {
    regions,
    cityWideStats: cityStats,
    interpretation,
  };
}

/**
 * Get relative demand analysis for a specific region
 */
export async function getRegionDetails(
  regionId: string,
  startDate: Date,
  endDate: Date
): Promise<RelativeDemandRegion | null> {
  const analysis = await analyzeRelativeDemand(startDate, endDate);
  return analysis.regions.find((r: any) => r.id === regionId) || null;
}
