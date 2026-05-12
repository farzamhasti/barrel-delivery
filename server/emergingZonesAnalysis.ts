import { getDb } from './db';
import { orders } from '../drizzle/schema';
import { sql, and, gte, lte } from 'drizzle-orm';
import { getCompetitorsWithinRadius, calculateDistance } from './competitorLocations';

export interface EmergingZone {
  zoneId: string;
  hexId: string;
  centerLat: number;
  centerLng: number;
  emergingScore: number;
  classification: 'rapid_emerging' | 'early_growth' | 'stable' | 'saturated' | 'declining';
  color: string;
  demandAcceleration: number;
  newCustomerGrowth: number;
  residentialExpansion: number;
  deliveryFeasibility: number;
  competitorSaturation: number;
  totalOrders: number;
  newCustomerCount: number;
  repeatCustomerCount: number;
  competitorCount: number;
  avgDeliveryDuration: number;
  weeklyOrders: number[];
  monthlyOrders: number[];
  growthVelocity: number;
  calculatedAt: Date;
}

/**
 * Simple H3-like hexagon ID generation for geographic clustering
 * Using lat/lng rounding to create zones
 * Resolution 5 = ~1km cells (good for small datasets)
 */
function generateHexId(lat: number, lng: number, resolution: number = 5): string {
  const precision = Math.pow(10, resolution);
  const roundedLat = Math.round(lat * precision) / precision;
  const roundedLng = Math.round(lng * precision) / precision;
  return `hex_${roundedLat}_${roundedLng}`;
}

/**
 * Calculate demand acceleration score
 */
function calculateDemandAcceleration(
  currentWeekOrders: number,
  previousWeekOrders: number,
  historicalAvg: number
): number {
  if (previousWeekOrders === 0 || historicalAvg === 0) return 0;
  
  const growthVelocity = (currentWeekOrders - previousWeekOrders) / previousWeekOrders;
  const trendStrength = (currentWeekOrders - historicalAvg) / historicalAvg;
  
  const acceleration = (growthVelocity + trendStrength) / 2;
  return Math.min(Math.max(acceleration, 0), 1.0);
}

/**
 * Calculate new customer growth score
 */
function calculateNewCustomerScore(
  newCustomerCount: number,
  repeatCustomerCount: number
): number {
  const total = newCustomerCount + repeatCustomerCount;
  if (total === 0) return 0;
  
  const newCustomerRatio = newCustomerCount / total;
  const recurrenceRate = repeatCustomerCount / total;
  
  return (newCustomerRatio * 0.6) + (recurrenceRate * 0.4);
}

/**
 * Calculate residential expansion score (simplified)
 */
function calculateResidentialExpansion(
  orderCount: number,
  maxOrderCount: number
): number {
  if (maxOrderCount === 0) return 0;
  return Math.min(orderCount / maxOrderCount, 1.0);
}

/**
 * Calculate delivery feasibility score
 */
function calculateDeliveryFeasibility(avgDeliveryDuration: number): number {
  // Normalize to 0-1: 45 minutes = 0, 5 minutes = 1
  const feasibility = 1 - Math.min(avgDeliveryDuration / 45, 1.0);
  return Math.max(feasibility, 0);
}

/**
 * Calculate competitor saturation score (inverse)
 */
function calculateCompetitorSaturation(
  orderCount: number,
  competitorCount: number
): number {
  if (competitorCount === 0) return 1.0; // High score if no competitors
  
  const demandPerCompetitor = orderCount / competitorCount;
  const saturation = Math.min(demandPerCompetitor / 10, 1.0); // Normalize
  
  return saturation;
}

/**
 * Calculate competitor proximity score for a zone
 * Higher score = fewer/farther competitors (better opportunity)
 */
