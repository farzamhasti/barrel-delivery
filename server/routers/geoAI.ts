/**
 * Geo AI tRPC Router
 * 
 * Procedures for integrating Geo AI predictions with the Node.js backend
 * Communicates with the separate Python Geo AI service
 * 
 * WEATHER-AWARE: All predictions are adjusted based on real-time Fort Erie weather
 */

import { router, publicProcedure, protectedProcedure } from '../_core/trpc';
import { z } from 'zod';
import { isWithinOperatingHours, getDayCategory, extractTemporalFeatures } from '../utils/operatingHours';
import { calculateWeatherImpact, applyWeatherToDemand, applyWeatherToDelayRisk, applyWeatherToHotspotIntensity, applyWeatherToDriverShortageRisk, generateWeatherRecommendations, type WeatherData, type WeatherImpactScore } from '../utils/weatherImpact';
import { predictionCache, generateCacheKey, getTTLForType } from '../utils/predictionCache';
import { getActiveEvents, calculateEventDemandMultiplier, getEventImpactDescription } from '../utils/eventValidator';
import { generateDynamicAlerts, filterResolvedAlerts } from '../utils/alertGenerator';
import { cacheExpirationMonitor, preventStaleDataMiddleware } from '../utils/cacheExpiration';
import { determineForecastMode, buildForecastContext, getForecastModeDescription, getRefreshInterval, type ForecastMode } from '../utils/forecastModes';

// Environment variables
const GEO_AI_SERVICE_URL = process.env.GEO_AI_SERVICE_URL || 'http://localhost:8000';

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
 * Cache for weather data (refresh every 5 minutes)
 */
let cachedWeatherData: WeatherData | null = null;
let lastWeatherFetch = 0;
const WEATHER_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch and cache Fort Erie weather data
 */
