/**
 * tRPC Procedures for Spatial Analytics Queries
 * Phase 27.4: Analytics Query Interface
 * 
 * Exposes spatial analysis capabilities through tRPC for backend analytics
 */

import { publicProcedure, protectedProcedure, router } from './_core/trpc';
import { z } from 'zod';
import { getDb } from './db';
import { orders, competitors, spatialClusters, growthAnalysis, deliveryHeatmapData } from '../drizzle/schema';
import { eq, gte, lte, and } from 'drizzle-orm';
import {
  performSpatialAnalysis,
  type OrderLocation,
  type CompetitorLocation,
  type SpatialAnalysisResult,
} from './spatial-intelligence-v2';
import { getCompetitorsFromAPI } from './competitors';

// Constants
const RESTAURANT_LAT = 42.90517;
const RESTAURANT_LNG = -78.92295;
const DEFAULT_EXTRACTION_RADIUS_KM = 2;

/**
 * Convert database orders to OrderLocation format
 */
async function getOrderLocations(startDate?: Date, endDate?: Date): Promise<OrderLocation[]> {
  const db = await getDb();
  if (!db) return [];

  let dbOrders: any[] = [];

  try {
    // Filter by date range if provided
    if (startDate && endDate) {
      const whereConditions = and(
        gte(orders.createdAt, startDate),
        lte(orders.createdAt, endDate)
      );
      dbOrders = await (db as any).query.orders.findMany({
        where: whereConditions,
      });
    } else {
      dbOrders = await (db as any).query.orders.findMany();
    }
  } catch (error) {
    console.error('[spatial-analytics] Error fetching orders:', error);
  }

  return dbOrders
    .filter((order: any) => order.customerLatitude && order.customerLongitude)
    .map((order: any) => ({
      id: order.id,
      latitude: parseFloat(order.customerLatitude!.toString()),
      longitude: parseFloat(order.customerLongitude!.toString()),
      area: order.area || undefined,
      deliveryTimeMinutes: order.deliveryTime ? parseInt(order.deliveryTime) : undefined,
      createdAt: order.createdAt,
    }));
}

/**
 * Get competitor locations from database or API
 */
async function getCompetitorLocations(): Promise<CompetitorLocation[]> {
  const db = await getDb();
  if (!db) return [];

  // Try to get from database first
  let dbCompetitors: any[] = [];
  try {
    dbCompetitors = await (db as any).query.competitors.findMany();
  } catch (error) {
    console.error('[spatial-analytics] Error fetching competitors from DB:', error);
  }

  if (dbCompetitors.length > 0) {
    return dbCompetitors.map((comp: any) => ({
      id: comp.id,
      name: comp.name,
      latitude: parseFloat(comp.latitude.toString()),
      longitude: parseFloat(comp.longitude.toString()),
      type: comp.type,
      distanceFromRestaurantKm: parseFloat(comp.distanceFromRestaurantKm?.toString() || '0'),
    }));
  }

  // Fetch from API if database is empty
  try {
    const apiCompetitors = await getCompetitorsFromAPI(
      RESTAURANT_LAT,
      RESTAURANT_LNG,
      DEFAULT_EXTRACTION_RADIUS_KM
    );

    return apiCompetitors.map((comp, index) => ({
      id: index + 1,
      name: comp.name,
      latitude: comp.latitude,
      longitude: comp.longitude,
      type: comp.type,
      distanceFromRestaurantKm: comp.distanceFromRestaurantKm,
    }));
  } catch (error) {
    console.error('[spatial-analytics] Error fetching competitors from API:', error);
    return [];
  }
}

/**
 * Spatial Analytics Router
 */
