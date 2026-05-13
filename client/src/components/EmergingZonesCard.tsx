import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { TrendingUp, MapPin, Calendar, ChevronDown, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";

interface EmergingZonesCardProps {
  onClick: (independentDateRange: { startDate: Date; endDate: Date }) => void;
  dateRange?: { startDate: Date; endDate: Date };
  areaFilter?: string;
}

export function EmergingZonesCard({ onClick, dateRange, areaFilter }: EmergingZonesCardProps) {
  // Initialize with today's date so date inputs work immediately
  const getInitialDateRange = () => {
    const today = new Date();
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);
    return { startDate: today, endDate: endOfDay };
  };

  // Independent time filter for Spatial Demand Shift (separate from global filters)
  const [independentDateRange, setIndependentDateRange] = useState<{ startDate: Date; endDate: Date }>(getInitialDateRange());
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Use independent date range (always set now)
  const effectiveDateRange = independentDateRange;

  // Memoize query parameters using timestamps to ensure stable references
  const queryParams = useMemo(() => ({
    startDate: effectiveDateRange.startDate,
    endDate: effectiveDateRange.endDate,
    areaFilter: areaFilter || '',
  }), [
    effectiveDateRange.startDate.getTime(),
    effectiveDateRange.endDate.getTime(),
    areaFilter,
  ]);

  // Debug: Log when query parameters change
  useEffect(() => {
    console.log('[EmergingZonesCard] Query params changed:', {
      startDate: queryParams.startDate.toISOString(),
      endDate: queryParams.endDate.toISOString(),
      areaFilter: queryParams.areaFilter,
    });
  }, [queryParams]);

  const { data: spatialData, isLoading } = trpc.analytics.analyzeSpatialDemandShift.useQuery(queryParams, {
    // Always refetch to get fresh data
    staleTime: 0,
  });

  const getTopZones = () => {
    if (!spatialData?.zones) return [];
    return spatialData.zones.slice(0, 3);
  };

  const topZones = getTopZones();

  const getClassificationColor = (classification: string) => {
    switch (classification) {
      case "Strong Growth":
        return "bg-green-50 text-green-700 border-green-200";
      case "Moderate Growth":
        return "bg-lime-50 text-lime-700 border-lime-200";
      case "Stable":
        return "bg-yellow-50 text-yellow-700 border-yellow-200";
      case "Decline":
        return "bg-orange-50 text-orange-700 border-orange-200";
      case "Rapid Shift":
        return "bg-red-50 text-red-700 border-red-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  const getClassificationIcon = (classification: string) => {
    switch (classification) {
      case "Strong Growth":
      case "Moderate Growth":
        return <ArrowUpRight className="w-4 h-4" />;
      case "Decline":
      case "Rapid Shift":
        return <ArrowDownLeft className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const handleSetDateRange = (startDate: Date, endDate: Date) => {
    setIndependentDateRange({ startDate, endDate });
    setShowDatePicker(false);
  };

  const handleSetSingleDate = (date: Date) => {
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    setIndependentDateRange({ startDate: date, endDate: endOfDay });
    setShowDatePicker(false);
  };

  const formatDateDisplay = () => {
    const start = independentDateRange.startDate.toLocaleDateString();
    const end = independentDateRange.endDate.toLocaleDateString();
    return start === end ? start : `${start} to ${end}`;
  };

  const handleViewFullAnalysis = () => {
    onClick(independentDateRange);
  };

  return (
    <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <MapPin className="w-5 h-5 text-blue-600" />
          Spatial-Temporal Demand Shift Analysis
        </CardTitle>
        <p className="text-sm text-gray-600 mt-2">
          Geographic movement patterns of delivery demand over time
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Date Range Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Analysis Period</label>
          <div className="flex gap-2 items-center">
            <div className="flex-1 relative">
              <input
                type="date"
                value={independentDateRange.startDate.toISOString().split('T')[0]}
                onChange={(e) => {
                  const newDate = new Date(e.target.value);
                  newDate.setHours(0, 0, 0, 0);
                  setIndependentDateRange({
                    ...independentDateRange,
                    startDate: newDate,
                  });
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
            <span className="text-gray-500">to</span>
            <div className="flex-1 relative">
              <input
                type="date"
                value={independentDateRange.endDate.toISOString().split('T')[0]}
                onChange={(e) => {
                  const newDate = new Date(e.target.value);
                  newDate.setHours(23, 59, 59, 999);
                  setIndependentDateRange({
                    startDate: independentDateRange.startDate,
                    endDate: newDate,
                  });
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="text-sm text-gray-600 mt-2">Analyzing spatial demand patterns...</p>
          </div>
        )}

        {/* No Data State */}
        {!isLoading && (!spatialData?.zones || spatialData.zones.length === 0) && (
          <div className="text-center py-8 text-gray-500">
            <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No spatial demand patterns detected for this period</p>
          </div>
        )}

        {/* Top Zones Display */}
        {!isLoading && topZones.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">Top Spatial Shifts</h3>
            {topZones.map((zone, idx) => (
              <div key={zone.hexId} className={`p-3 rounded-lg border ${getClassificationColor(zone.classification)}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold">Zone {idx + 1}</span>
                      {getClassificationIcon(zone.classification)}
                      <span className="text-xs font-medium">{zone.classification}</span>
                    </div>
                    <p className="text-xs opacity-75 mb-2">
                      {zone.orderCount} orders | Growth: {zone.growthPercentage > 0 ? '+' : ''}{zone.growthPercentage.toFixed(1)}%
                    </p>
                    <div className="text-xs space-y-1">
                      <p>Previous Density: {zone.previousDensity} | Current: {zone.currentDensity}</p>
                      <p>Status: {zone.clusterStatus === 'new' ? '🆕 New Cluster' : zone.clusterStatus === 'growing' ? '📈 Expanding' : zone.clusterStatus === 'stable' ? '➡️ Stable' : zone.clusterStatus === 'shrinking' ? '📉 Shrinking' : '❌ Disappearing'}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Spatial Interpretation */}
        {!isLoading && spatialData?.spatialInterpretation && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-800">
              <strong>Spatial Insight:</strong> {spatialData.spatialInterpretation}
            </p>
          </div>
        )}

        {/* View Full Analysis Button */}
        {!isLoading && spatialData?.zones && spatialData.zones.length > 0 && (
          <Button
            onClick={handleViewFullAnalysis}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            View Full Spatial Analysis
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