function calculateCompetitorProximityScore(
  centerLat: number,
  centerLng: number,
  radiusKm: number = 1.0
): number {
  const competitors = getCompetitorsWithinRadius(centerLat, centerLng, radiusKm);
  
  if (competitors.length === 0) return 1.0; // High score if no competitors nearby
  
  // Calculate average distance to competitors
  const avgDistance = competitors.reduce((sum, comp) => {
    return sum + calculateDistance(centerLat, centerLng, comp.latitude, comp.longitude);
  }, 0) / competitors.length;
  
  // Normalize: 0km = 0 score, 1km = 0.5 score, 2km+ = 1.0 score
  const proximityScore = Math.min(avgDistance / radiusKm, 1.0);
  
  return proximityScore;
}

/**
 * Calculate final emerging score
 */
function calculateEmergingScore(
  demandAcceleration: number,
  newCustomerGrowth: number,
  residentialExpansion: number,
  deliveryFeasibility: number,
  competitorSaturation: number
): number {
  const score =
    (demandAcceleration * 0.35) +
    (newCustomerGrowth * 0.20) +
    (residentialExpansion * 0.20) +
    (deliveryFeasibility * 0.10) -
    (competitorSaturation * 0.15);
  
  return Math.min(Math.max(score, 0), 1.0);
}

/**
 * Classify zone based on emerging score
 */
function classifyZone(score: number): {
  classification: 'rapid_emerging' | 'early_growth' | 'stable' | 'saturated' | 'declining';
  color: string;
} {
  if (score >= 0.80) {
    return { classification: 'rapid_emerging', color: '#0066FF' }; // Bright Blue
  } else if (score >= 0.60) {
    return { classification: 'early_growth', color: '#00CCFF' }; // Cyan
  } else if (score >= 0.40) {
    return { classification: 'stable', color: '#00CC00' }; // Green
  } else if (score >= 0.20) {
    return { classification: 'saturated', color: '#FF9900' }; // Orange
  } else {
    return { classification: 'declining', color: '#999999' }; // Gray
  }
}

/**
 * Get weekly order counts for the last 12 weeks
 */
async function getWeeklyOrders(
  lat: number,
  lng: number,
  precision: number = 0.01
): Promise<number[]> {
  const weeklyData: number[] = [];
  const now = new Date();
  const db = await getDb();
  if (!db) return weeklyData;
  
  for (let week = 0; week < 12; week++) {
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - (week + 1) * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    
    const count = await db
      .select({ count: sql<number>`count(*)` })
      .from(orders)
      .where(
        and(
          sql`ABS(customer_latitude - ${lat}) < ${precision}`,
          sql`ABS(customer_longitude - ${lng}) < ${precision}`,
          gte(orders.createdAt, weekStart),
          lte(orders.createdAt, weekEnd)
        )
      )
      .then((result: any) => result[0]?.count || 0);
    
    weeklyData.unshift(count);
  }
  
  return weeklyData;
}

/**
 * Get monthly order counts for the last 6 months
 */
async function getMonthlyOrders(
  lat: number,
  lng: number,
  precision: number = 0.01
): Promise<number[]> {
  const monthlyData: number[] = [];
  const now = new Date();
  const db = await getDb();
  if (!db) return monthlyData;
  
  for (let month = 0; month < 6; month++) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - month, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - month + 1, 0);
    
    const count = await db
      .select({ count: sql<number>`count(*)` })
      .from(orders)
      .where(
        and(
          sql`ABS(customer_latitude - ${lat}) < ${precision}`,
          sql`ABS(customer_longitude - ${lng}) < ${precision}`,
          gte(orders.createdAt, monthStart),
          lte(orders.createdAt, monthEnd)
        )
      )
      .then((result: any) => result[0]?.count || 0);
    
    monthlyData.unshift(count);
  }
  
  return monthlyData;
}

/**
 * Analyze emerging demand zones with optional filters
 * @param dateRange - { startDate: Date, endDate: Date } or undefined for last 12 weeks
 * @param areaFilter - 'All' | 'Downtown' | 'Central Park' | 'Both' or undefined for all areas
 */
