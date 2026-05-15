/**
 * AI KPI Summary Section
 * Displays key performance indicators from AI predictions
 */

import React from 'react';
import { Card } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Cloud, Users, AlertCircle } from 'lucide-react';

interface AIKPISummaryProps {
  data: {
    demandForecast: {
      predicted_demand: number;
      confidence_score: number;
      trend: 'up' | 'down' | 'stable';
      change_percent: number;
    };
    hotspots: {
      active_hotspots: number;
      highest_intensity: number;
      coverage_area: string;
    };
    riskAssessment: {
      delay_probability: number;
      driver_shortage_risk: number;
      overload_risk: number;
      overall_risk_level: 'low' | 'medium' | 'high';
    };
    weatherImpact: {
      temperature: number;
      condition: string;
      impact_score: number;
      precipitation_chance: number;
    };
    eventImpact: {
      active_events: number;
      event_name: string;
      demand_multiplier: number;
    };
  };
}

export default function AIKPISummary({ data }: AIKPISummaryProps) {
  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low':
        return 'text-green-600 bg-green-50';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50';
      case 'high':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getTrendIcon = (trend: string) => {
    return trend === 'up' ? (
      <TrendingUp className="w-4 h-4 text-green-600" />
    ) : trend === 'down' ? (
      <TrendingDown className="w-4 h-4 text-red-600" />
    ) : (
      <div className="w-4 h-4 text-gray-600">→</div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Primary Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Demand Forecast Card */}
        <Card className="p-4 bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-700">Predicted Demand</h3>
              <div className="flex items-center gap-1">
                {getTrendIcon(data.demandForecast.trend)}
                <span className={`text-sm font-semibold ${
                  data.demandForecast.trend === 'up' ? 'text-green-600' : 
                  data.demandForecast.trend === 'down' ? 'text-red-600' : 
                  'text-gray-600'
                }`}>
                  {data.demandForecast.change_percent > 0 ? '+' : ''}{data.demandForecast.change_percent}%
                </span>
              </div>
            </div>
            
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-purple-700">
                {data.demandForecast.predicted_demand}
              </span>
              <span className="text-sm text-gray-600">orders expected</span>
            </div>

            {/* Confidence Bar */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600">Confidence</span>
                <span className="font-semibold text-purple-700">
                  {(data.demandForecast.confidence_score * 100).toFixed(0)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all"
                  style={{ width: `${data.demandForecast.confidence_score * 100}%` }}
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Risk Assessment Card */}
        <Card className={`p-4 border-2 ${getRiskColor(data.riskAssessment.overall_risk_level)}`}>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Risk Assessment</h3>
              <AlertCircle className="w-5 h-5" />
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-700">Delay Probability</span>
                <span className="font-semibold">
                  {(data.riskAssessment.delay_probability * 100).toFixed(0)}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-700">Driver Shortage Risk</span>
                <span className="font-semibold">
                  {(data.riskAssessment.driver_shortage_risk * 100).toFixed(0)}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-700">Overload Risk</span>
                <span className="font-semibold">
                  {(data.riskAssessment.overload_risk * 100).toFixed(0)}%
                </span>
              </div>
            </div>

            <div className="pt-2 border-t">
              <span className="text-xs font-semibold uppercase tracking-wide">
                Overall: {data.riskAssessment.overall_risk_level}
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Secondary Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Weather Impact Card */}
        <Card className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-700">Weather Impact</h3>
              <Cloud className="w-5 h-5 text-blue-600" />
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Condition</span>
                <span className="font-semibold">{data.weatherImpact.condition}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Temperature</span>
                <span className="font-semibold">{data.weatherImpact.temperature}°C</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Precipitation</span>
                <span className="font-semibold">{data.weatherImpact.precipitation_chance}%</span>
              </div>
            </div>

            <div className="pt-2 border-t">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600">Impact Score</span>
                <span className="font-semibold text-blue-600">
                  {(data.weatherImpact.impact_score * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* Event Impact Card */}
        <Card className="p-4 bg-gradient-to-br from-orange-50 to-red-50 border-orange-200">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-700">Event Impact</h3>
              <span className="text-2xl">📅</span>
            </div>

            {data.eventImpact.active_events > 0 ? (
              <>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Event</span>
                    <span className="font-semibold text-orange-700">
                      {data.eventImpact.event_name}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Demand Multiplier</span>
                    <span className="font-semibold text-orange-600">
                      ×{data.eventImpact.demand_multiplier.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t">
                  <span className="text-xs font-semibold text-orange-700">
                    ⚡ Major impact expected
                  </span>
                </div>
              </>
            ) : (
              <div className="text-center py-4 text-gray-500">
                <span className="text-sm">No active events</span>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
