import { TrendingUp, MapPin, Calendar, ChevronDown, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";

interface EmergingZonesCardProps {
  onClick: (independentDateRange: { startDate: Date; endDate: Date }) => void;
  dateRange?: { startDate: Date; endDate: Date };
  areaFilter?: string;
}

export function EmergingZonesCard({ onClick, dateRange, areaFilter }: EmergingZonesCardProps) {
  // Initialize with today's date
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  // Use string-based state for dates to avoid Date object reference issues
  const [startDateStr, setStartDateStr] = useState(todayStr);
  const [endDateStr, setEndDateStr] = useState(todayStr);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Convert string dates back to Date objects for the query
  // Use useMemo to stabilize references and ensure query refetches when dates change
  const queryParams = useMemo(() => {
    const start = new Date(startDateStr);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDateStr);
    end.setHours(23, 59, 59, 999);
    console.log('[EmergingZonesCard] Query params updated:', { startDateStr, endDateStr, startDate: start, endDate: end });
    return {
      startDate: start,
      endDate: end,
      areaFilter: areaFilter || '',
    };
  }, [startDateStr, endDateStr, areaFilter]);

  // Use the memoized params in the query
  const { data: spatialData, isLoading } = trpc.analytics.analyzeSpatialDemandShift.useQuery(queryParams, {
    staleTime: 0,
  });
  
  // Log query execution
  console.log('[EmergingZonesCard] Query executed:', { isLoading, hasData: !!spatialData, zonesCount: spatialData?.zones?.length || 0 });

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

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-600" />
              Spatial-Temporal Demand Shift Analysis
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Geographic movement patterns of delivery demand over time
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {/* Date Range Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Analysis Period</label>
          <div className="flex gap-2 items-center">
            <input
              type="date"
              value={startDateStr}
              onChange={(e) => {
                console.log('[EmergingZonesCard] Start date changed:', e.target.value);
                setStartDateStr(e.target.value);
              }}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
            <span className="text-gray-500">to</span>
            <input
              type="date"
              value={endDateStr}
              onChange={(e) => {
                console.log('[EmergingZonesCard] End date changed:', e.target.value);
                setEndDateStr(e.target.value);
              }}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        )}

        {/* No Data State */}
        {!isLoading && (!spatialData?.zones || spatialData.zones.length === 0) && (
          <div className="text-center py-8">
            <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600">No spatial demand patterns detected for this period</p>
            {spatialData?.spatialInterpretation && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700">
                <strong>Spatial Insight:</strong> {spatialData.spatialInterpretation}
              </div>
            )}
          </div>
        )}

        {/* Zones Display */}
        {!isLoading && topZones.length > 0 && (
          <div className="space-y-3">
            {topZones.map((zone, idx) => (
              <div key={idx} className="p-3 bg-gray-50 rounded border border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">Zone {zone.hexId}</h4>
                    <p className="text-xs text-gray-600 mt-1">
                      Density Change: {zone.densityChange.toFixed(1)} | Growth: {zone.growthPercentage.toFixed(1)}%
                    </p>
                  </div>
                  <div className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 border ${getClassificationColor(zone.classification)}`}>
                    {getClassificationIcon(zone.classification)}
                    {zone.classification}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Insight Box */}
        {spatialData?.spatialInterpretation && spatialData.zones && spatialData.zones.length > 0 && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700">
            <strong>Spatial Insight:</strong> {spatialData.spatialInterpretation}
          </div>
        )}
      </div>
    </div>
  );
}
