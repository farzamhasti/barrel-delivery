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
import { AlertTriangle, TrendingUp, Zap, Brain, MapPin, Clock, Users, Lightbulb } from 'lucide-react';
import AIKPISummary from './ai/AIKPISummary';
import AIPredictionMap from './ai/AIPredictionMap';
import AIAlertsPanel from './ai/AIAlertsPanel';
import AIRecommendationsPanel from './ai/AIRecommendationsPanel';
import AIConfidenceIndicator from './ai/AIConfidenceIndicator';

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

  // Simulate AI data loading
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
          weatherImpact: {
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
  }, [selectedMonth, selectedYear]);

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
          <TabsList className="grid w-full grid-cols-4 bg-purple-100">
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

          {/* Recommendations Tab */}
          <TabsContent value="recommendations">
            <AIRecommendationsPanel recommendations={recommendations} />
          </TabsContent>
        </Tabs>

        {/* Footer Info */}
        <div className="flex items-center justify-between text-xs text-gray-500 pt-4 border-t border-purple-200">
          <span>Last updated: {new Date().toLocaleTimeString()}</span>
          <span>Powered by Geo AI Service v1.0</span>
        </div>
      </CardContent>
    </Card>
  );
}
