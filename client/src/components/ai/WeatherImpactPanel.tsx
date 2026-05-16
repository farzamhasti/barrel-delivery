/**
 * Weather Impact Panel Component
 * Displays comprehensive weather impact breakdown with multiplier contributions
 */

import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Cloud, Droplets, Wind, Eye, Thermometer } from 'lucide-react';

interface WeatherData {
  temperature: number;
  apparent_temperature: number;
  humidity: number;
  precipitation: number;
  snowfall: number;
  weather_code: number;
  wind_speed: number;
  wind_gusts: number;
  wind_direction: number;
  visibility: number;
}

interface WeatherImpactPanelProps {
  weatherData: WeatherData | null;
  demandMultiplier: number;
}

export default function WeatherImpactPanel({ weatherData, demandMultiplier }: WeatherImpactPanelProps) {
  if (!weatherData) {
    return (
      <Card className="p-4 bg-gray-50 border-gray-200">
        <p className="text-sm text-gray-600">Loading weather data...</p>
      </Card>
    );
  }

  // Calculate individual multiplier contributions
  const getMultiplierBreakdown = () => {
    const breakdown = [];
    let totalMultiplier = 1;

    // Snowfall impact
    if (weatherData.snowfall > 0) {
      const snowMultiplier = Math.min(0.40, weatherData.snowfall * 0.05);
      breakdown.push({
        factor: 'Snowfall',
        value: `${weatherData.snowfall}mm`,
        multiplier: snowMultiplier,
        icon: '❄️',
        description: 'Heavy snow increases delivery demand'
      });
      totalMultiplier += snowMultiplier;
    }

    // Precipitation impact
    if (weatherData.precipitation > 0) {
      const precipMultiplier = Math.min(0.25, weatherData.precipitation * 0.03);
      breakdown.push({
        factor: 'Precipitation',
        value: `${weatherData.precipitation}mm`,
        multiplier: precipMultiplier,
        icon: '🌧️',
        description: 'Rain increases delivery demand'
      });
      totalMultiplier += precipMultiplier;
    }

    // Temperature impact
    if (weatherData.temperature < 0) {
      const coldMultiplier = Math.min(0.20, Math.abs(weatherData.temperature) * 0.02);
      breakdown.push({
        factor: 'Cold Temperature',
        value: `${weatherData.temperature}°C`,
        multiplier: coldMultiplier,
        icon: '🥶',
        description: 'Cold weather increases demand'
      });
      totalMultiplier += coldMultiplier;
    } else if (weatherData.temperature > 30) {
      const heatMultiplier = -0.10;
      breakdown.push({
        factor: 'Hot Weather',
        value: `${weatherData.temperature}°C`,
        multiplier: heatMultiplier,
        icon: '🔥',
        description: 'Hot weather may reduce demand'
      });
      totalMultiplier += heatMultiplier;
    }

    // Wind impact
    if (weatherData.wind_speed > 25) {
      const windMultiplier = Math.min(0.10, (weatherData.wind_speed - 25) * 0.01);
      breakdown.push({
        factor: 'Strong Wind',
        value: `${weatherData.wind_speed}km/h`,
        multiplier: windMultiplier,
        icon: '💨',
        description: 'Strong wind increases delivery difficulty'
      });
      totalMultiplier += windMultiplier;
    }

    // Visibility impact
    if (weatherData.visibility < 5000) {
      const visibilityMultiplier = Math.min(0.15, (5000 - weatherData.visibility) / 10000);
      breakdown.push({
        factor: 'Low Visibility',
        value: `${(weatherData.visibility / 1000).toFixed(1)}km`,
        multiplier: visibilityMultiplier,
        icon: '👁️',
        description: 'Low visibility increases delivery time'
      });
      totalMultiplier += visibilityMultiplier;
    }

    return { breakdown, totalMultiplier: Math.max(0.8, totalMultiplier) };
  };

  const { breakdown, totalMultiplier: calculatedMultiplier } = getMultiplierBreakdown();

  const getSeverityLevel = (multiplier: number) => {
    if (multiplier >= 1.35) return { level: 'Critical', color: 'bg-red-100 text-red-800', badge: '🔴' };
    if (multiplier >= 1.25) return { level: 'High', color: 'bg-orange-100 text-orange-800', badge: '🟠' };
    if (multiplier >= 1.10) return { level: 'Medium', color: 'bg-yellow-100 text-yellow-800', badge: '🟡' };
    if (multiplier < 0.95) return { level: 'Low', color: 'bg-green-100 text-green-800', badge: '🟢' };
    return { level: 'Normal', color: 'bg-blue-100 text-blue-800', badge: '🔵' };
  };

  const severity = getSeverityLevel(demandMultiplier);

  return (
    <div className="space-y-4">
      {/* Main Weather Impact Summary */}
      <Card className={`p-4 border-2 ${severity.color}`}>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Weather Impact Summary</h3>
            <span className="text-2xl">{severity.badge}</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-600 mb-1">Severity Level</p>
              <p className="text-lg font-bold">{severity.level}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">Demand Multiplier</p>
              <p className="text-lg font-bold">×{demandMultiplier.toFixed(2)}</p>
            </div>
          </div>

          <div className="pt-2 border-t">
            <p className="text-xs font-semibold uppercase tracking-wide">
              {demandMultiplier >= 1.35 ? '⚠️ Severe weather - expect high demand surge' :
               demandMultiplier >= 1.25 ? '⚠️ Bad weather - expect increased demand' :
               demandMultiplier >= 1.10 ? '⚠️ Poor weather - expect moderate demand increase' :
               demandMultiplier < 0.95 ? '✅ Favorable weather - expect lower demand' :
               '➡️ Normal weather conditions'}
            </p>
          </div>
        </div>
      </Card>

      {/* Weather Factors Breakdown */}
      {breakdown.length > 0 && (
        <Card className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
          <h4 className="font-semibold text-gray-700 mb-3">Weather Factors Impact</h4>
          <div className="space-y-2">
            {breakdown.map((factor, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 bg-white rounded border border-gray-200">
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-lg">{factor.icon}</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-700">{factor.factor}</p>
                    <p className="text-xs text-gray-500">{factor.value}</p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge className={`${factor.multiplier > 0 ? 'bg-orange-200 text-orange-800' : 'bg-green-200 text-green-800'}`}>
                    {factor.multiplier > 0 ? '+' : ''}{(factor.multiplier * 100).toFixed(0)}%
                  </Badge>
                  <p className="text-xs text-gray-600 mt-1">{factor.description}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Current Conditions */}
      <Card className="p-4 bg-gradient-to-br from-slate-50 to-gray-50 border-gray-200">
        <h4 className="font-semibold text-gray-700 mb-3">Current Conditions</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div className="flex items-center gap-2">
            <Thermometer className="w-4 h-4 text-red-500" />
            <div>
              <p className="text-xs text-gray-600">Temperature</p>
              <p className="text-sm font-semibold">{weatherData.temperature}°C</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Droplets className="w-4 h-4 text-blue-500" />
            <div>
              <p className="text-xs text-gray-600">Humidity</p>
              <p className="text-sm font-semibold">{weatherData.humidity}%</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Wind className="w-4 h-4 text-cyan-500" />
            <div>
              <p className="text-xs text-gray-600">Wind</p>
              <p className="text-sm font-semibold">{weatherData.wind_speed}km/h</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Cloud className="w-4 h-4 text-gray-500" />
            <div>
              <p className="text-xs text-gray-600">Precipitation</p>
              <p className="text-sm font-semibold">{weatherData.precipitation}mm</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Cloud className="w-4 h-4 text-blue-300" />
            <div>
              <p className="text-xs text-gray-600">Snowfall</p>
              <p className="text-sm font-semibold">{weatherData.snowfall}mm</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-amber-500" />
            <div>
              <p className="text-xs text-gray-600">Visibility</p>
              <p className="text-sm font-semibold">{(weatherData.visibility / 1000).toFixed(1)}km</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
