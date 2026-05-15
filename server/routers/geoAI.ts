/**
 * Geo AI tRPC Router
 * 
 * Procedures for integrating Geo AI predictions with the Node.js backend
 * Communicates with the separate Python Geo AI service
 */

import { router, publicProcedure, protectedProcedure } from '../_core/trpc';
import { z } from 'zod';

// Environment variables
const GEO_AI_SERVICE_URL = process.env.GEO_AI_SERVICE_URL || 'http://localhost:8001';

/**
 * Helper function to call Geo AI service
 */
async function callGeoAIService(endpoint: string, method: string = 'GET', body?: any) {
  try {
    const url = `${GEO_AI_SERVICE_URL}${endpoint}`;
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      throw new Error(`Geo AI service error: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error calling Geo AI service:', error);
    throw error;
  }
}

export const geoAIRouter = router({
  /**
   * Health Check
   * Verify Geo AI service is running
   */
  health: publicProcedure.query(async () => {
    try {
      const response = await callGeoAIService('/health');
      return {
        status: 'ok',
        service: 'Geo AI',
        ...response,
      };
    } catch (error) {
      return {
        status: 'error',
        service: 'Geo AI',
        message: 'Service unavailable',
      };
    }
  }),

  /**
   * Get Demand Prediction
   * Predict demand for a specific zone
   */
  demand: router({
    predict: protectedProcedure
      .input(
        z.object({
          zoneId: z.string().describe('Zone identifier (e.g., "42.8_-79.0")'),
          forecastHours: z.number().int().min(1).max(168).default(24),
          includeFeatures: z.boolean().default(false),
        })
      )
      .query(async ({ input }) => {
        try {
          const response = await callGeoAIService('/api/v1/demand/predict', 'POST', {
            zone_id: input.zoneId,
            forecast_hours: input.forecastHours,
            include_features: input.includeFeatures,
          });

          return {
            success: true,
            data: response,
          };
        } catch (error) {
          return {
            success: false,
            error: 'Failed to get demand prediction',
            data: null,
          };
        }
      }),

    /**
     * Batch Demand Predictions
     * Predict demand for multiple zones
     */
    batchPredict: protectedProcedure
      .input(
        z.object({
          zoneIds: z.array(z.string()).min(1).max(50),
          forecastHours: z.number().int().min(1).max(168).default(24),
          includeAllTypes: z.boolean().default(false),
        })
      )
      .query(async ({ input }) => {
        try {
          const response = await callGeoAIService('/api/v1/demand/batch-predict', 'POST', {
            zone_ids: input.zoneIds,
            forecast_hours: input.forecastHours,
            include_all_types: input.includeAllTypes,
          });

          return {
            success: true,
            data: response,
          };
        } catch (error) {
          return {
            success: false,
            error: 'Failed to get batch predictions',
            data: null,
          };
        }
      }),

    /**
     * Get Prediction History
     * Retrieve historical predictions for a zone
     */
    history: protectedProcedure
      .input(
        z.object({
          zoneId: z.string(),
          hours: z.number().int().min(1).max(720).default(24),
        })
      )
      .query(async ({ input }) => {
        try {
          const response = await callGeoAIService(
            `/api/v1/demand/history/${input.zoneId}?hours=${input.hours}`
          );

          return {
            success: true,
            data: response,
          };
        } catch (error) {
          return {
            success: false,
            error: 'Failed to get prediction history',
            data: null,
          };
        }
      }),

    /**
     * Get Available Zones
     * Retrieve list of zones available for prediction
     */
    zones: publicProcedure.query(async () => {
      try {
        const response = await callGeoAIService('/api/v1/demand/zones');

        return {
          success: true,
          data: response,
        };
      } catch (error) {
        return {
          success: false,
          error: 'Failed to get available zones',
          data: null,
        };
      }
    }),
  }),

  /**
   * Hotspot Detection (Phase 2)
   */
  hotspots: router({
    predict: protectedProcedure
      .input(
        z.object({
          latitude: z.number(),
          longitude: z.number(),
          radiusMeters: z.number().default(1000),
          forecastHours: z.number().int().default(24),
        })
      )
      .query(async ({ input }) => {
        try {
          const response = await callGeoAIService('/api/v1/hotspots/predict', 'POST', {
            latitude: input.latitude,
            longitude: input.longitude,
            radius_meters: input.radiusMeters,
            forecast_hours: input.forecastHours,
          });

          return {
            success: true,
            data: response,
          };
        } catch (error) {
          return {
            success: false,
            error: 'Failed to predict hotspots',
            data: null,
          };
        }
      }),

    active: publicProcedure.query(async () => {
      try {
        const response = await callGeoAIService('/api/v1/hotspots/active');

        return {
          success: true,
          data: response,
        };
      } catch (error) {
        return {
          success: false,
          error: 'Failed to get active hotspots',
          data: null,
        };
      }
    }),
  }),

  /**
   * Risk Prediction (Phase 3)
   */
  risk: router({
    predict: protectedProcedure
      .input(
        z.object({
          zoneId: z.string(),
          forecastHours: z.number().int().default(24),
        })
      )
      .query(async ({ input }) => {
        try {
          const response = await callGeoAIService('/api/v1/risk/predict', 'POST', {
            zone_id: input.zoneId,
            forecast_hours: input.forecastHours,
          });

          return {
            success: true,
            data: response,
          };
        } catch (error) {
          return {
            success: false,
            error: 'Failed to predict risks',
            data: null,
          };
        }
      }),

    alerts: publicProcedure.query(async () => {
      try {
        const response = await callGeoAIService('/api/v1/risk/alerts');

        return {
          success: true,
          data: response,
        };
      } catch (error) {
        return {
          success: false,
          error: 'Failed to get risk alerts',
          data: null,
        };
      }
    }),
  }),

  /**
   * Recommendations (Phase 4)
   */
  recommendations: router({
    generate: protectedProcedure
      .input(
        z.object({
          zoneId: z.string(),
          riskLevel: z.enum(['low', 'medium', 'high']).default('medium'),
          currentDrivers: z.number().int().min(0).default(0),
        })
      )
      .query(async ({ input }) => {
        try {
          const response = await callGeoAIService('/api/v1/recommendations/generate', 'POST', {
            zone_id: input.zoneId,
            risk_level: input.riskLevel,
            current_drivers: input.currentDrivers,
          });

          return {
            success: true,
            data: response,
          };
        } catch (error) {
          return {
            success: false,
            error: 'Failed to generate recommendations',
            data: null,
          };
        }
      }),

    dashboard: publicProcedure.query(async () => {
      try {
        const response = await callGeoAIService('/api/v1/recommendations/dashboard');

        return {
          success: true,
          data: response,
        };
      } catch (error) {
        return {
          success: false,
          error: 'Failed to get dashboard recommendations',
          data: null,
        };
      }
    }),
  }),

  /**
   * Composite Dashboard Data
   * Get all AI predictions for dashboard display
   */
  dashboard: router({
    summary: protectedProcedure
      .input(
        z.object({
          zoneIds: z.array(z.string()).min(1),
          forecastHours: z.number().int().default(24),
        })
      )
      .query(async ({ input }) => {
        try {
          // Fetch demand, risks, and recommendations in parallel
          const [demandRes, riskRes, recsRes] = await Promise.all([
            callGeoAIService('/api/v1/demand/batch-predict', 'POST', {
              zone_ids: input.zoneIds,
              forecast_hours: input.forecastHours,
            }),
            callGeoAIService('/api/v1/risk/alerts'),
            callGeoAIService('/api/v1/recommendations/dashboard'),
          ]);

          return {
            success: true,
            data: {
              demand: demandRes,
              risks: riskRes,
              recommendations: recsRes,
              timestamp: new Date(),
            },
          };
        } catch (error) {
          return {
            success: false,
            error: 'Failed to fetch dashboard summary',
            data: null,
          };
        }
      }),
  }),
});