export async function analyzeEmergingZones(
  dateRange?: { startDate: Date; endDate: Date },
  areaFilter?: string
): Promise<EmergingZone[]> {
  const db = await getDb();
  if (!db) return [];
  
  // Determine date range
  let startDate = dateRange?.startDate;
  let endDate = dateRange?.endDate;
  
  if (!startDate || !endDate) {
    // Default to last 12 weeks if not specified
    endDate = new Date();
    startDate = new Date(Date.now() - 12 * 7 * 24 * 60 * 60 * 1000);
  }
  
  // Ensure startDate is at beginning of day (00:00:00) and endDate is at end of day (23:59:59)
  // This handles timezone issues when dates are created in browser local time
  const adjustedStartDate = new Date(startDate);
  adjustedStartDate.setUTCHours(0, 0, 0, 0);
  
  const adjustedEndDate = new Date(endDate);
  adjustedEndDate.setUTCHours(23, 59, 59, 999);
  
  // Build where conditions
  const conditions = [
    sql`customer_latitude IS NOT NULL`,
    sql`customer_longitude IS NOT NULL`,
    gte(orders.createdAt, adjustedStartDate),
    lte(orders.createdAt, adjustedEndDate),
  ];
  
  // Add area filter if specified and not 'All'
  if (areaFilter && areaFilter !== 'All') {
    conditions.push(sql`area = ${areaFilter}`);
  }
  
  // Get all orders with location data
  const allOrders = await db
    .select({
      id: orders.id,
      latitude: orders.customerLatitude,
      longitude: orders.customerLongitude,
      createdAt: orders.createdAt,
      deliveredAt: orders.deliveredAt,
      driverId: orders.driverId,
    })
    .from(orders)
    .where(and(...conditions));

  // Group orders by hex zone
  type OrderType = (typeof allOrders)[0];
  const zoneMap = new Map<string, OrderType[]>();
  
  for (const order of allOrders) {
    const lat = typeof order.latitude === 'string' ? parseFloat(order.latitude) : (order.latitude || 0);
    const lng = typeof order.longitude === 'string' ? parseFloat(order.longitude) : (order.longitude || 0);
    const hexId = generateHexId(lat, lng);
    if (!zoneMap.has(hexId)) {
      zoneMap.set(hexId, []);
    }
    zoneMap.get(hexId)!.push(order);
  }

  // Calculate metrics for each zone
  const emergingZones: EmergingZone[] = [];
  const maxOrders = Math.max(...Array.from(zoneMap.values()).map(z => z.length), 1);

  for (const [hexId, zoneOrders] of zoneMap) {
    if (zoneOrders.length < 2) continue; // Skip zones with fewer than 2 orders (lowered threshold for small datasets)

    const centerLat = zoneOrders.reduce((sum, o) => {
      const lat = typeof o.latitude === 'string' ? parseFloat(o.latitude) : (o.latitude || 0);
      return sum + lat;
    }, 0) / zoneOrders.length;
    const centerLng = zoneOrders.reduce((sum, o) => {
      const lng = typeof o.longitude === 'string' ? parseFloat(o.longitude) : (o.longitude || 0);
      return sum + lng;
    }, 0) / zoneOrders.length;

    // Calculate temporal metrics
    const now = new Date();
    const currentWeekStart = new Date(now);
    currentWeekStart.setDate(currentWeekStart.getDate() - now.getDay());
    
    const previousWeekStart = new Date(currentWeekStart);
    previousWeekStart.setDate(previousWeekStart.getDate() - 7);
    const previousWeekEnd = new Date(currentWeekStart);

    const currentWeekOrders = zoneOrders.filter((o: typeof zoneOrders[0]) => o.createdAt >= currentWeekStart).length;
    const previousWeekOrders = zoneOrders.filter(
      (o: typeof zoneOrders[0]) => o.createdAt >= previousWeekStart && o.createdAt < previousWeekEnd
    ).length;
    const historicalAvg = zoneOrders.length / 12;

    // Calculate customer metrics (using driverId as proxy for repeat customers)
    const driverIds = new Set(zoneOrders.map(o => o.driverId).filter(Boolean));
    const driverOrderCounts = new Map<number, number>();
    for (const order of zoneOrders) {
      if (order.driverId) {
        driverOrderCounts.set(order.driverId, (driverOrderCounts.get(order.driverId) || 0) + 1);
      }
    }

    const newCustomerCount = zoneOrders.length - driverOrderCounts.size;
    const repeatCustomerCount = driverOrderCounts.size;

    // Calculate delivery duration metrics
    const deliveredOrders = zoneOrders.filter((o: typeof zoneOrders[0]) => o.deliveredAt);
    const avgDeliveryDuration = deliveredOrders.length > 0
      ? deliveredOrders.reduce((sum: number, o: typeof zoneOrders[0]) => {
          const duration = (o.deliveredAt!.getTime() - o.createdAt.getTime()) / (1000 * 60);
          return sum + duration;
        }, 0) / deliveredOrders.length
      : 0;

    // Calculate scores
    const demandAcceleration = calculateDemandAcceleration(
      currentWeekOrders,
      Math.max(previousWeekOrders, 1),
      historicalAvg
    );

    const newCustomerGrowth = calculateNewCustomerScore(newCustomerCount, repeatCustomerCount);
    const residentialExpansion = calculateResidentialExpansion(zoneOrders.length, maxOrders);
    const deliveryFeasibility = calculateDeliveryFeasibility(avgDeliveryDuration);
    const competitorSaturation = calculateCompetitorSaturation(zoneOrders.length, 0); // Placeholder

    // Calculate competitor proximity score
    const competitorProximityScore = calculateCompetitorProximityScore(centerLat, centerLng, 1.0);
    
    // Count competitors in 1km radius
    const competitorsNearby = getCompetitorsWithinRadius(centerLat, centerLng, 1.0);
    const competitorCountInRadius = competitorsNearby.length;
    
    const emergingScore = calculateEmergingScore(
      demandAcceleration,
      newCustomerGrowth,
      residentialExpansion,
      deliveryFeasibility,
      competitorSaturation
    ) + (competitorProximityScore * 0.1); // Boost score for zones with fewer nearby competitors

    const { classification, color } = classifyZone(emergingScore);

    // Get temporal data
    const weeklyOrders = await getWeeklyOrders(centerLat, centerLng);
    const monthlyOrders = await getMonthlyOrders(centerLat, centerLng);

    const growthVelocity = previousWeekOrders > 0
      ? (currentWeekOrders - previousWeekOrders) / previousWeekOrders
      : 0;

    emergingZones.push({
      zoneId: `zone_${hexId}`,
      hexId,
      centerLat,
      centerLng,
      emergingScore,
      classification,
      color,
      demandAcceleration,
      newCustomerGrowth,
      residentialExpansion,
      deliveryFeasibility,
      competitorSaturation,
      totalOrders: zoneOrders.length,
      newCustomerCount,
      repeatCustomerCount,
      competitorCount: 0, // Placeholder
      avgDeliveryDuration,
      weeklyOrders,
      monthlyOrders,
      growthVelocity,
      calculatedAt: new Date(),
    });
  }

  // Sort by emerging score descending and return top 10
  return emergingZones
    .sort((a, b) => b.emergingScore - a.emergingScore)
    .slice(0, 10);
}

/**
 * Get top emerging zones with optional filters
 */
export async function getTopEmergingZones(
  limit: number = 10,
  dateRange?: { startDate: Date; endDate: Date },
  areaFilter?: string
): Promise<EmergingZone[]> {
  const zones = await analyzeEmergingZones(dateRange, areaFilter);
  return zones.filter(z => z.classification === 'rapid_emerging' || z.classification === 'early_growth').slice(0, limit);
}
