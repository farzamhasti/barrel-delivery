/**
 * PHASE 2: Learning System tRPC Router
 * 
 * Exposes learning-based forecasting through tRPC
 */

import { z } from 'zod';
import { adminOrSystemAdminProcedure, publicProcedure, router } from '../_core/trpc';
import {
  generateLearningForecast,
  updateLearningWithOutcome,
  generateMLBaseline,
  getModelPerformanceMetrics,
  getAccuracyTrend,
  getAccuracyBreakdown,
} from '../learning';

export const learningRouter = router({
  /**
   * Generate a learning-based forecast
   */
  forecast: adminOrSystemAdminProcedure
    .input(
      z.object({
        zoneId: z.string(),
        currentHour: z.number().min(0).max(23),
        dayOfWeek: z.number().min(0).max(6),
        ordersInLastHour: z.number().min(0).default(0),
        availableDrivers: z.number().min(0).default(10),
        totalDrivers: z.number().min(1).default(20),
        currentBacklog: z.number().min(0).default(0),
        maxCapacity: z.number().min(1).default(100),
        weatherCondition: z.string().default('clear'),
        activeEvents: z
          .array(
            z.object({
              type: z.string(),
              intensity: z.enum(['low', 'medium', 'high']),
            }),
          )
          .default([]),
        hoursUntilDeadline: z.number().min(0).default(24),
      }),
    )
    .query(async ({ input }) => {
      try {
        const forecast = await generateLearningForecast({
          zoneId: input.zoneId,
          currentHour: input.currentHour,
          dayOfWeek: input.dayOfWeek,
          ordersInLastHour: input.ordersInLastHour,
          availableDrivers: input.availableDrivers,
          totalDrivers: input.totalDrivers,
          currentBacklog: input.currentBacklog,
          maxCapacity: input.maxCapacity,
          weatherCondition: input.weatherCondition,
          activeEvents: input.activeEvents,
          hoursUntilDeadline: input.hoursUntilDeadline,
        });

        if (!forecast) {
          return {
            success: false,
            message: 'Unable to generate learning forecast - insufficient data',
            data: null,
          };
        }

        return {
          success: true,
          message: 'Learning forecast generated successfully',
          data: forecast,
        };
      } catch (error) {
        console.error('[Learning] Error in forecast procedure:', error);
        return {
          success: false,
          message: 'Error generating forecast',
          error: error instanceof Error ? error.message : 'Unknown error',
          data: null,
        };
      }
    }),

  /**
   * Record actual order outcome for learning feedback
   */
  recordOutcome: adminOrSystemAdminProcedure
    .input(
      z.object({
        zoneId: z.string(),
        forecastTime: z.date(),
        actualDemand: z.number().min(0),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        await updateLearningWithOutcome(
          input.zoneId,
          input.forecastTime,
          input.actualDemand,
        );

        return {
          success: true,
          message: 'Outcome recorded successfully',
        };
      } catch (error) {
        console.error('[Learning] Error recording outcome:', error);
        return {
          success: false,
          message: 'Error recording outcome',
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }),

  /**
   * Get ML forecast for a specific hour
   */
  getMLForecast: publicProcedure
    .input(
      z.object({
        zoneId: z.string().default('default'),
        forecastHour: z.number().min(0).max(23).default(new Date().getHours()),
      }),
    )
    .query(async ({ input }) => {
      try {
        const forecastTime = new Date();
        forecastTime.setHours(input.forecastHour);
        forecastTime.setMinutes(0);
        forecastTime.setSeconds(0);
        forecastTime.setMilliseconds(0);

        const mlForecast = await generateMLBaseline(input.zoneId, forecastTime);

        return {
          success: true,
          data: mlForecast,
        };
      } catch (error) {
        console.error('[Learning] Error getting ML forecast:', error);
        return {
          success: false,
          message: 'Error generating ML forecast',
          error: error instanceof Error ? error.message : 'Unknown error',
          data: null,
        };
      }
    }),

  /**
   * Get model performance metrics
   */
  getMetrics: publicProcedure
    .input(
      z.object({
        zoneId: z.string().default('default'),
        lookbackDays: z.number().min(1).max(365).default(30),
      }),
    )
    .query(async ({ input }) => {
      try {
        const metrics = await getModelPerformanceMetrics(input.zoneId, input.lookbackDays);
        return {
          success: true,
          data: metrics,
        };
      } catch (error) {
        console.error('[Learning] Error getting metrics:', error);
        return {
          success: false,
          message: 'Error getting model metrics',
          error: error instanceof Error ? error.message : 'Unknown error',
          data: null,
        };
      }
    }),

  /**
   * Get accuracy trend
   */
  getTrend: publicProcedure
    .input(
      z.object({
        zoneId: z.string().default('default'),
      }),
    )
    .query(async ({ input }) => {
      try {
        const trend = await getAccuracyTrend(input.zoneId);
        return {
          success: true,
          data: trend,
        };
      } catch (error) {
        console.error('[Learning] Error getting trend:', error);
        return {
          success: false,
          message: 'Error getting accuracy trend',
          error: error instanceof Error ? error.message : 'Unknown error',
          data: null,
        };
      }
    }),

  /**
   * Get accuracy breakdown by hour and day
   */
  getBreakdown: publicProcedure
    .input(
      z.object({
        zoneId: z.string().default('default'),
      }),
    )
    .query(async ({ input }) => {
      try {
        const breakdown = await getAccuracyBreakdown(input.zoneId);
        return {
          success: true,
          data: {
            byHour: Object.fromEntries(breakdown.byHour),
            byDayOfWeek: Object.fromEntries(breakdown.byDayOfWeek),
            byTimeOfDay: breakdown.byTimeOfDay,
          },
        };
      } catch (error) {
        console.error('[Learning] Error getting breakdown:', error);
        return {
          success: false,
          message: 'Error getting accuracy breakdown',
          error: error instanceof Error ? error.message : 'Unknown error',
          data: null,
        };
      }
    }),

  /**
   * Get learning system status and progress
   */
  status: publicProcedure
    .input(
      z.object({
        zoneId: z.string(),
      }),
    )
    .query(async ({ input }) => {
      try {
        // This would query the learning system for status
        // For now, returning placeholder data
        return {
          success: true,
          data: {
            zoneId: input.zoneId,
            phase: 'early_learning',
            progress: 35,
            nextMilestone: 'Collect 30 more forecasts to reach Learning phase',
            estimatedTimeToTrained: '7-14 days',
            message: 'Learning system initialized',
          },
        };
      } catch (error) {
        console.error('[Learning] Error getting status:', error);
        return {
          success: false,
          message: 'Error getting learning status',
          error: error instanceof Error ? error.message : 'Unknown error',
          data: null,
        };
      }
    }),
});
