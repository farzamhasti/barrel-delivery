import { orders } from '../drizzle/schema';
import { sql, and, gte, lte } from 'drizzle-orm';
import { getDb } from './db';

export interface DemandForecast {
  period: string;
  startDate: Date;
  endDate: Date;
  totalOrders: number;
  averageDailyOrders: number;
  orderGrowthRate: number;
  peakDeliveryHour: number;
  averageDeliveryTime: number;
  newCustomerPercentage: number;
  topAreas: Array<{ area: string; orderCount: number; percentage: number }>;
  forecastedDemand: number;
  confidenceScore: number;
  trends: {
    isGrowing: boolean;
    growthMomentum: number;
    volatility: number;
  };
}

/**
 * Calculate demand forecast for a specific date range
 */
export async function calculateDemandForecast(
  startDate: Date,
  endDate: Date
): Promise<DemandForecast | null> {
  const db = await getDb();
  if (!db) return null;

  // Fetch orders within date range
  const rangeOrders = await db
    .select()
    .from(orders)
    .where(
      and(
        gte(orders.createdAt, startDate),
        lte(orders.createdAt, endDate)
      )
    );

  if (rangeOrders.length === 0) {
    return {
      period: `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`,
      startDate,
      endDate,
      totalOrders: 0,
      averageDailyOrders: 0,
      orderGrowthRate: 0,
      peakDeliveryHour: 0,
      averageDeliveryTime: 0,
      newCustomerPercentage: 0,
      topAreas: [],
      forecastedDemand: 0,
      confidenceScore: 0,
      trends: {
        isGrowing: false,
        growthMomentum: 0,
        volatility: 0,
      },
    };
  }

  // Calculate basic metrics
  const totalOrders = rangeOrders.length;
  const daysDifference = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
  const averageDailyOrders = totalOrders / daysDifference;

  // Calculate delivery time metrics
  const deliveredOrders = rangeOrders.filter(o => o.deliveredAt);
  const averageDeliveryTime = deliveredOrders.length > 0
    ? deliveredOrders.reduce((sum, o) => {
        const duration = (o.deliveredAt!.getTime() - o.createdAt.getTime()) / (1000 * 60);
        return sum + duration;
      }, 0) / deliveredOrders.length
    : 0;

  // Calculate peak delivery hour
  const hourCounts = new Map<number, number>();
  rangeOrders.forEach(order => {
    const hour = order.createdAt.getHours();
    hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
  });
  const peakDeliveryHour = Array.from(hourCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || 0;

  // Calculate new customer percentage (using driverId as proxy)
  const driverIds = new Set(rangeOrders.map(o => o.driverId).filter(Boolean));
  const newCustomerPercentage = driverIds.size > 0
    ? ((totalOrders - driverIds.size) / totalOrders) * 100
    : 0;

  // Calculate top areas
  const areaMap = new Map<string, number>();
  rangeOrders.forEach(order => {
    const area = order.area || 'Unknown';
    areaMap.set(area, (areaMap.get(area) || 0) + 1);
  });
  const topAreas = Array.from(areaMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([area, count]) => ({
      area,
      orderCount: count,
      percentage: (count / totalOrders) * 100,
    }));

  // Calculate growth rate (compare first half to second half)
  const midPoint = Math.floor(rangeOrders.length / 2);
  const firstHalf = rangeOrders.slice(0, midPoint);
  const secondHalf = rangeOrders.slice(midPoint);
  const orderGrowthRate = firstHalf.length > 0
    ? ((secondHalf.length - firstHalf.length) / firstHalf.length) * 100
    : 0;

  // Calculate trend volatility (standard deviation of daily orders)
  const dailyOrderCounts = new Map<string, number>();
  rangeOrders.forEach(order => {
    const dateKey = order.createdAt.toLocaleDateString();
    dailyOrderCounts.set(dateKey, (dailyOrderCounts.get(dateKey) || 0) + 1);
  });
  const dailyCounts = Array.from(dailyOrderCounts.values());
  const meanDaily = dailyCounts.reduce((a, b) => a + b, 0) / dailyCounts.length;
  const variance = dailyCounts.reduce((sum, count) => sum + Math.pow(count - meanDaily, 2), 0) / dailyCounts.length;
  const volatility = Math.sqrt(variance);

  // Forecast future demand (simple linear extrapolation)
  const forecastedDemand = averageDailyOrders * 7; // Project to 7 days

  // Calculate confidence score based on data quality
  const dataPoints = rangeOrders.length;
  const timeSpanDays = daysDifference;
  const confidenceScore = Math.min(1.0, (dataPoints / (timeSpanDays * 5)) * 100) / 100; // Expect ~5 orders/day for high confidence

  return {
    period: `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`,
    startDate,
    endDate,
    totalOrders,
    averageDailyOrders,
    orderGrowthRate,
    peakDeliveryHour,
    averageDeliveryTime,
    newCustomerPercentage,
    topAreas,
    forecastedDemand,
    confidenceScore,
    trends: {
      isGrowing: orderGrowthRate > 0,
      growthMomentum: orderGrowthRate,
      volatility,
    },
  };
}

/**
 * Get forecast comparison between two periods
 */
export async function compareDemandForecasts(
  period1Start: Date,
  period1End: Date,
  period2Start: Date,
  period2End: Date
): Promise<{ period1: DemandForecast | null; period2: DemandForecast | null; comparison: any } | null> {
  const forecast1 = await calculateDemandForecast(period1Start, period1End);
  const forecast2 = await calculateDemandForecast(period2Start, period2End);

  if (!forecast1 || !forecast2) return null;

  return {
    period1: forecast1,
    period2: forecast2,
    comparison: {
      orderGrowth: forecast2.totalOrders - forecast1.totalOrders,
      orderGrowthPercentage: forecast1.totalOrders > 0
        ? ((forecast2.totalOrders - forecast1.totalOrders) / forecast1.totalOrders) * 100
        : 0,
      deliveryTimeChange: forecast2.averageDeliveryTime - forecast1.averageDeliveryTime,
      newCustomerChange: forecast2.newCustomerPercentage - forecast1.newCustomerPercentage,
    },
  };
}
