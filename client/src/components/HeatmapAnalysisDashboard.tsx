import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, AlertCircle, CheckCircle, Target, Zap, BarChart3 } from 'lucide-react';
import {
  analyzeDemandHotspots,
  analyzeCoverageMetrics,
  analyzeConcentration,
  generateZoneRecommendations,
  analyzeTrends,
  comparePerformance,
  type GridPoint,
  type DeliveryPoint,
} from '@/lib/heatmapAnalysis';

interface HeatmapAnalysisDashboardProps {
  gridPoints: GridPoint[];
  deliveryPoints: DeliveryPoint[];
  previousGridPoints?: GridPoint[] | null;
}

export const HeatmapAnalysisDashboard: React.FC<HeatmapAnalysisDashboardProps> = ({
  gridPoints,
  deliveryPoints,
  previousGridPoints,
}) => {
  // Run all analyses
  const hotspots = useMemo(() => analyzeDemandHotspots(gridPoints, 5), [gridPoints]);
  const coverage = useMemo(() => analyzeCoverageMetrics(gridPoints), [gridPoints]);
  const concentration = useMemo(() => analyzeConcentration(gridPoints), [gridPoints]);
  const recommendations = useMemo(() => generateZoneRecommendations(gridPoints), [gridPoints]);
  const trends = useMemo(() => analyzeTrends(deliveryPoints), [deliveryPoints]);
  const performance = useMemo(() => comparePerformance(gridPoints, previousGridPoints || null), [gridPoints, previousGridPoints]);

  return (
    <div className="space-y-4">
      {/* Analysis 1: Demand Hotspots */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-4 w-4" />
            Top Delivery Hotspots
          </CardTitle>
          <CardDescription>Highest concentration zones</CardDescription>
        </CardHeader>
        <CardContent>
          {hotspots.length > 0 ? (
            <div className="space-y-2">
              {hotspots.map(spot => (
                <div key={spot.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div>
                    <p className="text-sm font-medium">#{spot.id} - {spot.zone}</p>
                    <p className="text-xs text-gray-500">
                      Lat: {spot.lat.toFixed(4)}, Lng: {spot.lng.toFixed(4)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-red-600">{(spot.intensity * 100).toFixed(1)}%</p>
                    <p className="text-xs text-gray-500">{spot.deliveryCount} deliveries</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No hotspots detected</p>
          )}
        </CardContent>
      </Card>

      {/* Analysis 2: Coverage Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-4 w-4" />
            Service Area Coverage
          </CardTitle>
          <CardDescription>Residential area penetration</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 p-3 rounded">
              <p className="text-xs text-gray-600 uppercase tracking-wide">Coverage</p>
              <p className="text-2xl font-bold text-blue-600">{coverage.coveragePercentage.toFixed(1)}%</p>
              <p className="text-xs text-gray-500 mt-1">of residential area</p>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <p className="text-xs text-gray-600 uppercase tracking-wide">Uncovered</p>
              <p className="text-2xl font-bold text-gray-600">{coverage.uncoveredPercentage.toFixed(1)}%</p>
              <p className="text-xs text-gray-500 mt-1">growth opportunity</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Analysis 3: Delivery Concentration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="h-4 w-4" />
            Delivery Concentration
          </CardTitle>
          <CardDescription>Market concentration analysis</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="p-3 bg-amber-50 rounded border border-amber-200">
            <p className="text-sm font-semibold text-amber-900">{concentration.paretoPercentage}</p>
          </div>
          <p className="text-sm text-gray-700">{concentration.interpretation}</p>
          <div className="flex items-center gap-2">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full"
                style={{ width: `${Math.min(concentration.concentrationIndex * 100, 100)}%` }}
              ></div>
            </div>
            <span className="text-xs font-medium text-gray-600 w-12">
              {(concentration.concentrationIndex * 100).toFixed(0)}%
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Analysis 4: Zone Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CheckCircle className="h-4 w-4" />
            Strategic Recommendations
          </CardTitle>
          <CardDescription>Action items by zone intensity</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recommendations.map((rec, idx) => (
              <div key={idx} className="border-l-4 border-blue-500 pl-3 py-2">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{rec.zone}</p>
                    <p className="text-xs text-gray-600 mt-1">{rec.intensity}</p>
                  </div>
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded ${
                      rec.priority === 'high'
                        ? 'bg-red-100 text-red-700'
                        : rec.priority === 'medium'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {rec.priority.toUpperCase()}
                  </span>
                </div>
                <p className="text-xs text-gray-700 mt-2 font-medium">{rec.strategy}</p>
                <p className="text-xs text-gray-600 mt-1">{rec.action}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Analysis 5: Trend Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4" />
            Delivery Trends
          </CardTitle>
          <CardDescription>Peak hours and days</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-purple-50 p-3 rounded">
              <p className="text-xs text-gray-600 uppercase tracking-wide">Peak Hour</p>
              <p className="text-2xl font-bold text-purple-600">{trends.peakHour}:00</p>
              <p className="text-xs text-gray-500 mt-1">{trends.peakHourDeliveries} deliveries</p>
            </div>
            <div className="bg-green-50 p-3 rounded">
              <p className="text-xs text-gray-600 uppercase tracking-wide">Peak Day</p>
              <p className="text-lg font-bold text-green-600">{trends.peakDay}</p>
              <p className="text-xs text-gray-500 mt-1">{trends.peakDayDeliveries} deliveries</p>
            </div>
            <div className="bg-indigo-50 p-3 rounded">
              <p className="text-xs text-gray-600 uppercase tracking-wide">Avg/Hour</p>
              <p className="text-2xl font-bold text-indigo-600">{trends.averageDeliveriesPerHour.toFixed(1)}</p>
            </div>
            <div className="bg-orange-50 p-3 rounded">
              <p className="text-xs text-gray-600 uppercase tracking-wide">Avg/Day</p>
              <p className="text-2xl font-bold text-orange-600">{trends.averageDeliveriesPerDay.toFixed(1)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Analysis 6: Performance Comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertCircle className="h-4 w-4" />
            Performance Comparison
          </CardTitle>
          <CardDescription>Period-over-period growth</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gray-50 p-3 rounded">
              <p className="text-xs text-gray-600 uppercase tracking-wide">Current</p>
              <p className="text-lg font-bold text-gray-900">{(performance.currentPeriodIntensity * 100).toFixed(1)}%</p>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <p className="text-xs text-gray-600 uppercase tracking-wide">Previous</p>
              <p className="text-lg font-bold text-gray-900">{(performance.previousPeriodIntensity * 100).toFixed(1)}%</p>
            </div>
            <div
              className={`p-3 rounded ${
                performance.trend === 'up'
                  ? 'bg-green-50'
                  : performance.trend === 'down'
                    ? 'bg-red-50'
                    : 'bg-gray-50'
              }`}
            >
              <p className="text-xs text-gray-600 uppercase tracking-wide">Growth</p>
              <p
                className={`text-lg font-bold ${
                  performance.trend === 'up'
                    ? 'text-green-600'
                    : performance.trend === 'down'
                      ? 'text-red-600'
                      : 'text-gray-600'
                }`}
              >
                {performance.growthRate > 0 ? '+' : ''}
                {performance.growthRate.toFixed(1)}%
              </p>
            </div>
          </div>
          {performance.topGrowingZones.length > 0 && (
            <div className="mt-3 p-3 bg-blue-50 rounded">
              <p className="text-xs font-semibold text-blue-900 mb-2">Top Growing Zones</p>
              <div className="space-y-1">
                {performance.topGrowingZones.map((zone, idx) => (
                  <div key={idx} className="flex justify-between text-xs">
                    <span className="text-gray-700">{zone.zone}</span>
                    <span className="font-medium text-blue-600">
                      {zone.growthRate > 0 ? '+' : ''}
                      {zone.growthRate.toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
