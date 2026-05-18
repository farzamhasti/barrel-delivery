/**
 * Spatial AI Router
 * tRPC endpoints for spatial intelligence features
 */

import { router, publicProcedure, protectedProcedure } from '../_core/trpc';
import { z } from 'zod';
import { spatialHotspotDetector } from '../ml/spatialHotspotDetection';
import { heatmapEngine } from '../ml/heatmapEngine';
import { spatialDemandForecaster } from '../ml/spatialDemandForecasting';
import { driverSpatialIntelligence } from '../ml/driverSpatialIntelligence';
import { canadianEventsIntegration } from '../ml/canadianEventsIntegration';
import { logger } from '../utils/logger';

export const spatialRouter = router({
  // Hotspot Detection
  detectHotspots: protectedProcedure
    .input(
      z.object({
        orders: z.array(
          z.object({
            lat: z.number(),
            lng: z.number(),
            demand: z.number().optional(),
          })
        ),
      })
    )
    .query(({ input }) => {
      try {
        const result = spatialHotspotDetector.detectHotspots(input.orders);
        return {
          success: true,
          data: result,
        };
      } catch (error) {
        logger.error('Hotspot detection failed:', error);
        return {
          success: false,
          error: 'Failed to detect hotspots',
        };
      }
    }),

  // Predict Future Hotspots
  predictFutureHotspots: protectedProcedure
    .input(
      z.object({
        currentHotspots: z.array(
          z.object({
            id: z.string(),
            center: z.object({ lat: z.number(), lng: z.number() }),
            intensity: z.number(),
            pointCount: z.number(),
            demandLevel: z.enum(['low', 'medium', 'high', 'critical']),
            surge: z.boolean(),
            predictedGrowth: z.number(),
            timestamp: z.number(),
          })
        ),
        forecastHours: z.number().default(1),
      })
    )
    .query(({ input }) => {
      try {
        const hotspotsWithRadius = input.currentHotspots.map((h: any) => ({
          ...h,
          radius: 1.0,
        }));
        const predicted = spatialHotspotDetector.predictFutureHotspots(
          hotspotsWithRadius,
          input.forecastHours
        );
        return {
          success: true,
          data: predicted,
        };
      } catch (error) {
        logger.error('Future hotspot prediction failed:', error);
        return {
          success: false,
          error: 'Failed to predict hotspots',
        };
      }
    }),

  // Generate Live Demand Heatmap
  generateDemandHeatmap: protectedProcedure
    .input(
      z.object({
        orders: z.array(
          z.object({
            lat: z.number(),
            lng: z.number(),
            demand: z.number().optional(),
          })
        ),
      })
    )
    .query(({ input }) => {
      try {
        const heatmap = heatmapEngine.generateLiveDemandHeatmap(input.orders);
        const stats = heatmapEngine.getHeatmapStats(heatmap);
        return {
          success: true,
          data: {
            heatmap,
            stats,
          },
        };
      } catch (error) {
        logger.error('Demand heatmap generation failed:', error);
        return {
          success: false,
          error: 'Failed to generate heatmap',
        };
      }
    }),

  // Generate Risk Heatmap
  generateRiskHeatmap: protectedProcedure
    .input(
      z.object({
        orders: z.array(
          z.object({
            lat: z.number(),
            lng: z.number(),
            deliveryTime: z.number(),
            maxTime: z.number(),
          })
        ),
      })
    )
    .query(({ input }) => {
      try {
        const heatmap = heatmapEngine.generateRiskHeatmap(input.orders);
        return {
          success: true,
          data: heatmap,
        };
      } catch (error) {
        logger.error('Risk heatmap generation failed:', error);
        return {
          success: false,
          error: 'Failed to generate risk heatmap',
        };
      }
    }),

  // Generate Driver Shortage Heatmap
  generateDriverShortageHeatmap: protectedProcedure
    .input(
      z.object({
        demandPoints: z.array(
          z.object({
            lat: z.number(),
            lng: z.number(),
            demand: z.number(),
          })
        ),
        driverLocations: z.array(
          z.object({
            lat: z.number(),
            lng: z.number(),
          })
        ),
      })
    )
    .query(({ input }) => {
      try {
        const heatmap = heatmapEngine.generateDriverShortageHeatmap(
          input.demandPoints,
          input.driverLocations
        );
        return {
          success: true,
          data: heatmap,
        };
      } catch (error) {
        logger.error('Driver shortage heatmap generation failed:', error);
        return {
          success: false,
          error: 'Failed to generate driver shortage heatmap',
        };
      }
    }),

  // Forecast Demand by Zone
  forecastByZone: protectedProcedure
    .input(
      z.object({
        zoneId: z.string(),
        historicalDemand: z.array(z.number()),
        weather: z.string().optional(),
        events: z.array(z.string()).optional(),
        timeOfDay: z.string().optional(),
      })
    )
    .query(({ input }) => {
      try {
        const forecast = spatialDemandForecaster.forecastByZone(input.zoneId, input.historicalDemand, {
          weather: input.weather,
          events: input.events,
          timeOfDay: input.timeOfDay,
        });
        return {
          success: true,
          data: forecast,
        };
      } catch (error) {
        logger.error('Zone forecast failed:', error);
        return {
          success: false,
          error: 'Failed to forecast demand',
        };
      }
    }),

  // Forecast Demand by Cluster
  forecastByCluster: protectedProcedure
    .input(
      z.object({
        clusterId: z.string(),
        clusterCenter: z.object({ lat: z.number(), lng: z.number() }),
        clusterPoints: z.number(),
        historicalDemand: z.array(z.number()),
      })
    )
    .query(({ input }) => {
      try {
        const forecast = spatialDemandForecaster.forecastByCluster(
          input.clusterId,
          input.clusterCenter,
          input.clusterPoints,
          input.historicalDemand
        );
        return {
          success: true,
          data: forecast,
        };
      } catch (error) {
        logger.error('Cluster forecast failed:', error);
        return {
          success: false,
          error: 'Failed to forecast cluster demand',
        };
      }
    }),

  // Detect Driver Imbalance
  detectDriverImbalance: protectedProcedure
    .input(
      z.object({
        drivers: z.array(
          z.object({
            driverId: z.string(),
            lat: z.number(),
            lng: z.number(),
            status: z.enum(['available', 'busy', 'offline']),
            activeOrders: z.number(),
            timestamp: z.number(),
          })
        ),
        demandByZone: z.record(z.string(), z.number()),
      })
    )
    .query(({ input }) => {
      try {
        const demandMap = new Map<string, number>(Object.entries(input.demandByZone) as [string, number][]);
        const zones = new Map([
          ['downtown', { lat: 43.0, lng: -79.15, name: 'Downtown' }],
          ['north', { lat: 43.12, lng: -79.15, name: 'North' }],
          ['south', { lat: 42.88, lng: -79.15, name: 'South' }],
          ['east', { lat: 43.0, lng: -79.0, name: 'East' }],
          ['west', { lat: 43.0, lng: -79.3, name: 'West' }],
        ]);

        const imbalances = driverSpatialIntelligence.detectDriverImbalance(
          input.drivers,
          demandMap,
          zones
        );
        return {
          success: true,
          data: imbalances,
        };
      } catch (error) {
        logger.error('Driver imbalance detection failed:', error);
        return {
          success: false,
          error: 'Failed to detect driver imbalance',
        };
      }
    }),

  // Detect Driver Shortage Regions
  detectDriverShortageRegions: protectedProcedure
    .input(
      z.object({
        drivers: z.array(
          z.object({
            driverId: z.string(),
            lat: z.number(),
            lng: z.number(),
            status: z.enum(['available', 'busy', 'offline']),
            activeOrders: z.number(),
            timestamp: z.number(),
          })
        ),
        demandPoints: z.array(
          z.object({
            lat: z.number(),
            lng: z.number(),
            demand: z.number(),
          })
        ),
      })
    )
    .query(({ input }) => {
      try {
        const shortages = driverSpatialIntelligence.detectDriverShortageRegions(
          input.drivers,
          input.demandPoints
        );
        return {
          success: true,
          data: shortages,
        };
      } catch (error) {
        logger.error('Driver shortage detection failed:', error);
        return {
          success: false,
          error: 'Failed to detect driver shortages',
        };
      }
    }),

  // Get Events for Date Range
  getEventsInRange: publicProcedure
    .input(
      z.object({
        startDate: z.number(),
        endDate: z.number(),
      })
    )
    .query(({ input }) => {
      try {
        const events = canadianEventsIntegration.getEventsInRange(
          new Date(input.startDate),
          new Date(input.endDate)
        );
        return {
          success: true,
          data: events,
        };
      } catch (error) {
        logger.error('Events retrieval failed:', error);
        return {
          success: false,
          error: 'Failed to retrieve events',
        };
      }
    }),

  // Get Today's Events
  getTodayEvents: publicProcedure.query(() => {
    try {
      const events = canadianEventsIntegration.getTodayEvents();
      return {
        success: true,
        data: events,
      };
    } catch (error) {
      logger.error('Today events retrieval failed:', error);
      return {
        success: false,
        error: 'Failed to retrieve today events',
      };
    }
  }),

  // Get Upcoming Events
  getUpcomingEvents: publicProcedure.query(() => {
    try {
      const events = canadianEventsIntegration.getUpcomingEvents();
      return {
        success: true,
        data: events,
      };
    } catch (error) {
      logger.error('Upcoming events retrieval failed:', error);
      return {
        success: false,
        error: 'Failed to retrieve upcoming events',
      };
    }
  }),

  // Calculate Demand Impact for Specific Time
  calculateDemandImpact: publicProcedure
    .input(
      z.object({
        timestamp: z.number(),
      })
    )
    .query(({ input }) => {
      try {
        const impacts = canadianEventsIntegration.calculateDemandImpact(new Date(input.timestamp));
        return {
          success: true,
          data: impacts,
        };
      } catch (error) {
        logger.error('Demand impact calculation failed:', error);
        return {
          success: false,
          error: 'Failed to calculate demand impact',
        };
      }
    }),

  // Get Event Statistics
  getEventStatistics: publicProcedure.query(() => {
    try {
      const stats = canadianEventsIntegration.getEventStatistics();
      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      logger.error('Event statistics retrieval failed:', error);
      return {
        success: false,
        error: 'Failed to retrieve event statistics',
      };
    }
  }),
});
