import { getDb } from "../db";
import { orders } from "../../drizzle/schema";
import { sql } from "drizzle-orm";

export interface HistoricalPattern {
  dayOfWeek: number;
  hour: number;
  averageDemand: number;
  peakHours: string[];
  averageDeliveryTime: number;
  commonHotspots: string[];
}

/**
 * Analyze historical demand patterns by day of week
 */
export async function analyzeWeekdayPatterns(): Promise<Record<number, number>> {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database not initialized");
    const patterns = await db
      .select({
        dayOfWeek: sql<number>`EXTRACT(DOW FROM ${orders.createdAt})`,
        count: sql<number>`COUNT(*)`,
      })
      .from(orders)
      .groupBy(sql`EXTRACT(DOW FROM ${orders.createdAt})`);

    const result: Record<number, number> = {};
    patterns.forEach((p: any) => {
      result[p.dayOfWeek] = p.count;
    });
    return result;
  } catch (error) {
    console.error("Error analyzing weekday patterns:", error);
    return {};
  }
}

/**
 * Analyze historical demand patterns by hour
 */
export async function analyzeHourlyPatterns(): Promise<Record<number, number>> {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database not initialized");
    const patterns = await db
      .select({
        hour: sql<number>`EXTRACT(HOUR FROM ${orders.createdAt})`,
        count: sql<number>`COUNT(*)`,
      })
      .from(orders)
      .groupBy(sql`EXTRACT(HOUR FROM ${orders.createdAt})`);

    const result: Record<number, number> = {};
    patterns.forEach((p: any) => {
      result[p.hour] = p.count;
    });
    return result;
  } catch (error) {
    console.error("Error analyzing hourly patterns:", error);
    return {};
  }
}

/**
 * Get peak hours based on historical data
 */
export async function getPeakHours(): Promise<string[]> {
  try {
    const hourlyPatterns = await analyzeHourlyPatterns();
    const sorted = Object.entries(hourlyPatterns)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    return sorted.map(([hour]) => {
      const h = parseInt(hour);
      return `${h}:00 - ${h + 1}:00`;
    });
  } catch (error) {
    console.error("Error getting peak hours:", error);
    return ["6 PM - 8 PM", "7 PM - 9 PM"];
  }
}

/**
 * Get average delivery time
 */
export async function getAverageDeliveryTime(): Promise<number> {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database not initialized");
    const result = await db
      .select({
        avgTime: sql<number>`AVG(EXTRACT(EPOCH FROM (${orders.deliveredAt} - ${orders.createdAt})) / 60)`,
      })
      .from(orders)
      .where(sql`${orders.deliveredAt} IS NOT NULL`);

    return Math.round(result[0]?.avgTime || 35);
  } catch (error) {
    console.error("Error getting average delivery time:", error);
    return 35;
  }
}

/**
 * Analyze historical hotspot distribution
 */
export async function analyzeHotspots(): Promise<string[]> {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database not initialized");
    const hotspots = await db
      .select({
        area: orders.area,
        count: sql<number>`COUNT(*)`,
      })
      .from(orders)
      .groupBy(orders.area)
      .orderBy(sql`COUNT(*) DESC`)
      .limit(3);

    return hotspots.map((h: any) => h.area || "Downtown");
  } catch (error) {
    console.error("Error analyzing hotspots:", error);
    return ["Downtown", "Residential Areas"];
  }
}

/**
 * Get total historical order count
 */
export async function getTotalHistoricalOrders(): Promise<number> {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database not initialized");
    const result = await db
      .select({
        count: sql<number>`COUNT(*)`,
      })
      .from(orders);

    return result[0]?.count || 0;
  } catch (error) {
    console.error("Error getting total historical orders:", error);
    return 0;
  }
}

/**
 * Get average orders per day
 */
export async function getAverageOrdersPerDay(): Promise<number> {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database not initialized");
    const result = await db
      .select({
        avgOrders: sql<number>`AVG(daily_count)`,
      })
      .from(
        db
          .select({
            date: sql<string>`DATE(${orders.createdAt})`,
            daily_count: sql<number>`COUNT(*)`,
          })
          .from(orders)
          .groupBy(sql`DATE(${orders.createdAt})`)
          .as("daily_orders")
      );

    return Math.round(result[0]?.avgOrders || 20);
  } catch (error) {
    console.error("Error getting average orders per day:", error);
    return 20;
  }
}
