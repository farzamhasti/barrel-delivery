/**
 * ML Forecast Card Component
 * 
 * Displays machine learning demand forecasts with confidence scoring
 * and temporal feature analysis for the Geomarketing dashboard.
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp, BarChart3, AlertCircle, CheckCircle2, Clock, Zap } from 'lucide-react';
import { trpc } from '@/lib/trpc';

interface MLForecastCardProps {
  zoneId?: string;
  forecastHour?: number;
}

export function MLForecastCard({ zoneId = 'default', forecastHour }: MLForecastCardProps) {
  const [selectedHour, setSelectedHour] = useState(forecastHour || new Date().getHours());
  const [showDetails, setShowDetails] = useState(false);

  // Fetch ML forecast
  const { data: response, isLoading, error } = trpc.learning.getMLForecast.useQuery(
    {
      zoneId,
      forecastHour: selectedHour,
    },
    {
      refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
    }
  );

  const forecast = response?.data;

  if (isLoading) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-blue-500" />
            ML Demand Forecast
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !forecast || !response?.success) {
    return (
      <Card className="border-0 shadow-sm border-l-4 border-l-yellow-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-yellow-700">
            <AlertCircle className="h-5 w-5" />
            ML Forecast Unavailable
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">
            {error ? 'Error loading forecast' : 'Unable to generate ML forecast at this time. Check back later.'}
          </p>
        </CardContent>
      </Card>
    );
  }

  const confidenceLevel =
    forecast.confidenceScore > 0.8
      ? 'high'
      : forecast.confidenceScore > 0.6
      ? 'moderate'
      : 'low';

  const confidenceColor =
    confidenceLevel === 'high'
      ? 'text-green-600 bg-green-50'
      : confidenceLevel === 'moderate'
      ? 'text-blue-600 bg-blue-50'
      : 'text-yellow-600 bg-yellow-50';

  const trendIcon =
    forecast.modelMetadata.trendDirection === 'increasing' ? (
      <TrendingUp className="h-4 w-4 text-green-600" />
    ) : forecast.modelMetadata.trendDirection === 'decreasing' ? (
      <TrendingUp className="h-4 w-4 text-red-600 rotate-180" />
    ) : (
      <div className="h-4 w-4 text-gray-600">—</div>
    );

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-blue-500" />
              ML Demand Forecast
            </CardTitle>
            <CardDescription>
              Statistical machine learning model with temporal feature engineering
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? 'Hide' : 'Show'} Details
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Hour Selector */}
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-gray-500" />
          <label className="text-sm font-medium">Forecast Hour:</label>
          <select
            value={selectedHour}
            onChange={(e) => setSelectedHour(parseInt(e.target.value))}
            className="px-2 py-1 border border-gray-300 rounded text-sm"
          >
            {Array.from({ length: 24 }, (_, i) => (
              <option key={i} value={i}>
                {i.toString().padStart(2, '0')}:00
              </option>
            ))}
          </select>
        </div>

        {/* Main Forecast Display */}
        <div className="grid grid-cols-2 gap-4">
          {/* Baseline Forecast */}
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="text-sm text-gray-600 mb-1">Baseline Forecast</div>
            <div className="text-3xl font-bold text-blue-600">
              {forecast.baselineForecast.toFixed(1)}
            </div>
            <div className="text-xs text-gray-500 mt-1">orders predicted</div>
          </div>

          {/* Confidence Score */}
          <div className={`rounded-lg p-4 border ${confidenceColor.split(' ')[1]}`}>
            <div className="text-sm text-gray-600 mb-1">Confidence</div>
            <div className="text-3xl font-bold">
              {(forecast.confidenceScore * 100).toFixed(0)}%
            </div>
            <div className="text-xs text-gray-500 mt-1 capitalize">{confidenceLevel}</div>
          </div>
        </div>

        {/* Trend and Volatility */}
        <div className="grid grid-cols-2 gap-4">
          {/* Trend */}
          <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
            {trendIcon}
            <div>
              <div className="text-xs text-gray-600">Trend</div>
              <div className="text-sm font-semibold capitalize">
                {forecast.modelMetadata.trendDirection}
              </div>
            </div>
          </div>

          {/* Volatility */}
          <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
            <BarChart3 className="h-4 w-4 text-gray-600" />
            <div>
              <div className="text-xs text-gray-600">Volatility</div>
              <div className="text-sm font-semibold">
                {(forecast.modelMetadata.volatility * 100).toFixed(0)}%
              </div>
            </div>
          </div>
        </div>

        {/* Confidence Explanation */}
        <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
          <div className="text-sm text-blue-900">
            <strong>Why this confidence?</strong>
            <p className="text-xs mt-1">{forecast.confidenceExplanation}</p>
          </div>
        </div>

        {/* Detailed Metrics */}
        {showDetails && (
          <div className="space-y-3 border-t pt-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-xs text-gray-600">Training Data Points</div>
                <div className="font-semibold">
                  {forecast.modelMetadata.trainingDataPoints}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-600">Historical Average</div>
                <div className="font-semibold">
                  {forecast.modelMetadata.averageHistoricalDemand.toFixed(1)}
                </div>
              </div>
            </div>

            {/* Temporal Features */}
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-xs font-semibold text-gray-700 mb-2">Temporal Features</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-gray-600">Day of Week:</span>
                  <span className="ml-1 font-semibold">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][
                      forecast.modelMetadata.temporalFeatures.dayOfWeek
                    ]}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Hour:</span>
                  <span className="ml-1 font-semibold">
                    {forecast.modelMetadata.temporalFeatures.hour.toString().padStart(2, '0')}:00
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Peak Hour:</span>
                  <span className="ml-1 font-semibold">
                    {forecast.modelMetadata.temporalFeatures.isPeakHour ? 'Yes' : 'No'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Demand Intensity:</span>
                  <span className="ml-1 font-semibold">
                    {(forecast.modelMetadata.temporalFeatures.demandIntensity * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Model Info */}
            <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600">
              <div className="font-semibold text-gray-700 mb-1">Model Type</div>
              <div>Weighted Regression with Temporal Features</div>
              <div className="mt-2">
                Uses historical demand patterns, day-of-week effects, and peak hour analysis
                to generate statistically-grounded forecasts.
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-xs text-gray-500 border-t pt-3">
          <div className="flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3 text-green-600" />
            ML model trained on {forecast.modelMetadata.trainingDataPoints} historical data points
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
