/**
 * Geo AI tRPC Router
 * 
 * Procedures for integrating Geo AI predictions with the Node.js backend
 * Communicates with the separate Python Geo AI service
 */

import { router, publicProcedure, protectedProcedure } from '../_core/trpc';
import { z } from 'zod';
import { isWithinOperatingHours, getDayCategory, extractTemporalFeatures } from '../utils/operatingHours';

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

/**
 * Validate that request is within operating hours
 * Returns error response if outside operating hours
 */
function validateOperatingHours() {
  const now = new Date();
  if (!isWithinOperatingHours(now)) {
    const temporalFeatures = extractTemporalFeatures(now);
    return {
      success: false,
      error: 'Predictions not available outside operating hours',
      data: null,
      metadata: {
        isOperatingHours: false,
        dayCategory: getDayCategory(now),
        currentHour: temporalFeatures.hour,
        minutesUntilOpen: temporalFeatures.minutesUntilClose === -1 ? -1 : 0,
      },
    };
  }
  return null;
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
          // Check if within operating hours
          const operatingHoursError = validateOperatingHours();
          if (operatingHoursError) {
            return operatingHoursError;
          }

          const now = new Date();
          const response = await callGeoAIService('/api/v1/demand/predict', 'POST', {
            zone_id: input.zoneId,
            forecast_hours: input.forecastHours,
            include_features: input.includeFeatures,
          });

          return {
            success: true,
            data: response,
            metadata: {
              isOperatingHours: true,
              dayCategory: getDayCategory(now),
              temporalFeatures: extractTemporalFeatures(now),
            },
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
          // Check if within operating hours
          const operatingHoursError = validateOperatingHours();
          if (operatingHoursError) {
            return operatingHoursError;
          }

          const now = new Date();
          const response = await callGeoAIService('/api/v1/demand/batch-predict', 'POST', {
            zone_ids: input.zoneIds,
            forecast_hours: input.forecastHours,
            include_all_types: input.includeAllTypes,
          });

          return {
            success: true,
            data: response,
            metadata: {
              isOperatingHours: true,
              dayCategory: getDayCategory(now),
              temporalFeatures: extractTemporalFeatures(now),
            },
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
          // Check if within operating hours
          const operatingHoursError = validateOperatingHours();
          if (operatingHoursError) {
            return operatingHoursError;
          }

          const now = new Date();
          const response = await callGeoAIService('/api/v1/hotspots/predict', 'POST', {
            latitude: input.latitude,
            longitude: input.longitude,
            radius_meters: input.radiusMeters,
            forecast_hours: input.forecastHours,
          });

          return {
            success: true,
            data: response,
            metadata: {
              isOperatingHours: true,
              dayCategory: getDayCategory(now),
              temporalFeatures: extractTemporalFeatures(now),
            },
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
        // Check if within operating hours
        const operatingHoursError = validateOperatingHours();
        if (operatingHoursError) {
          return operatingHoursError;
        }

        const now = new Date();
        const response = await callGeoAIService('/api/v1/hotspots/active');

        return {
          success: true,
          data: response,
          metadata: {
            isOperatingHours: true,
            dayCategory: getDayCategory(now),
            temporalFeatures: extractTemporalFeatures(now),
          },
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
          // Check if within operating hours
          const operatingHoursError = validateOperatingHours();
          if (operatingHoursError) {
            return operatingHoursError;
          }

          const now = new Date();
          const response = await callGeoAIService('/api/v1/risk/predict', 'POST', {
            zone_id: input.zoneId,
            forecast_hours: input.forecastHours,
          });

          return {
            success: true,
            data: response,
            metadata: {
              isOperatingHours: true,
              dayCategory: getDayCategory(now),
              temporalFeatures: extractTemporalFeatures(now),
            },
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
          // Check if within operating hours
          const operatingHoursError = validateOperatingHours();
          if (operatingHoursError) {
            return operatingHoursError;
          }

          const now = new Date();
          const response = await callGeoAIService('/api/v1/recommendations/generate', 'POST', {
            zone_id: input.zoneId,
            risk_level: input.riskLevel,
            current_drivers: input.currentDrivers,
          });

          return {
            success: true,
            data: response,
            metadata: {
              isOperatingHours: true,
              dayCategory: getDayCategory(now),
              temporalFeatures: extractTemporalFeatures(now),
            },
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
   * Fort Erie Weather Data
   * Fetch real-time weather from Open-Meteo (server-side to bypass CORS)
   */
  weather: router({
    current: publicProcedure.query(async () => {
      try {
        const url = new URL('https://api.open-meteo.com/v1/forecast');
        url.searchParams.append('latitude', '42.8900');
        url.searchParams.append('longitude', '-79.0000');
        url.searchParams.append('current', 'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,snowfall,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m,visibility');
        url.searchParams.append('timezone', 'America/Toronto');
        
        const response = await fetch(url.toString(), {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });
        
        if (!response.ok) {
          throw new Error(`Open-Meteo API error: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Validate Fort Erie location
        const isValidLocation = 
          Math.abs(data.latitude - 42.8900) < 0.05 && 
          Math.abs(data.longitude - (-79.0000)) < 0.05;
        
        if (!isValidLocation) {
          throw new Error('Weather data location validation failed');
        }
        
        return {
          success: true,
          data: {
            temperature: data.current.temperature_2m,
            humidity: data.current.relative_humidity_2m,
            apparent_temperature: data.current.apparent_temperature,
            precipitation: data.current.precipitation,
            snowfall: data.current.snowfall,
            weather_code: data.current.weather_code,
            wind_speed: data.current.wind_speed_10m,
            wind_direction: data.current.wind_direction_10m,
            wind_gusts: data.current.wind_gusts_10m,
            visibility: data.current.visibility,
            time: data.current.time,
            latitude: data.latitude,
            longitude: data.longitude,
            timezone: data.timezone,
            timestamp: new Date().toISOString()
          },
          metadata: {
            location: 'Fort Erie, Ontario, Canada',
            coordinates: { lat: 42.8900, lng: -79.0000 }
          }
        };
      } catch (error) {
        console.error('Weather fetch error:', error);
        return {
          success: false,
          error: `Failed to fetch Fort Erie weather: ${error instanceof Error ? error.message : 'Unknown error'}`,
          data: null
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
          // Check if within operating hours
          const operatingHoursError = validateOperatingHours();
          if (operatingHoursError) {
            return operatingHoursError;
          }

          const now = new Date();
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
            metadata: {
              isOperatingHours: true,
              dayCategory: getDayCategory(now),
              temporalFeatures: extractTemporalFeatures(now),
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
