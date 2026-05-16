/**
 * Spatial AI Intelligence Card
 * 
 * Dedicated, modular AI analytics card for the GeoMarketing dashboard
 * Architecturally isolated from standard analytics while remaining scalable
 * 
 * Components:
 * - AI KPI Summary Section
 * - Interactive Mini Geo Map with Prediction Overlays
 * - Realtime AI Alerts Panel
 * - Recommendation Engine Panel
 * - Confidence Scores & Visual Indicators
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, TrendingUp, Zap, Brain, MapPin, Clock, Users, Lightbulb, Cloud } from 'lucide-react';
import AIKPISummary from './ai/AIKPISummary';
import { AIPredictionMap } from './ai/AIPredictionMap';
import AIAlertsPanel from './ai/AIAlertsPanel';
import AIRecommendationsPanel from './ai/AIRecommendationsPanel';
import AIConfidenceIndicator from './ai/AIConfidenceIndicator';
import WeatherImpactPanel from './ai/WeatherImpactPanel';
import { trpc } from '@/lib/trpc';

interface SpatialAIProps {
  selectedMonth?: string;
  selectedYear?: string;
}

export function SpatialAIIntelligenceCard({ selectedMonth, selectedYear, dateRange, areaFilter }: SpatialAIProps & { dateRange?: any; areaFilter?: string }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [aiStatus, setAiStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [predictionData, setPredictionData] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [weatherData, setWeatherData] = useState<any>(null);

  // Helper function to get weather condition from WMO code (MUST be before useEffect)
  const getWeatherCondition = (code: number | undefined): string => {
    if (code === undefined || code === null) return 'Unknown';
    if (code === 0 || code === 1) return 'Clear';
    if (code === 2) return 'Partly Cloudy';
    if (code === 3) return 'Cloudy';
    if (code === 45 || code === 48) return 'Foggy';
    if (code === 51 || code === 53 || code === 55) return 'Light Rain';
    if (code === 61 || code === 63 || code === 65) return 'Rain';
    if (code === 71 || code === 73 || code === 75) return 'Snow';
    if (code === 80 || code === 81 || code === 82) return 'Showers';
    if (code === 85 || code === 86) return 'Snow Showers';
    if (code === 95 || code === 96 || code === 99) return 'Thunderstorm';
    return 'Unknown';
  };
  
  // Calculate weather impact score (0-1) (MUST be before useEffect)
  const calculateWeatherImpact = (current: any): number => {
    let impact = 0.3; // Base impact
    
    // Precipitation increases impact
    if (current.precipitation > 0) impact += 0.2;
    if (current.snowfall > 0) impact += 0.3;
    
    // Wind speed affects impact
    if (current.wind_speed > 20) impact += 0.2;
    
    return Math.min(impact, 1.0);
  };
  
  // Calculate demand multiplier based on weather conditions
  const calculateWeatherImpactMultiplier = (weatherData: any): number => {
    let multiplier = 1.0;
    
    if (weatherData.snowfall && weatherData.snowfall > 0) {
      multiplier += 0.35;
    } else if (weatherData.precipitation && weatherData.precipitation > 0) {
      multiplier += 0.15;
    }
    
    const temp = weatherData.temperature_2m;
    if (temp < -10) {
      multiplier += 0.20;
    } else if (temp < 0) {
      multiplier += 0.10;
    } else if (temp > 30) {
      multiplier -= 0.10;
    }
    
    if (weatherData.wind_speed_10m && weatherData.wind_speed_10m > 25) {
      multiplier += 0.05;
    }
    
    return Math.max(multiplier, 0.8);
  };
  
  // Get weather impact description
  const getWeatherImpactDescription = (weatherData: any): string => {
    const multiplier = calculateWeatherImpactMultiplier(weatherData);
    
    if (multiplier >= 1.35) {
      return 'Severe weather - expect high demand surge';
    } else if (multiplier >= 1.25) {
      return 'Bad weather - expect increased demand';
    } else if (multiplier >= 1.10) {
      return 'Poor weather - expect moderate demand increase';
    } else if (multiplier < 0.95) {
      return 'Favorable weather - expect lower demand';
    }
    return 'Normal weather conditions';
  };

  // Fetch real Fort Erie weather data via tRPC (server-side to bypass CORS)
  const { data: weatherResponse, isLoading: weatherLoading } = trpc.geoAI.weather.current.useQuery(undefined, {
    refetchInterval: 600000, // 10 minutes
  });
  
  // Update weather state when tRPC response arrives
  useEffect(() => {
    if (weatherResponse?.success && weatherResponse.data) {
      const current = weatherResponse.data;
      console.log('Weather API response:', current);
      setWeatherData({
        temperature_2m: current.temperature,
        apparent_temperature: current.apparent_temperature,
        relative_humidity_2m: current.humidity,
        precipitation: current.precipitation || 0,
        snowfall: current.snowfall || 0,
        wind_speed_10m: current.wind_speed,
        wind_gusts_10m: current.wind_gusts,
        wind_direction_10m: current.wind_direction,
        visibility: current.visibility,
        latitude: current.latitude,
        longitude: current.longitude,
        timestamp: new Date().getTime(),
        weather_code: current.weather_code
      });
    }
  }, [weatherResponse]);

  // Simulate AI data loading (this runs after weather is fetched)
  useEffect(() => {
    const loadAIData = async () => {
      try {
        setAiStatus('loading');
        
        // Simulate API call to Geo AI service
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Mock data - will be replaced with real Geo AI API calls
        setPredictionData({
          demandForecast: {
            predicted_demand: 45,
            confidence_score: 0.87,
            trend: 'up',
            change_percent: 12.5
          },
          hotspots: {
            active_hotspots: 3,
            highest_intensity: 0.92,
            coverage_area: '2.5 km²'
          },
          riskAssessment: {
            delay_probability: 0.15,
            driver_shortage_risk: 0.08,
            overload_risk: 0.22,
            overall_risk_level: 'medium'
          },
          weatherImpact: weatherData || {
            temperature: 18,
            condition: 'Partly Cloudy',
            impact_score: 0.3,
            precipitation_chance: 20
          },
          eventImpact: {
            active_events: 1,
            event_name: 'Buffalo Sabres Game',
            demand_multiplier: 1.35
          }
        });

        setAlerts([
          {
            id: 1,
            type: 'warning',
            title: 'High Demand Predicted',
            message: 'Demand forecast shows 45 orders expected in next 2 hours',
            confidence: 0.87,
            timestamp: new Date()
          },
          {
            id: 2,
            type: 'info',
            title: 'Event Impact Detected',
            message: 'Buffalo Sabres game tonight will increase demand by ~35%',
            confidence: 0.92,
            timestamp: new Date()
          },
          {
            id: 3,
            type: 'caution',
            title: 'Driver Shortage Risk',
            message: 'Only 3 active drivers available for predicted demand',
            confidence: 0.78,
            timestamp: new Date()
          }
        ]);

        setRecommendations([
          {
            id: 1,
            priority: 'high',
            title: 'Increase Driver Allocation',
            description: 'Allocate 2-3 additional drivers to handle predicted demand surge',
            impact: 'Reduce delivery time by 8-12%',
            confidence: 0.85
          },
          {
            id: 2,
            priority: 'medium',
            title: 'Prepare Peak Hour Strategy',
            description: 'Prepare for peak demand between 6-8 PM based on event timing',
            impact: 'Improve customer satisfaction by 5-7%',
            confidence: 0.79
          },
          {
            id: 3,
            priority: 'medium',
            title: 'Monitor Hotspot Areas',
            description: 'Focus on downtown and stadium vicinity for maximum efficiency',
            impact: 'Optimize routing efficiency by 10%',
            confidence: 0.81
          }
        ]);

        setAiStatus('ready');
      } catch (error) {
        console.error('Error loading AI data:', error);
        setAiStatus('error');
      }
    };

    loadAIData();
  }, [selectedMonth, selectedYear, weatherData]);

  return (
    <Card className="col-span-2 border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-blue-50 shadow-lg">
      {/* Header */}
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-200 rounded-lg">
              <Brain className="w-6 h-6 text-purple-700" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold text-purple-900">
                Spatial AI Intelligence
              </CardTitle>
              <CardDescription className="text-purple-700">
                Predictive analytics & operational intelligence
              </CardDescription>
            </div>
          </div>
          
          {/* AI Status Badge */}
          <div className="flex items-center gap-2">
            {aiStatus === 'ready' && (
              <Badge className="bg-green-500 hover:bg-green-600">
                <Zap className="w-3 h-3 mr-1" />
                AI Ready
              </Badge>
            )}
            {aiStatus === 'loading' && (
              <Badge className="bg-blue-500 hover:bg-blue-600">
                <Clock className="w-3 h-3 mr-1 animate-spin" />
                Loading
              </Badge>
            )}
            {aiStatus === 'error' && (
              <Badge className="bg-red-500 hover:bg-red-600">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Error
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Tabs Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5 bg-purple-100">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="map" className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              <span className="hidden sm:inline">Map</span>
            </TabsTrigger>
            <TabsTrigger value="alerts" className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              <span className="hidden sm:inline">Alerts</span>
            </TabsTrigger>
            <TabsTrigger value="weather" className="flex items-center gap-2">
              <Cloud className="w-4 h-4" />
              <span className="hidden sm:inline">Weather</span>
            </TabsTrigger>
            <TabsTrigger value="recommendations" className="flex items-center gap-2">
              <Lightbulb className="w-4 h-4" />
              <span className="hidden sm:inline">Recommendations</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            {predictionData && (
              <>
                <AIKPISummary data={predictionData} />
                
                {/* Quick Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {/* Demand Forecast */}
                  <div className="p-3 bg-white rounded-lg border border-purple-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-gray-600">Demand Forecast</span>
                      <AIConfidenceIndicator 
                        score={predictionData.demandForecast.confidence_score}
                        size="sm"
                      />
                    </div>
                    <div className="text-2xl font-bold text-purple-700">
                      {predictionData.demandForecast.predicted_demand}
                    </div>
                    <div className="text-xs text-green-600 flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      +{predictionData.demandForecast.change_percent}%
                    </div>
                  </div>

                  {/* Hotspots */}
                  <div className="p-3 bg-white rounded-lg border border-purple-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-gray-600">Active Hotspots</span>
                      <MapPin className="w-4 h-4 text-orange-500" />
                    </div>
                    <div className="text-2xl font-bold text-orange-600">
                      {predictionData.hotspots.active_hotspots}
                    </div>
                    <div className="text-xs text-gray-500">
                      Max intensity: {(predictionData.hotspots.highest_intensity * 100).toFixed(0)}%
                    </div>
                  </div>

                  {/* Risk Level */}
                  <div className="p-3 bg-white rounded-lg border border-purple-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-gray-600">Risk Level</span>
                      <AlertTriangle className="w-4 h-4 text-yellow-500" />
                    </div>
                    <div className="text-lg font-bold text-yellow-600 capitalize">
                      {predictionData.riskAssessment.overall_risk_level}
                    </div>
                    <div className="text-xs text-gray-500">
                      Delay: {(predictionData.riskAssessment.delay_probability * 100).toFixed(0)}%
                    </div>
                  </div>

                  {/* Weather Impact - Fort Erie Live Weather with Emojis */}
                  <div className="col-span-2 md:col-span-2 p-4 bg-white rounded-lg border border-blue-200 shadow-sm">
                    <div className="space-y-2 text-sm">
                      {/* Header */}
                      <div className="mb-3 pb-2 border-b border-blue-200">
                        <h3 className="font-bold text-blue-900 text-base">🌤️ Fort Erie Live Weather Impact</h3>
                        <p className="text-xs text-blue-700">Fort Erie, Ontario, Canada</p>
                      </div>

                      {/* Temperature */}
                      <div className="flex items-baseline gap-2">
                        <span>🌡️ Temperature:</span>
                        <span className="font-bold text-blue-700">
                          {weatherData?.temperature_2m ? weatherData.temperature_2m.toFixed(1) : predictionData?.weatherImpact?.temperature}°C
                        </span>
                        {weatherData?.apparent_temperature && (
                          <span className="text-xs text-gray-600">
                            (feels like {weatherData.apparent_temperature.toFixed(1)}°C)
                          </span>
                        )}
                      </div>

                      {/* Humidity */}
                      {weatherData?.relative_humidity_2m && (
                        <div className="flex items-baseline gap-2">
                          <span>💧 Humidity:</span>
                          <span className="font-bold text-blue-600">{weatherData.relative_humidity_2m}%</span>
                        </div>
                      )}

                      {/* Precipitation & Snowfall */}
                      {weatherData && (
                        <div className="flex items-baseline gap-2">
                          <span>🌧️ Precipitation:</span>
                          <span className="font-bold text-blue-600">
                            {weatherData.precipitation || 0} mm
                          </span>
                          {weatherData.snowfall > 0 && (
                            <span className="font-bold text-cyan-600">
                              | ❄️ Snowfall: {weatherData.snowfall} mm
                            </span>
                          )}
                        </div>
                      )}

                      {/* Wind */}
                      {weatherData?.wind_speed_10m && (
                        <div className="flex items-baseline gap-2">
                          <span>💨 Wind:</span>
                          <span className="font-bold text-blue-600">
                            {weatherData.wind_speed_10m.toFixed(1)} km/h
                          </span>
                          {weatherData.wind_gusts_10m && (
                            <span className="text-xs text-gray-600">
                              (gust: {weatherData.wind_gusts_10m.toFixed(1)} km/h, direction: {weatherData.wind_direction_10m}°)
                            </span>
                          )}
                        </div>
                      )}

                      {/* Visibility */}
                      {weatherData?.visibility && (
                        <div className="flex items-baseline gap-2">
                          <span>👁️ Visibility:</span>
                          <span className="font-bold text-blue-600">
                            {(weatherData.visibility / 1000).toLocaleString('en-US', { maximumFractionDigits: 0 })} km
                          </span>
                        </div>
                      )}

                      {/* Demand Impact Multiplier */}
                      {weatherData && (
                        <div className="mt-3 pt-3 border-t border-blue-200">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-blue-900">📊 Demand Impact:</span>
                            <span className="text-lg font-bold text-orange-600 bg-orange-50 px-3 py-1 rounded">
                              x{calculateWeatherImpactMultiplier(weatherData).toFixed(2)}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 mt-1">
                            {getWeatherImpactDescription(weatherData)}
                          </p>
                        </div>
                      )}

                      {/* Location Verification */}
                      {weatherData?.latitude && weatherData?.longitude && (
                        <div className="text-xs text-gray-600 pt-2 border-t border-blue-200">
                          <span>📍 Confirmed location:</span> {weatherData.latitude.toFixed(4)}°N, {Math.abs(weatherData.longitude).toFixed(4)}°W (Fort Erie, Ontario)
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Event Impact */}
                  <div className="p-3 bg-white rounded-lg border border-purple-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-gray-600">Event Impact</span>
                      <Zap className="w-4 h-4 text-blue-500" />
                    </div>
                    <div className="text-lg font-bold text-blue-600">
                      {predictionData.eventImpact.active_events > 0 ? '✓ Active' : 'None'}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {predictionData.eventImpact.event_name}
                    </div>
                  </div>
                </div>
              </>
            )}
          </TabsContent>

          {/* Map Tab */}
          <TabsContent value="map">
            <AIPredictionMap predictions={predictionData} />
          </TabsContent>

          {/* Alerts Tab */}
          <TabsContent value="alerts">
            <AIAlertsPanel alerts={alerts} />
          </TabsContent>

          {/* Weather Tab */}
          <TabsContent value="weather">
            <WeatherImpactPanel weatherData={weatherData} demandMultiplier={weatherData ? calculateWeatherImpactMultiplier(weatherData) : 1.0} />
          </TabsContent>

          {/* Recommendations Tab */}
          <TabsContent value="recommendations">
            <AIRecommendationsPanel recommendations={recommendations} />
          </TabsContent>
        </Tabs>

        {/* Footer Info */}
        <div className="flex items-center justify-between text-xs text-gray-500 pt-4 border-t border-purple-200">
          <span>Last updated: {weatherData?.timestamp || new Date().toLocaleTimeString()}</span>
          <span>Weather: Fort Erie • Powered by Geo AI Service v1.0</span>
        </div>
      </CardContent>
    </Card>
  );
}