export const spatialAnalyticsRouter = router({
  /**
   * Get comprehensive spatial analysis
   * Performs full spatial clustering, competitor analysis, and growth scoring
   */
  getSpatialAnalysis: publicProcedure
    .input(
      z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        restaurantLat: z.number().default(RESTAURANT_LAT),
        restaurantLng: z.number().default(RESTAURANT_LNG),
      })
    )
    .query(async ({ input }): Promise<SpatialAnalysisResult> => {
      try {
        const [orders, competitors] = await Promise.all([
          getOrderLocations(input.startDate, input.endDate),
          getCompetitorLocations(),
        ]);

        const analysis = await performSpatialAnalysis(
          orders,
          competitors,
          input.restaurantLat,
          input.restaurantLng
        );

        return analysis;
      } catch (error) {
        console.error('[spatial-analytics.getSpatialAnalysis] Error:', error);
        throw new Error('Failed to perform spatial analysis');
      }
    }),

  /**
   * Get growth opportunities (high-growth zones with strong demand and low competition)
   */
  getGrowthOpportunities: publicProcedure
    .input(
      z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        minOrderCount: z.number().default(5),
        maxCompetitors: z.number().default(2),
        minGrowthScore: z.number().default(0.6),
      })
    )
    .query(async ({ input }) => {
      try {
        const analysis = await performSpatialAnalysis(
          await getOrderLocations(input.startDate, input.endDate),
          await getCompetitorLocations(),
          RESTAURANT_LAT,
          RESTAURANT_LNG
        );

        const opportunities = analysis.gridCells.filter(
          (cell) =>
            cell.orderCount >= input.minOrderCount &&
            cell.competitorCount <= input.maxCompetitors &&
            cell.growthScore >= input.minGrowthScore
        );

        return {
          opportunities,
          count: opportunities.length,
          insights: analysis.insights.filter((i) => i.includes('growth')),
        };
      } catch (error) {
        console.error('[spatial-analytics.getGrowthOpportunities] Error:', error);
        throw new Error('Failed to get growth opportunities');
      }
    }),

  /**
   * Get underserved zones (high delivery times, low competition)
   */
  getUnderservedZones: publicProcedure
    .input(
      z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        deliveryTimeThreshold: z.number().default(25),
      })
    )
    .query(async ({ input }) => {
      try {
        const analysis = await performSpatialAnalysis(
          await getOrderLocations(input.startDate, input.endDate),
          await getCompetitorLocations(),
          RESTAURANT_LAT,
          RESTAURANT_LNG
        );

        const underserved = analysis.gridCells.filter(
          (cell) => cell.avgDeliveryTimeMinutes > input.deliveryTimeThreshold
        );

        return {
          zones: underserved,
          count: underserved.length,
          avgDeliveryTime:
            underserved.length > 0
              ? underserved.reduce((sum, z) => sum + z.avgDeliveryTimeMinutes, 0) /
                underserved.length
              : 0,
          insights: analysis.insights.filter((i) => i.includes('underserved')),
        };
      } catch (error) {
        console.error('[spatial-analytics.getUnderservedZones] Error:', error);
        throw new Error('Failed to get underserved zones');
      }
    }),

  /**
   * Get high competition zones
   */
  getHighCompetitionZones: publicProcedure
    .input(
      z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        minCompetitors: z.number().default(3),
      })
    )
    .query(async ({ input }) => {
      try {
        const analysis = await performSpatialAnalysis(
          await getOrderLocations(input.startDate, input.endDate),
          await getCompetitorLocations(),
          RESTAURANT_LAT,
          RESTAURANT_LNG
        );

        const highCompetition = analysis.gridCells.filter(
          (cell) => cell.competitorCount >= input.minCompetitors
        );

        return {
          zones: highCompetition,
          count: highCompetition.length,
          avgCompetitors:
            highCompetition.length > 0
              ? highCompetition.reduce((sum, z) => sum + z.competitorCount, 0) /
                highCompetition.length
              : 0,
          insights: analysis.insights.filter((i) => i.includes('competition')),
        };
      } catch (error) {
        console.error('[spatial-analytics.getHighCompetitionZones] Error:', error);
        throw new Error('Failed to get high competition zones');
      }
    }),

  /**
   * Get delivery efficiency zones (meeting 20-minute target)
   */
  getEfficientZones: publicProcedure
    .input(
      z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        targetDeliveryTime: z.number().default(20),
      })
    )
    .query(async ({ input }) => {
      try {
        const analysis = await performSpatialAnalysis(
          await getOrderLocations(input.startDate, input.endDate),
          await getCompetitorLocations(),
          RESTAURANT_LAT,
          RESTAURANT_LNG
        );

        const efficient = analysis.gridCells.filter(
          (cell) => cell.avgDeliveryTimeMinutes <= input.targetDeliveryTime
        );

        return {
          zones: efficient,
          count: efficient.length,
          avgDeliveryTime:
            efficient.length > 0
              ? efficient.reduce((sum, z) => sum + z.avgDeliveryTimeMinutes, 0) /
                efficient.length
              : 0,
          coverage: ((efficient.length / analysis.gridCellCount) * 100).toFixed(1),
          insights: analysis.insights.filter((i) => i.includes('excellent') || i.includes('good')),
        };
      } catch (error) {
        console.error('[spatial-analytics.getEfficientZones] Error:', error);
        throw new Error('Failed to get efficient zones');
      }
    }),

  /**
   * Get competitor data
   */
  getCompetitors: publicProcedure
    .input(
      z.object({
        type: z.string().optional(),
        limit: z.number().default(50),
      })
    )
    .query(async ({ input }) => {
      try {
        const competitors = await getCompetitorLocations();

        let filtered = competitors;
        if (input.type) {
          filtered = competitors.filter((c) => c.type === input.type);
        }

        const types = Array.from(new Set(competitors.map((c) => c.type)));
        return {
          competitors: filtered.slice(0, input.limit),
          total: filtered.length,
          types,
        };
      } catch (error) {
        console.error('[spatial-analytics.getCompetitors] Error:', error);
        throw new Error('Failed to get competitors');
      }
    }),

  /**
   * Get heatmap data for visualization
   */
  getHeatmapData: publicProcedure
    .input(
      z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .query(async ({ input }) => {
      try {
        const analysis = await performSpatialAnalysis(
          await getOrderLocations(input.startDate, input.endDate),
          await getCompetitorLocations(),
          RESTAURANT_LAT,
          RESTAURANT_LNG
        );

        // Convert grid cells to heatmap format
        const heatmapData = analysis.gridCells.map((cell) => ({
          lat: cell.centroidLat,
          lng: cell.centroidLng,
          intensity: Math.min(cell.orderCount / 10, 1), // Normalize to 0-1
          orderCount: cell.orderCount,
          avgDeliveryTime: cell.avgDeliveryTimeMinutes,
          zoneType: cell.zoneType,
        }));

        return {
          heatmapData,
          gridCellCount: analysis.gridCellCount,
          totalOrders: analysis.totalOrders,
          bounds: {
            north: Math.max(...analysis.gridCells.map((c) => c.centroidLat)),
            south: Math.min(...analysis.gridCells.map((c) => c.centroidLat)),
            east: Math.max(...analysis.gridCells.map((c) => c.centroidLng)),
            west: Math.min(...analysis.gridCells.map((c) => c.centroidLng)),
          },
        };
      } catch (error) {
        console.error('[spatial-analytics.getHeatmapData] Error:', error);
        throw new Error('Failed to get heatmap data');
      }
    }),

  /**
   * Get analytics summary
   */
  getAnalyticsSummary: publicProcedure
    .input(
      z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .query(async ({ input }) => {
      try {
        const [orderLocations, competitorLocations] = await Promise.all([
          getOrderLocations(input.startDate, input.endDate),
          getCompetitorLocations(),
        ]);

        const analysis = await performSpatialAnalysis(
          orderLocations,
          competitorLocations,
          RESTAURANT_LAT,
          RESTAURANT_LNG
        );

        // Calculate summary metrics
        const growthZones = analysis.gridCells.filter((c) => c.isGrowingDemand).length;
        const underservedZones = analysis.gridCells.filter((c) => c.isUnderserved).length;
        const efficientZones = analysis.gridCells.filter(
          (c) => c.avgDeliveryTimeMinutes <= 20
        ).length;
        const avgDeliveryTime =
          analysis.gridCells.length > 0
            ? analysis.gridCells.reduce((sum, c) => sum + c.avgDeliveryTimeMinutes, 0) /
              analysis.gridCells.length
            : 0;

        return {
          summary: {
            totalOrders: analysis.totalOrders,
            totalGridCells: analysis.gridCellCount,
            totalCompetitors: analysis.totalCompetitors,
            avgDeliveryTime: avgDeliveryTime.toFixed(1),
            growthOpportunities: growthZones,
            underservedZones,
            efficientZones,
          },
          insights: analysis.insights,
          timestamp: analysis.timestamp,
        };
      } catch (error) {
        console.error('[spatial-analytics.getAnalyticsSummary] Error:', error);
        throw new Error('Failed to get analytics summary');
      }
    }),
});

export type SpatialAnalyticsRouter = typeof spatialAnalyticsRouter;