async function getWeatherData(): Promise<WeatherData | null> {
  const now = Date.now();
  
  // Return cached data if still fresh
  if (cachedWeatherData && (now - lastWeatherFetch) < WEATHER_CACHE_DURATION) {
    return cachedWeatherData;
  }

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
    
    // Map API response to WeatherData interface
    cachedWeatherData = {
      temperature: data.current.temperature_2m,
      apparent_temperature: data.current.apparent_temperature,
      humidity: data.current.relative_humidity_2m,
      precipitation: data.current.precipitation || 0,
      snowfall: data.current.snowfall || 0,
      weather_code: data.current.weather_code,
      wind_speed: data.current.wind_speed_10m,
      wind_direction: data.current.wind_direction_10m,
      wind_gusts: data.current.wind_gusts_10m || 0,
      visibility: data.current.visibility,
    };
    
    lastWeatherFetch = now;
    return cachedWeatherData;
  } catch (error) {
    console.error('Error fetching weather data:', error);
    return null;
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
   * Get Demand Prediction (WEATHER-AWARE)
   * Predict demand for a specific zone with weather adjustments
   */
  demand: router({
    predict: protectedProcedure
      .input(
        z.object({
          zoneId: z.string().describe('Zone identifier (e.g., "42.8_-79.0")'),
          forecastHours: z.number().int().min(1).max(168).default(24),
          includeFeatures: z.boolean().default(false),
          forecastMode: z.enum(['TODAY_FORECAST', 'LIVE_OPERATION', 'TOMORROW_FORECAST']).optional().describe('Forecast mode: TODAY_FORECAST (pre-op), LIVE_OPERATION (during ops), TOMORROW_FORECAST (next day)'),
        })
      )
      .query(async ({ input }) => {
        try {
          // Determine forecast mode
          const forecastMode = determineForecastMode(input.forecastMode as ForecastMode | undefined);
          const forecastContext = buildForecastContext(forecastMode);
          
          // For TODAY_FORECAST and TOMORROW_FORECAST, allow forecasting outside operating hours
          // For LIVE_OPERATION, enforce operating hours
          if (forecastMode === 'LIVE_OPERATION') {
            const operatingHoursError = validateOperatingHours();
            if (operatingHoursError) {
              return operatingHoursError;
            }
          }

          const now = new Date();
          const requestPayload = {
            zone_id: input.zoneId,
            forecast_hours: forecastContext.forecastHours,
            include_features: input.includeFeatures,
            forecast_mode: forecastMode,
            target_date: forecastContext.targetDate.toISOString(),
          };
          console.log("[tRPC DEBUG] REQUEST TO FASTAPI:", requestPayload);
          const response = await callGeoAIService('/api/v1/demand/predict', 'POST', requestPayload);
          console.log("[tRPC DEBUG] RAW FASTAPI RESPONSE:", response);

          // Fetch weather data and apply weather-aware adjustments
          const weatherData = await getWeatherData();
          let weatherImpact: WeatherImpactScore | null = null;
          let adjustedData = { ...response };

          if (weatherData) {
            weatherImpact = calculateWeatherImpact(weatherData);
            
            // Apply weather multiplier to predicted orders if available
            if (adjustedData.predicted_orders) {
              adjustedData.base_forecast = adjustedData.predicted_orders; // Store original
              adjustedData.predicted_orders = applyWeatherToDemand(
                adjustedData.predicted_orders,
                weatherImpact
              );
            }
            
            // Add weather impact information to response
            adjustedData.weather_adjusted = true;
            adjustedData.weather_impact = weatherImpact;
            adjustedData.demand_multiplier = weatherImpact.demandMultiplier;
          }

          const finalResponse = {
            success: true,
            data: adjustedData,
            metadata: {
              isOperatingHours: true,
              dayCategory: getDayCategory(now),
              temporalFeatures: extractTemporalFeatures(now),
              weatherAdjusted: !!weatherImpact,
            },
          };
          console.log("[tRPC DEBUG] FINAL tRPC RESPONSE:", finalResponse);
          return finalResponse;
        } catch (error) {
          return {
            success: false,
            error: 'Failed to get demand prediction',
            data: null,
          };
        }
      }),

    /**
     * Batch Demand Predictions (WEATHER-AWARE)
     * Predict demand for multiple zones with weather adjustments
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

          // Fetch weather data and apply weather-aware adjustments
          const weatherData = await getWeatherData();
          let weatherImpact: WeatherImpactScore | null = null;
          let adjustedData = response;

          if (weatherData) {
            weatherImpact = calculateWeatherImpact(weatherData);
            
            // Apply weather multiplier to all zones if available
            if (Array.isArray(adjustedData.predictions)) {
              adjustedData.predictions = adjustedData.predictions.map((pred: any) => ({
                ...pred,
                base_forecast: pred.predicted_orders,
                predicted_orders: applyWeatherToDemand(pred.predicted_orders, weatherImpact!),
                weather_adjusted: true,
                demand_multiplier: weatherImpact!.demandMultiplier,
              }));
            }
            
            adjustedData.weather_impact = weatherImpact;
          }

          return {
            success: true,
            data: adjustedData,
            metadata: {
              isOperatingHours: true,
              dayCategory: getDayCategory(now),
              temporalFeatures: extractTemporalFeatures(now),
              weatherAdjusted: !!weatherImpact,
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
   * Hotspot Detection (WEATHER-AWARE)
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

          // Fetch weather data and apply weather-aware adjustments
          const weatherData = await getWeatherData();
          let weatherImpact: WeatherImpactScore | null = null;
          let adjustedData = { ...response };

          if (weatherData) {
            weatherImpact = calculateWeatherImpact(weatherData);
            
            // Apply weather multiplier to hotspot intensity
            if (adjustedData.intensity !== undefined && weatherImpact) {
              adjustedData.base_intensity = adjustedData.intensity;
              adjustedData.intensity = applyWeatherToHotspotIntensity(
                adjustedData.intensity,
                weatherImpact
              );
            }
            
            adjustedData.weather_impact = weatherImpact;
          }

          return {
            success: true,
            data: adjustedData,
            metadata: {
              isOperatingHours: true,
              dayCategory: getDayCategory(now),
              temporalFeatures: extractTemporalFeatures(now),
              weatherAdjusted: !!weatherImpact,
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

        // Fetch weather data and apply weather-aware adjustments
        const weatherData = await getWeatherData();
        let weatherImpact: WeatherImpactScore | null = null;
        let adjustedData = response;

        if (weatherData) {
          weatherImpact = calculateWeatherImpact(weatherData);
          
          // Apply weather multiplier to all active hotspots
          if (Array.isArray(adjustedData.hotspots) && weatherImpact) {
            adjustedData.hotspots = adjustedData.hotspots.map((hotspot: any) => ({
              ...hotspot,
              base_intensity: hotspot.intensity,
              intensity: applyWeatherToHotspotIntensity(hotspot.intensity, weatherImpact!),
            }));
          }
          
          adjustedData.weather_impact = weatherImpact;
        }

        return {
          success: true,
          data: adjustedData,
          metadata: {
            isOperatingHours: true,
            dayCategory: getDayCategory(now),
            temporalFeatures: extractTemporalFeatures(now),
            weatherAdjusted: !!weatherImpact,
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
   * Risk Prediction (WEATHER-AWARE)
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

          // Fetch weather data and apply weather-aware adjustments
          const weatherData = await getWeatherData();
          let weatherImpact: WeatherImpactScore | null = null;
          let adjustedData = { ...response };

          if (weatherData) {
            weatherImpact = calculateWeatherImpact(weatherData);
            
            // Apply weather adjustments to delay risk and driver shortage risk
            if (adjustedData.delay_risk !== undefined) {
              adjustedData.base_delay_risk = adjustedData.delay_risk;
              adjustedData.delay_risk = applyWeatherToDelayRisk(
                adjustedData.delay_risk,
                weatherImpact
              );
            }
            
            if (adjustedData.driver_shortage_risk !== undefined) {
              adjustedData.base_driver_shortage_risk = adjustedData.driver_shortage_risk;
              adjustedData.driver_shortage_risk = applyWeatherToDriverShortageRisk(
                adjustedData.driver_shortage_risk,
                weatherImpact
              );
            }
            
            adjustedData.weather_impact = weatherImpact;
          }

          return {
            success: true,
            data: adjustedData,
            metadata: {
              isOperatingHours: true,
              dayCategory: getDayCategory(now),
              temporalFeatures: extractTemporalFeatures(now),
              weatherAdjusted: !!weatherImpact,
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
   * Recommendations (WEATHER-AWARE)
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

          // Fetch weather data and generate weather-aware recommendations
          const weatherData = await getWeatherData();
          let weatherImpact: WeatherImpactScore | null = null;
          let adjustedData = { ...response };

          if (weatherData) {
            weatherImpact = calculateWeatherImpact(weatherData);
            
            // Generate weather-specific recommendations
            const weatherRecs = generateWeatherRecommendations(weatherImpact);
            adjustedData.weather_recommendations = weatherRecs;
            adjustedData.weather_impact = weatherImpact;
            
            // Combine with existing recommendations
            if (Array.isArray(adjustedData.recommendations)) {
              adjustedData.recommendations = [
                ...adjustedData.recommendations,
                ...weatherRecs
              ];
            } else {
              adjustedData.recommendations = weatherRecs;
            }
          }

          return {
            success: true,
            data: adjustedData,
            metadata: {
              isOperatingHours: true,
              dayCategory: getDayCategory(now),
              temporalFeatures: extractTemporalFeatures(now),
              weatherAdjusted: !!weatherImpact,
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

        // Fetch weather data and add weather-aware recommendations
        const weatherData = await getWeatherData();
        let adjustedData = response;

        if (weatherData) {
          const weatherImpact = calculateWeatherImpact(weatherData);
          const weatherRecs = generateWeatherRecommendations(weatherImpact);
          
          adjustedData.weather_recommendations = weatherRecs;
          adjustedData.weather_impact = weatherImpact;
          
          // Combine with existing recommendations
          if (Array.isArray(adjustedData.recommendations)) {
            adjustedData.recommendations = [
              ...adjustedData.recommendations,
              ...weatherRecs
            ];
          } else {
            adjustedData.recommendations = weatherRecs;
          }
        }

        return {
          success: true,
          data: adjustedData,
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
   * Manual Refresh Mutation (PHASE 89)
   * Manually trigger prediction refresh and clear cache
   */
  refresh: protectedProcedure
    .input(
      z.object({
        types: z.array(z.enum(['demand', 'hotspots', 'risk', 'recommendations', 'all'])).default(['all']),
      })
    )
    .mutation(async ({ input }) => {
      try {
        // Check if within operating hours
        const operatingHoursError = validateOperatingHours();
        if (operatingHoursError) {
          return operatingHoursError;
        }

        const now = new Date();
        const cleared: string[] = [];

        // Clear cache for specified types
        if (input.types.includes('all')) {
          predictionCache.clear();
          cleared.push('all');
        } else {
          for (const type of input.types) {
            const keys = predictionCache.keys().filter(k => k.includes(type));
            keys.forEach(k => predictionCache.delete(k));
            if (keys.length > 0) {
              cleared.push(type);
            }
          }
        }

        return {
          success: true,
          data: {
            cleared,
            timestamp: now.toISOString(),
            cacheStats: predictionCache.getStats(),
          },
          metadata: {
            isOperatingHours: true,
            dayCategory: getDayCategory(now),
          },
        };
      } catch (error) {
        return {
          success: false,
          error: 'Failed to refresh predictions',
          data: null,
        };
      }
    }),

  /**
   * Get Active Events (PHASE 92)
   * Validate and return currently active events in Fort Erie area
   */
  events: router({
    active: publicProcedure.query(async () => {
      try {
        const now = new Date();
        const activeEvents = await getActiveEvents(now);
        const eventMultiplier = await calculateEventDemandMultiplier(now);

        return {
          success: true,
          data: {
            active_events: activeEvents,
            event_count: activeEvents.length,
            demand_multiplier: eventMultiplier,
            impact_description: getEventImpactDescription(eventMultiplier),
            timestamp: now.toISOString(),
          },
          metadata: {
            isOperatingHours: isWithinOperatingHours(now),
            dayCategory: getDayCategory(now),
          },
        };
      } catch (error) {
        console.error('Error fetching active events:', error);
        return {
          success: true,
          data: {
            active_events: [],
            event_count: 0,
            demand_multiplier: 1.0,
            impact_description: 'No active events',
            timestamp: new Date().toISOString(),
          },
        };
      }
    }),
  }),

  /**
   * Dynamic Alerts (PHASE 93)
   * Generate alerts only from live operational conditions
   */
  alerts: router({
    generate: protectedProcedure
      .input(
        z.object({
          zoneId: z.string(),
          predictedOrders: z.number().int().optional(),
          demandThreshold: z.number().int().default(40),
          driverShortageRisk: z.number().min(0).max(1).optional(),
          delayRisk: z.number().min(0).max(1).optional(),
          precipitation: z.number().optional(),
          snowfall: z.number().optional(),
          windSpeed: z.number().optional(),
          hotspotsIntensity: z.number().min(0).max(1).optional(),
          activeEventMultiplier: z.number().optional(),
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

          // Generate dynamic alerts from live conditions
          const alerts = generateDynamicAlerts({
            predictedOrders: input.predictedOrders,
            demandThreshold: input.demandThreshold,
            driverShortageRisk: input.driverShortageRisk,
            delayRisk: input.delayRisk,
            precipitation: input.precipitation,
            snowfall: input.snowfall,
            windSpeed: input.windSpeed,
            hotspotsIntensity: input.hotspotsIntensity,
            activeEventMultiplier: input.activeEventMultiplier,
          });

          return {
            success: true,
            data: {
              alerts,
              alert_count: alerts.length,
              has_critical: alerts.some(a => a.priority === 'critical'),
              timestamp: now.toISOString(),
            },
            metadata: {
              isOperatingHours: true,
              dayCategory: getDayCategory(now),
              generatedAt: now.toISOString(),
            },
          };
        } catch (error) {
          console.error('Error generating alerts:', error);
          return {
            success: true,
            data: {
              alerts: [],
              alert_count: 0,
              has_critical: false,
              timestamp: new Date().toISOString(),
            },
          };
        }
      }),
  }),

  /**
   * Composite Dashboard Data (WEATHER-AWARE)
   * Get all AI predictions for dashboard display with weather adjustments
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
          
          // Fetch weather data once for all predictions
          const weatherData = await getWeatherData();
          let weatherImpact: WeatherImpactScore | null = null;
          
          if (weatherData) {
            weatherImpact = calculateWeatherImpact(weatherData);
          }
          
          // Fetch demand, risks, and recommendations in parallel
          const [demandRes, riskRes, recsRes] = await Promise.all([
            callGeoAIService('/api/v1/demand/batch-predict', 'POST', {
              zone_ids: input.zoneIds,
              forecast_hours: input.forecastHours,
            }),
            callGeoAIService('/api/v1/risk/alerts'),
            callGeoAIService('/api/v1/recommendations/dashboard'),
          ]);

          // Apply weather adjustments to all responses
          let adjustedDemand = demandRes;
          let adjustedRecs = recsRes;

          if (weatherImpact) {
            // Apply weather to demand
            if (Array.isArray(adjustedDemand.predictions)) {
              adjustedDemand.predictions = adjustedDemand.predictions.map((pred: any) => ({
                ...pred,
                base_forecast: pred.predicted_orders,
                predicted_orders: applyWeatherToDemand(pred.predicted_orders, weatherImpact),
                demand_multiplier: weatherImpact.demandMultiplier,
              }));
            }
            
            // Add weather recommendations
            const weatherRecs = generateWeatherRecommendations(weatherImpact);
            if (Array.isArray(adjustedRecs.recommendations)) {
              adjustedRecs.recommendations = [
                ...adjustedRecs.recommendations,
                ...weatherRecs
              ];
            } else {
              adjustedRecs.recommendations = weatherRecs;
            }
          }

          return {
            success: true,
            data: {
              demand: adjustedDemand,
              risks: riskRes,
              recommendations: adjustedRecs,
              weather: weatherImpact,
              timestamp: new Date(),
            },
            metadata: {
              isOperatingHours: true,
              dayCategory: getDayCategory(now),
              temporalFeatures: extractTemporalFeatures(now),
              weatherAdjusted: !!weatherImpact,
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


