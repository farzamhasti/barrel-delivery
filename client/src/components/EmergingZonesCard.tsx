import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, MapPin, Calendar, ChevronDown } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface EmergingZonesCardProps {
  onClick: () => void;
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

  // Independent time filter for Emerging Zones (separate from global filters)
  const [independentDateRange, setIndependentDateRange] = useState<{ startDate: Date; endDate: Date }>(getInitialDateRange());
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Use independent date range (always set now)
  const effectiveDateRange = independentDateRange;

  const { data: zonesData, isLoading } = trpc.analytics.analyzeEmergingZones.useQuery({
    startDate: effectiveDateRange?.startDate?.toISOString(),
    endDate: effectiveDateRange?.endDate?.toISOString(),
    areaFilter: areaFilter,
  });

  const getTopZones = () => {
    if (!zonesData?.zones) return [];
    return zonesData.zones.slice(0, 3);
  };

  const topZones = getTopZones();

  const getClassificationColor = (classification: string) => {
    switch (classification) {
      case "rapid_emerging":
        return "bg-green-50 text-green-700";
      case "early_growth":
        return "bg-blue-50 text-blue-700";
      case "stable":
        return "bg-gray-50 text-gray-700";
      case "saturated":
        return "bg-orange-50 text-orange-700";
      case "declining":
        return "bg-red-50 text-red-700";
      default:
        return "bg-gray-50 text-gray-700";
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

  return (
    <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <TrendingUp className="w-5 h-5" />
          Emerging Demand Zones
        </CardTitle>
        <CardDescription>Identify high-growth delivery areas and market opportunities</CardDescription>

        {/* Independent Time Filter */}
        <div className="mt-4 pt-4 border-t">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-gray-600" />
              <span className="text-gray-600">Analysis Period:</span>
              <span className="font-medium text-gray-900">{formatDateDisplay()}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDatePicker(!showDatePicker)}
              className="gap-1"
            >
              <Calendar className="w-4 h-4" />
              Change
              <ChevronDown className="w-3 h-3" />
            </Button>
          </div>

          {/* Date Picker Dropdown */}
          {showDatePicker && (
            <div className="mt-3 p-3 bg-gray-50 rounded border">
              <div className="space-y-2 text-sm">
                <p className="font-medium text-gray-700">Date Range:</p>
                <div className="flex gap-2">
                  <input
                    type="date"
                    id="startDate"
                    className="flex-1 px-2 py-1 border rounded text-sm"
                    onChange={(e) => {
                      if (e.target.value) {
                        const newStart = new Date(e.target.value);
                        setIndependentDateRange({ ...independentDateRange, startDate: newStart });
                      }
                    }}
                    value={independentDateRange?.startDate?.toISOString().split('T')[0] || ''}
                  />
                  <input
                    type="date"
                    id="endDate"
                    className="flex-1 px-2 py-1 border rounded text-sm"
                    onChange={(e) => {
                      if (e.target.value) {
                        const newEnd = new Date(e.target.value);
                        setIndependentDateRange({ ...independentDateRange, endDate: newEnd });
                      }
                    }}
                    value={independentDateRange?.endDate?.toISOString().split('T')[0] || ''}
                  />
                </div>
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => setShowDatePicker(false)}
                  className="w-full mt-2"
                >
                  Apply
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="bg-gray-100 rounded-lg h-48 flex items-center justify-center mb-4 cursor-pointer hover:bg-gray-200 transition-colors" onClick={onClick}>
          <div className="text-center">
            <MapPin className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">
              {isLoading ? "Loading zones..." : `${zonesData?.count || 0} zones detected`}
            </p>
          </div>
        </div>

        {!isLoading && topZones.length > 0 ? (
          <div className="space-y-2">
            {topZones.map((zone, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded cursor-pointer hover:bg-gray-100" onClick={onClick}>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">Zone {idx + 1}</p>
                  <p className="text-xs text-gray-600">{zone.totalOrders} orders</p>
                </div>
                <span className={`text-xs font-semibold px-2 py-1 rounded ${getClassificationColor(zone.classification)}`}>
                  {(zone.emergingScore * 100).toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-gray-500">
            <p className="text-sm">No zones detected yet</p>
          </div>
        )}

        <Button onClick={onClick} variant="outline" className="w-full mt-4">
          View Full Analysis
        </Button>
      </CardContent>
    </Card>
  );
}
