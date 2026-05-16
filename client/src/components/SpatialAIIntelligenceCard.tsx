/*
 * Spatial AI Intelligence Card - REALTIME OPERATIONAL VERSION
 * 
 * Fully dynamic Geo AI forecasting engine with:
 * - Real predictions from Python Geo AI microservice
 * - 5-15 minute auto-refresh during business hours
 * - Business hours enforcement (Sun-Thu 4PM-10PM, Fri-Sat 4PM-11PM)
 * - Live weather-driven recalculation
 * - Dynamic alert generation from real conditions
 * - Event validation system
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import { useWeatherChangeDetection, useWeatherChangeHistory } from '@/hooks/useWeatherChangeDetection';
import { getOperatingMode, getModeInfo, shouldForecastingBeActive, shouldLiveMetricsBeActive, getTimeUntilNextMode } from '@/lib/operatingModes';

interface SpatialAIProps {
  selectedMonth?: string;
  selectedYear?: string;
  dateRange?: any;
  areaFilter?: string;
}

export function SpatialAIIntelligenceCard({ selectedMonth, selectedYear, dateRange, areaFilter }: SpatialAIProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [aiStatus, setAiStatus] = useState<'loading' | 'ready' | 'error' | 'closed'>('loading');
  const [alerts, setAlerts] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [isBusinessOpen, setIsBusinessOpen] = useState(false);
  const [operatingMode, setOperatingMode] = useState<'pre-operation' | 'active-operations' | 'closed'>('pre-operation');
  const [nextOpeningTime, setNextOpeningTime] = useState<string>('');
  const [demandMultiplier, setDemandMultiplier] = useState(1.0);
  const [eventMultiplier, setEventMultiplier] = useState(1.0);
  const [weatherChangeLog, setWeatherChangeLog] = useState<string[]>([]);
  const weatherHistory = useWeatherChangeHistory(5);

  // Operating mode check (pre-operation, active-operations, or closed)
  const checkOperatingMode = useCallback(() => {
    const now = new Date();
    const mode = getOperatingMode(now);
    const timeUntil = getTimeUntilNextMode(now);

    setOperatingMode(mode);
    setIsBusinessOpen(mode === 'active-operations');

    if (mode === 'pre-operation') {
      setNextOpeningTime(`Tonight at 4:00 PM (${timeUntil.formatted})`);
    } else if (mode === 'active-operations') {
      setNextOpeningTime(`Closes in ${timeUntil.formatted}`);
    } else {
      setNextOpeningTime(`Next shift at 4:00 PM (${timeUntil.formatted})`);
    }

    return mode;
  }, []);


  // Fetch weather data via tRPC
  const { data: weatherResponse, isLoading: weatherLoading } = trpc.geoAI.weather.current.useQuery(undefined, {
    refetchInterval: 300000, // 5 minutes
  });

  // Fetch demand prediction via tRPC
  const { data: demandResponse, isLoading: demandLoading } = trpc.geoAI.demand.predict.useQuery(
    { zoneId: '1', forecastHours: 2 },
    { refetchInterval: 600000, enabled: shouldForecastingBeActive() } // Always forecast, even in pre-operation
  );

  // Fetch hotspots via tRPC
  const { data: hotspotsResponse, isLoading: hotspotsLoading } = trpc.geoAI.hotspots.active.useQuery(undefined, {
    refetchInterval: 600000,
    enabled: shouldForecastingBeActive()
  });

  // Fetch risk assessment via tRPC
  const { data: riskResponse, isLoading: riskLoading } = trpc.geoAI.risk.predict.useQuery(
    { zoneId: '1', forecastHours: 2 },
    { refetchInterval: 600000, enabled: shouldForecastingBeActive() }
  );

  // Fetch recommendations via tRPC
  const { data: recsResponse, isLoading: recsLoading } = trpc.geoAI.recommendations.generate.useQuery(
    { zoneId: '1' },
    { refetchInterval: 600000, enabled: shouldForecastingBeActive() }
  );

  // Fetch active events via tRPC (Phase 92)
  const { data: eventsResponse, isLoading: eventsLoading } = trpc.geoAI.events.active.useQuery(undefined, {
    refetchInterval: 600000,
    enabled: shouldForecastingBeActive()
  });

  // Calculate demand multiplier from weather
  const calculateDemandMultiplier = useCallback(() => {
    if (!weatherResponse?.data) return 1.0;

    const weather = weatherResponse.data;
    let multiplier = 1.0;

    // Snowfall: +0.35x multiplier
    if (weather.snowfall && weather.snowfall > 0) {
      multiplier += 0.35;
    }
    // Rain: +0.15x multiplier
    else if (weather.precipitation && weather.precipitation > 5) {
      multiplier += 0.15;
    }

    // Temperature effects
    if (weather.temperature) {
      if (weather.temperature < 0) {
        multiplier += 0.10; // Cold
      }
      if (weather.temperature < -10) {
        multiplier += 0.10; // Extreme cold
      }
      if (weather.temperature > 30) {
        multiplier -= 0.10; // Hot
      }
    }

    // Wind effects
    if (weather.wind_speed && weather.wind_speed > 25) {
      multiplier += 0.05;
    }

    // Ensure minimum multiplier
    return Math.max(0.8, multiplier);
  }, [weatherResponse]);

  // Update demand multiplier
  useEffect(() => {
    setDemandMultiplier(calculateDemandMultiplier());
  }, [calculateDemandMultiplier]);

  // Update event multiplier (Phase 92)
  useEffect(() => {
    if (eventsResponse?.data?.demand_multiplier) {
      setEventMultiplier(eventsResponse.data.demand_multiplier);
    }
  }, [eventsResponse]);

  // Weather change detection (Phase 91)
  const handleWeatherChange = (change: string) => {
    weatherHistory.addChange(change);
    setWeatherChangeLog(prev => [change, ...prev.slice(0, 4)]);
    console.log('Weather change detected:', change);
  };

  useWeatherChangeDetection(
    weatherResponse?.data,
    handleWeatherChange,
    {
      temperatureChange: 5,
      precipitationStart: true,
      snowfallStart: true,
      windSpeedIncrease: 10,
    }
  );

  // Generate dynamic alerts
  useEffect(() => {
    const dynamicAlerts: any[] = [];

    // Demand surge alert
    if (demandResponse?.data?.predicted_orders && demandResponse.data.predicted_orders > 40) {
      dynamicAlerts.push({
        id: 'demand-surge',
        type: 'warning',
        title: 'High Demand Surge Predicted',
        message: `Demand forecast shows ${demandResponse.data.predicted_orders} orders expected in next 2 hours`,
        confidence: demandResponse.data.confidence_score || 0.85,
        timestamp: new Date(),
        priority: 'high'
      });
    }

    // Driver shortage alert
    if (riskResponse?.data?.driver_shortage_risk && riskResponse.data.driver_shortage_risk > 0.7) {
      dynamicAlerts.push({
        id: 'driver-shortage',
        type: 'caution',
        title: 'Critical Driver Shortage Risk',
        message: 'Driver availability insufficient for predicted demand',
        confidence: riskResponse.data.driver_shortage_risk,
        timestamp: new Date(),
        priority: 'critical'
      });
    }

    // Delay risk alert
    if (riskResponse?.data?.delay_probability && riskResponse.data.delay_probability > 0.6) {
      dynamicAlerts.push({
        id: 'delay-risk',
        type: 'warning',
        title: 'High Delivery Delay Risk',
        message: 'Current conditions may cause delivery delays',
        confidence: riskResponse.data.delay_probability,
        timestamp: new Date(),
        priority: 'high'
      });
    }

    // Weather impact alert
    if (weatherResponse?.data) {
      const weather = weatherResponse.data;
      if (weather.snowfall > 0 || (weather.precipitation > 5 && weather.wind_speed > 25)) {
        dynamicAlerts.push({
          id: 'weather-impact',
          type: 'warning',
          title: 'Severe Weather Impact',
          message: 'Current weather conditions significantly affecting operations',
          confidence: 0.95,
          timestamp: new Date(),
          priority: 'high'
        });
      }
    }

    // Hotspot overload alert
    if (hotspotsResponse?.data?.highest_intensity && hotspotsResponse.data.highest_intensity > 0.85) {
      dynamicAlerts.push({
        id: 'hotspot-overload',
        type: 'caution',
        title: 'Hotspot Overload Detected',
        message: `High intensity hotspot detected (${Math.round(hotspotsResponse.data.highest_intensity * 100)}%)`,
        confidence: 0.9,
        timestamp: new Date(),
        priority: 'high'
      });
    }

    // If no alerts, show "No Active AI Alerts"
    if (dynamicAlerts.length === 0) {
      setAlerts([{
        id: 'no-alerts',
        type: 'info',
        title: 'No Active AI Alerts',
        message: 'All operational metrics within normal parameters',
        confidence: 1.0,
        timestamp: new Date(),
        priority: 'info'
      }]);
    } else {
      setAlerts(dynamicAlerts);
    }

    // Set recommendations
    if (recsResponse?.data?.recommendations) {
      setRecommendations(recsResponse.data.recommendations);
    }

    // Update AI status
    if (demandLoading || hotspotsLoading || riskLoading || recsLoading || weatherLoading) {
      setAiStatus('loading');
    } else {
      setAiStatus('ready');
    }
  }, [demandResponse, hotspotsResponse, riskResponse, recsResponse, weatherResponse, demandLoading, hotspotsLoading, riskLoading, recsLoading, weatherLoading]);

  // Check business hours
  useEffect(() => {
    checkOperatingMode();
    const hoursCheckInterval = setInterval(checkOperatingMode, 60000); // 1 minute
    return () => clearInterval(hoursCheckInterval);
  }, [checkOperatingMode]);

  // Render "Closed" state (after business closes)
  if (operatingMode === 'closed') {
    return (
      <Card className="col-span-2 border-2 border-red-200 bg-gradient-to-br from-red-50 to-orange-50 shadow-lg">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-red-600" />
            Business Closed
          </CardTitle>
          <CardDescription>Forecasting paused - Next-day planning available</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Alert className="border-red-300 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                <strong>Operating Hours:</strong> Sun-Thu 4:00 PM - 10:00 PM | Fri-Sat 4:00 PM - 11:00 PM
              </AlertDescription>
            </Alert>
            <div className="text-center py-8">
              <p className="text-lg font-semibold text-gray-700">{nextOpeningTime}</p>
              <p className="text-sm text-gray-600 mt-2">Next-day planning and forecasting available for tomorrow's operations.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Build prediction data object for child components
  const predictionData = useMemo(() => ({
    demandForecast: {
      predicted_demand: demandResponse?.data?.predicted_orders || 0,
      confidence_score: demandResponse?.data?.confidence_score || 0,
      trend: 'stable' as const,
      change_percent: 0
    },
    hotspots: {
      active_hotspots: hotspotsResponse?.data?.active_hotspots || 0,
      highest_intensity: hotspotsResponse?.data?.highest_intensity || 0,
      coverage_area: 'Downtown Fort Erie'
    },
    riskAssessment: {
      delay_probability: riskResponse?.data?.delay_probability || 0,
      driver_shortage_risk: riskResponse?.data?.driver_shortage_risk || 0,
      overload_risk: 0,
      overall_risk_level: 'low' as const
    },
    weatherImpact: {
      temperature: weatherResponse?.data?.temperature || 0,
      condition: weatherResponse?.data?.weather_code ? 'Clear' : 'Unknown',
      impact_score: demandMultiplier * 100,
      precipitation_chance: weatherResponse?.data?.precipitation || 0
    },
    eventImpact: { 
      active_events: eventsResponse?.data?.event_count || 0, 
      event_name: eventsResponse?.data?.impact_description || 'No Active Events', 
      demand_multiplier: eventMultiplier 
    },
    timestamp: Date.now(),
    refreshedAt: new Date().toLocaleTimeString()
  }), [demandResponse, hotspotsResponse, riskResponse, weatherResponse, demandMultiplier]);

  return (
    <Card className={`col-span-2 border-2 shadow-lg ${
      operatingMode === 'pre-operation'
        ? 'border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50'
        : 'border-purple-200 bg-gradient-to-br from-purple-50 to-blue-50'
    }`}>
      {/* Header with mode indicator and refresh timestamp */}
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5" style={{ color: operatingMode === 'pre-operation' ? '#0369a1' : '#9333ea' }} />
              Spatial AI Intelligence
            </CardTitle>
            <CardDescription>
              {operatingMode === 'pre-operation' ? 'Pre-Operation Forecasting Mode - Planning for tonight' : 'Real-time operational forecasting engine'}
              {predictionData?.refreshedAt && (
                <span className="ml-2 text-xs text-gray-500">Last updated: {predictionData.refreshedAt}</span>
              )}
            </CardDescription>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge variant={aiStatus === 'ready' ? 'default' : aiStatus === 'loading' ? 'secondary' : 'destructive'}>
              {operatingMode === 'pre-operation' ? '🔵 Preparing' : aiStatus === 'ready' ? '🟢 Live' : aiStatus === 'loading' ? '🟡 Updating...' : '🔴 Error'}
            </Badge>
            <span className="text-xs text-gray-600">{nextOpeningTime}</span>
          </div>
        </div>
      </CardHeader>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6 px-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="map">Map</TabsTrigger>
          <TabsTrigger value="alerts">Alerts {alerts.length > 0 && alerts[0].id !== 'no-alerts' && <span className="ml-1 text-xs">({alerts.length})</span>}</TabsTrigger>
          <TabsTrigger value="weather">Weather</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4 p-4">
          {predictionData && <AIKPISummary data={predictionData} />}
        </TabsContent>

        {/* Map Tab */}
        <TabsContent value="map" className="space-y-4 p-4">
          {predictionData && <AIPredictionMap predictions={predictionData} />}
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="space-y-4 p-4">
          {alerts.length > 0 ? (
            <AIAlertsPanel alerts={alerts} />
          ) : (
            <Alert className="border-green-300 bg-green-50">
              <AlertDescription className="text-green-800">
                No Active AI Alerts - All operational metrics within normal parameters
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        {/* Weather Tab */}
        <TabsContent value="weather" className="space-y-4 p-4">
          {weatherResponse?.data && (
            <WeatherImpactPanel 
              weatherData={weatherResponse.data} 
              demandMultiplier={demandMultiplier}
            />
          )}
          {weatherChangeLog.length > 0 && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
              <p className="text-sm font-semibold text-blue-900 mb-2">Recent Weather Changes:</p>
              <ul className="text-sm text-blue-800 space-y-1">
                {weatherChangeLog.map((change, idx) => (
                  <li key={idx}>• {change}</li>
                ))}
              </ul>
            </div>
          )}
        </TabsContent>

        {/* Events Tab (Phase 92) */}
        <TabsContent value="events" className="space-y-4 p-4">
          {eventsResponse?.data?.active_events && eventsResponse.data.active_events.length > 0 ? (
            <div className="space-y-3">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded">
                <p className="font-semibold text-amber-900">Active Events</p>
                <p className="text-sm text-amber-800 mt-1">{eventsResponse.data.impact_description}</p>
              </div>
              {eventsResponse.data.active_events.map((event: any, idx: number) => (
                <div key={idx} className="p-3 bg-blue-50 border border-blue-200 rounded">
                  <p className="font-semibold text-blue-900">{event.name}</p>
                  <p className="text-sm text-blue-800">Type: {event.type}</p>
                  <p className="text-sm text-blue-800">Demand Multiplier: {event.demandMultiplier.toFixed(2)}x</p>
                  <p className="text-xs text-blue-700 mt-1">{event.description}</p>
                </div>
              ))}
            </div>
          ) : (
            <Alert className="border-green-300 bg-green-50">
              <AlertDescription className="text-green-800">
                No Active Events - Normal demand expected
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        {/* Recommendations Tab */}
        <TabsContent value="recommendations" className="space-y-4 p-4">
          {recommendations.length > 0 ? (
            <AIRecommendationsPanel recommendations={recommendations} />
          ) : (
            <Alert className="border-blue-300 bg-blue-50">
              <AlertDescription className="text-blue-800">
                No recommendations at this time - Current operations are optimal
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>
      </Tabs>
    </Card>
  );
}

export default SpatialAIIntelligenceCard;
