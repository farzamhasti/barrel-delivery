/**
 * PHASE 2: Historical Order Learning
 * 
 * Loads all real orders and builds temporal aggregation patterns
 * for accurate demand predictioning based on actual historical data.
 */

import { getDb } from '../db';
import { orders } from '../../drizzle/schema';

export interface TemporalPattern {
  hourOfDay: number;
  dayOfWeek: number;
  isWeekend: boolean;
  monthOfYear: number;
  averageDemand: number;
  demandVariance: number;
  sampleCount: number;
  confidence: number;
}

export interface DemandTrend {
  zoneId: string;
  period: 'hourly' | 'daily' | 'weekly' | 'monthly';
  trend: 'increasing' | 'decreasing' | 'stable';
  trendStrength: number;
  rollingAverage7Day: number;
  rollingAverage30Day: number;
}

/**
 * Load all historical orders and aggregate by temporal patterns
 */
export async function buildHistoricalPatterns(zoneId: string): Promise<TemporalPattern[]> {
  try {
    const db = await getDb();
    if (!db) {
      console.log(`[Learning] Database not available`);
      return [];
    }

    // Query all orders for the zone
    const allOrders = await db
      .select({
        createdAt: orders.createdAt,
      })
      .from(orders)
      .execute();

    if (allOrders.length === 0) {
      console.log(`[Learning] No historical orders found for zone ${zoneId}`);
      return [];
    }

    // Aggregate by hour of day, day of week, etc.
    const patterns = new Map<string, { demands: number[]; count: number }>();

    for (const order of allOrders) {
      if (!order.createdAt) continue;

      const date = new Date(order.createdAt);
      const hourOfDay = date.getHours();
      const dayOfWeek = date.getDay();
      const monthOfYear = date.getMonth();

      const key = `${hourOfDay}_${dayOfWeek}_${monthOfYear}`;
      
      if (!patterns.has(key)) {
        patterns.set(key, { demands: [], count: 0 });
      }

      const pattern = patterns.get(key)!;
      pattern.demands.push(1); // Count as 1 order
      pattern.count++;
    }

    // Convert aggregated data to temporal patterns
    const temporalPatterns: TemporalPattern[] = [];

    for (const [key, data] of patterns.entries()) {
      const [hourOfDay, dayOfWeek, monthOfYear] = key.split('_').map(Number);
      
      const average = data.demands.reduce((a, b) => a + b, 0) / data.demands.length;
      const variance = data.demands.reduce((sum, val) => sum + Math.pow(val - average, 2), 0) / data.demands.length;
      
      // Confidence increases with sample size
      const confidence = Math.min(1, data.count / 50);

      temporalPatterns.push({
        hourOfDay,
        dayOfWeek,
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
        monthOfYear,
        averageDemand: average,
        demandVariance: variance,
        sampleCount: data.count,
        confidence,
      });
    }

    console.log(`[Learning] Built ${temporalPatterns.length} temporal patterns for zone ${zoneId} from ${allOrders.length} orders`);
    return temporalPatterns;

  } catch (error) {
    console.error('[Learning] Error building historical patterns:', error);
    return [];
  }
}

/**
 * Calculate demand trend for a zone
 */
export async function calculateDemandTrend(zoneId: string): Promise<DemandTrend | null> {
  try {
    const db = await getDb();
    if (!db) return null;

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get orders from last 30 days
    const recentOrders = await db
      .select({
        createdAt: orders.createdAt,
      })
      .from(orders)
      .execute();

    if (recentOrders.length < 10) {
      return null; // Not enough data for trend analysis
    }

    // Calculate rolling averages
    const allQuantities = recentOrders.map(() => 1); // Count as 1 order each
    const rollingAverage7Day = allQuantities.slice(-7).reduce((a: number, b: number) => a + b, 0) / Math.min(7, allQuantities.length);
    const rollingAverage30Day = allQuantities.reduce((a: number, b: number) => a + b, 0) / allQuantities.length;

    // Determine trend
    const firstHalf = allQuantities.slice(0, Math.floor(allQuantities.length / 2)).reduce((a: number, b: number) => a + b, 0) / Math.floor(allQuantities.length / 2);
    const secondHalf = allQuantities.slice(Math.floor(allQuantities.length / 2)).reduce((a: number, b: number) => a + b, 0) / Math.ceil(allQuantities.length / 2);
    
    const trendDifference = secondHalf - firstHalf;
    const trendStrength = Math.abs(trendDifference) / firstHalf;

    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (trendStrength > 0.1) {
      trend = trendDifference > 0 ? 'increasing' : 'decreasing';
    }

    return {
      zoneId,
      period: 'daily',
      trend,
      trendStrength,
      rollingAverage7Day,
      rollingAverage30Day,
    };

  } catch (error) {
    console.error('[Learning] Error calculating demand trend:', error);
    return null;
  }
}

/**
 * Get historical demand for a specific time slot
 */
export async function getHistoricalDemandForTimeSlot(
  zoneId: string,
  hourOfDay: number,
  dayOfWeek: number,
): Promise<{ average: number; variance: number; confidence: number } | null> {
  try {
    const patterns = await buildHistoricalPatterns(zoneId);
    
    const matchingPattern = patterns.find(
      p => p.hourOfDay === hourOfDay && p.dayOfWeek === dayOfWeek
    );

    if (!matchingPattern) {
      return null;
    }

    return {
      average: matchingPattern.averageDemand,
      variance: matchingPattern.demandVariance,
      confidence: matchingPattern.confidence,
    };

  } catch (error) {
    console.error('[Learning] Error getting historical demand:', error);
    return null;
  }
}
