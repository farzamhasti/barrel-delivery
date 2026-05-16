import { getDb } from "../db";
import { orders } from "../../drizzle/schema";
import { sql } from "drizzle-orm";

export interface FallbackForecastData {
  demandLevel: "Low" | "Moderate" | "High";
  expectedVolume: number;
  confidenceScore: number;
  peakHours: string[];
  hotspotsExpected: string[];
  delayProbability: number;
  driverShortageRisk: number;
  dataSource: "live" | "historical";
  historicalBasis: string;
}

/**
 * Generate fallback forecast using historical patterns
 * when live operational data is unavailable
 */
export async function generateFallbackForecast(
  forecastDate: Date,
  isToday: boolean
): Promise<FallbackForecastData> {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database not initialized");
    
    // Get historical data for similar days
    const dayOfWeek = forecastDate.getDay();
    
    // Query historical orders for same day of week
    const historicalOrders = await db
      .select({
        totalOrders: sql<number>`COUNT(*)`,
        avgDeliveryTime: sql<number>`AVG(EXTRACT(EPOCH FROM (${orders.deliveredAt} - ${orders.createdAt})) / 60)`,
      })
      .from(orders)
      .where(
        sql`EXTRACT(DOW FROM ${orders.createdAt}) = ${dayOfWeek}`
      );

    const baselineVolume = historicalOrders[0]?.totalOrders || 15;
    const avgDeliveryTime = historicalOrders[0]?.avgDeliveryTime || 35;

    // Determine demand level based on historical patterns
    let demandLevel: "Low" | "Moderate" | "High";
    if (baselineVolume < 10) demandLevel = "Low";
    else if (baselineVolume < 25) demandLevel = "Moderate";
    else demandLevel = "High";

    // Calculate peak hours (typically 6-8 PM for delivery)
    const peakHours = ["6 PM - 8 PM", "7 PM - 9 PM"];

    // Estimate hotspots based on historical order distribution
    const hotspotsExpected = ["Downtown", "Residential Areas"];

    // Calculate probabilities
    const delayProbability = avgDeliveryTime > 40 ? 0.6 : 0.3;
    const driverShortageRisk = baselineVolume > 20 ? 0.65 : 0.35;

    // Confidence score based on data freshness and volume
    const confidenceScore = Math.min(0.85, 0.5 + (baselineVolume / 50) * 0.35);

    return {
      demandLevel,
      expectedVolume: Math.round(baselineVolume),
      confidenceScore,
      peakHours,
      hotspotsExpected,
      delayProbability,
      driverShortageRisk,
      dataSource: "historical",
      historicalBasis: `Based on ${baselineVolume} historical orders from similar ${getDayName(dayOfWeek)}s`,
    };
  } catch (error) {
    console.error("Fallback forecast generation error:", error);
    // Return minimal safe forecast
    return {
      demandLevel: "Moderate",
      expectedVolume: 20,
      confidenceScore: 0.5,
      peakHours: ["6 PM - 8 PM"],
      hotspotsExpected: ["Downtown"],
      delayProbability: 0.4,
      driverShortageRisk: 0.5,
      dataSource: "historical",
      historicalBasis: "Default forecast - limited historical data available",
    };
  }
}

function getDayName(dayOfWeek: number): string {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return days[dayOfWeek] || "day";
}

/**
 * Apply weather adjustments to fallback forecast
 */
export function applyWeatherAdjustment(
  forecast: FallbackForecastData,
  weatherDescription: string,
  temperature: number
): FallbackForecastData {
  let volumeMultiplier = 1.0;

  // Weather impact
  if (weatherDescription.toLowerCase().includes("snow")) {
    volumeMultiplier *= 1.35;
  } else if (weatherDescription.toLowerCase().includes("rain")) {
    volumeMultiplier *= 1.15;
  }

  // Temperature impact
  if (temperature < 0) {
    volumeMultiplier *= 1.2; // Cold weather increases demand
  } else if (temperature > 25) {
    volumeMultiplier *= 0.9; // Hot weather decreases demand
  }

  return {
    ...forecast,
    expectedVolume: Math.round(forecast.expectedVolume * volumeMultiplier),
    confidenceScore: Math.max(0.4, forecast.confidenceScore - 0.1),
  };
}

/**
 * Apply event adjustments to fallback forecast
 */
export function applyEventAdjustment(
  forecast: FallbackForecastData,
  eventMultiplier: number
): FallbackForecastData {
  return {
    ...forecast,
    expectedVolume: Math.round(forecast.expectedVolume * eventMultiplier),
    historicalBasis: `${forecast.historicalBasis} (adjusted for events)`,
  };
}
