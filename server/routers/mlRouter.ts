/**
 * ML Router
 * tRPC procedures for ML service integration
 */

import { router, publicProcedure, protectedProcedure } from '../_core/trpc';
import { z } from 'zod';
import { mlServiceClient } from '../ml/mlServiceClient';
import { TRPCError } from '@trpc/server';
import { logger } from '../utils/logger';

export const mlRouter = router({
  /**
   * Predict demand for a zone
   */
  predict: publicProcedure
    .input(
      z.object({
        zone_id: z.string(),
        predict_time: z.string().datetime(),
        active_drivers: z.number().optional(),
        current_backlog: z.number().optional(),
        weather_condition: z.string().optional(),
        weather_severity: z.number().min(0).max(1).optional(),
        active_events: z.number().optional(),
        event_intensity: z.number().min(0).max(1).optional(),
        zone_density: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      try {
        logger.info(`ML predict for zone ${input.zone_id}`);

        // Check if ML service is available
        const available = await mlServiceClient.isAvailable();
        if (!available) {
          logger.warn('ML service unavailable, using fallback');
          return {
            predicted_demand: 15,
            confidence: 0.6,
            interval_lower: 10,
            interval_upper: 20,
            top_features: [
              { name: 'hour_of_day', importance: 0.25, value: new Date().getHours() },
              { name: 'day_of_week', importance: 0.15, value: new Date().getDay() },
            ],
            explanation: 'Using fallback predict (ML service unavailable)',
            model_version: 'fallback',
            predict_timestamp: new Date().toISOString(),
          };
        }

        // Call ML service
        const predict = await mlServiceClient.predict({
          zone_id: input.zone_id,
          predict_time: input.predict_time,
          active_drivers: input.active_drivers,
          current_backlog: input.current_backlog,
          weather_condition: input.weather_condition,
          weather_severity: input.weather_severity,
          active_events: input.active_events,
          event_intensity: input.event_intensity,
          zone_density: input.zone_density,
        });

        return predict;
      } catch (error) {
        logger.error('ML predict error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to generate predict',
        });
      }
    }),

  /**
   * Batch predict for multiple hours
   */
  predictBatch: publicProcedure
    .input(
      z.object({
        zone_id: z.string(),
        start_time: z.string().datetime(),
        hours: z.number().min(1).max(24),
        active_drivers: z.number().optional(),
        weather_condition: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      try {
        logger.info(
          `ML batch predict for zone ${input.zone_id} (${input.hours} hours)`
        );

        const predicts = [];
        const startTime = new Date(input.start_time);

        for (let i = 0; i < input.hours; i++) {
          const predictTime = new Date(startTime);
          predictTime.setHours(predictTime.getHours() + i);

          try {
            const predict = await mlServiceClient.predict({
              zone_id: input.zone_id,
              predict_time: predictTime.toISOString(),
              active_drivers: input.active_drivers,
              weather_condition: input.weather_condition,
            });
            predicts.push(predict);
          } catch (error) {
            logger.warn(`Failed to predict hour ${i}:`, error);
            // Continue with next hour
          }
        }

        return predicts;
      } catch (error) {
        logger.error('ML batch predict error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to generate batch predicts',
        });
      }
    }),

  /**
   * Train model for a zone
   */
  train: protectedProcedure
    .input(
      z.object({
        zone_id: z.string(),
        lookback_days: z.number().min(7).max(365).optional(),
        force_retrain: z.boolean().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // Only admins can trigger training
        if (ctx.user?.role !== 'admin') {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Only admins can trigger model training',
          });
        }

        logger.info(`Training model for zone ${input.zone_id}`);

        const training = await mlServiceClient.train({
          zone_id: input.zone_id,
          lookback_days: input.lookback_days || 90,
          force_retrain: input.force_retrain,
        });

        return training;
      } catch (error) {
        logger.error('ML training error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to start model training',
        });
      }
    }),

  /**
   * Get training status
   */
  getTrainingStatus: publicProcedure
    .input(z.object({ model_id: z.string() }))
    .query(async ({ input }) => {
      try {
        const status = await mlServiceClient.getTrainingStatus(input.model_id);
        return status;
      } catch (error) {
        logger.error('Failed to get training status:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get training status',
        });
      }
    }),

  /**
   * Get model metrics
   */
  getMetrics: publicProcedure
    .input(
      z.object({
        model_id: z.string().optional(),
        zone_id: z.string().optional(),
        lookback_days: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      try {
        if (!input.model_id && !input.zone_id) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Either model_id or zone_id is required',
          });
        }

        const metrics = await mlServiceClient.getMetrics({
          model_id: input.model_id,
          zone_id: input.zone_id,
          lookback_days: input.lookback_days,
        });

        return metrics;
      } catch (error) {
        logger.error('Failed to get metrics:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get model metrics',
        });
      }
    }),

  /**
   * Rollback model
   */
  rollback: protectedProcedure
    .input(
      z.object({
        zone_id: z.string(),
        target_version: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // Only admins can rollback
        if (ctx.user?.role !== 'admin') {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Only admins can rollback models',
          });
        }

        logger.info(`Rolling back model for zone ${input.zone_id}`);

        const result = await mlServiceClient.rollback({
          zone_id: input.zone_id,
          target_version: input.target_version,
        });

        return result;
      } catch (error) {
        logger.error('ML rollback error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to rollback model',
        });
      }
    }),

  /**
   * List models for zone
   */
  listModels: publicProcedure
    .input(z.object({ zone_id: z.string() }))
    .query(async ({ input }) => {
      try {
        const models = await mlServiceClient.listModels(input.zone_id);
        return models;
      } catch (error) {
        logger.error('Failed to list models:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to list models',
        });
      }
    }),

  /**
   * Get model info
   */
  getModelInfo: publicProcedure
    .input(
      z.object({
        zone_id: z.string(),
        model_id: z.string(),
      })
    )
    .query(async ({ input }) => {
      try {
        const info = await mlServiceClient.getModelInfo(
          input.zone_id,
          input.model_id
        );
        return info;
      } catch (error) {
        logger.error('Failed to get model info:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get model info',
        });
      }
    }),

  /**
   * Check ML service health
   */
  health: publicProcedure.query(async () => {
    try {
      const health = await mlServiceClient.health();
      return health;
    } catch (error) {
      logger.error('ML service health check failed:', error);
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        version: 'unknown',
        models_loaded: 0,
      };
    }
  }),
});
