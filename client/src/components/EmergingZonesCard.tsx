import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, MapPin } from "lucide-react";
import { trpc } from "@/lib/trpc";


interface EmergingZonesCardProps {
  onClick: () => void;
  dateRange?: { startDate: Date; endDate: Date };
  areaFilter?: string;
}

export function EmergingZonesCard({ onClick, dateRange, areaFilter }: EmergingZonesCardProps) {
  const { data: zonesData, isLoading } = trpc.analytics.analyzeEmergingZones.useQuery({
    startDate: dateRange?.startDate?.toISOString(),
    endDate: dateRange?.endDate?.toISOString(),
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

  return (
    <Card
      className="border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <TrendingUp className="w-5 h-5" />
          Emerging Demand Zones
        </CardTitle>
        <CardDescription>Identify high-growth delivery areas and market opportunities</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="bg-gray-100 rounded-lg h-48 flex items-center justify-center mb-4">
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
              <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    Zone {idx + 1}
                  </p>
                  <p className="text-xs text-gray-600">
                    Score: {(zone.emergingScore * 100).toFixed(0)}%
                  </p>
                </div>
                <span className={`text-xs font-semibold px-2 py-1 rounded ${getClassificationColor(zone.classification)}`}>
                  {zone.classification.replace(/_/g, " ")}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-gray-500">Click to view emerging zones analysis</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
