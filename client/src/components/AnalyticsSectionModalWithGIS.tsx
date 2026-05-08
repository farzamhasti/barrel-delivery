import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BarChart3, Map as MapIcon, Layers } from "lucide-react";
import { GISGeographicDistribution } from "./GISGeographicDistribution";
import { GISDeliveryPerformance } from "./GISDeliveryPerformance";
import { GISDriverPerformance } from "./GISDriverPerformance";
import { GISGrowthOpportunities } from "./GISGrowthOpportunities";
import { GISTimeAnalysis } from "./GISTimeAnalysis";

type ViewType = "gis" | "chart";

interface AnalyticsSectionModalWithGISProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  sectionType: "geographic" | "time" | "performance" | "driver" | "growth";
  data?: any;
}

export function AnalyticsSectionModalWithGIS({
  isOpen,
  onClose,
  title,
  description,
  sectionType,
  data,
}: AnalyticsSectionModalWithGISProps) {
  const [activeView, setActiveView] = useState<ViewType>("gis");

  // Transform backend data to GIS component format
  const transformGeographicData = () => {
    if (!data?.areaMetrics) return { downtown: 0, centralPark: 0, both: 0 };
    return {
      downtown: data.areaMetrics["Downtown"]?.total || 0,
      centralPark: data.areaMetrics["Central Park"]?.total || 0,
      both: data.areaMetrics["Both"]?.total || 0,
    };
  };

  const transformTimeData = () => {
    if (!data?.hourlyData) return undefined;
    // Convert hourly record to array format for rendering
    const hourlyArray = Object.entries(data.hourlyData).map(([hour, count]: [string, any]) => ({
      hour: parseInt(hour),
      total: count,
      areaBreakdown: data.areaTimeData ? {
        Downtown: data.areaTimeData["Downtown"]?.hourly?.[parseInt(hour)] || 0,
        "Central Park": data.areaTimeData["Central Park"]?.hourly?.[parseInt(hour)] || 0,
        Both: data.areaTimeData["Both"]?.hourly?.[parseInt(hour)] || 0,
      } : {},
    }));
    return {
      hourlyData: hourlyArray,
    };
  };

  const transformPerformanceData = () => {
    if (!data?.areaMetrics) return { downtown: { avgTime: 0 }, centralPark: { avgTime: 0 }, both: { avgTime: 0 } };
    return {
      downtown: { avgTime: data.areaMetrics["Downtown"]?.avgTotalTime || 0 },
      centralPark: { avgTime: data.areaMetrics["Central Park"]?.avgTotalTime || 0 },
      both: { avgTime: data.areaMetrics["Both"]?.avgTotalTime || 0 },
    };
  };

  const transformDriverData = () => {
    if (!data || typeof data !== "object") return [];
    const colors = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A", "#98D8C8"];
    let colorIndex = 0;
    return Object.entries(data).map(([driverId, metrics]: any) => ({
      name: metrics.driverId || `Driver ${driverId}`,
      color: colors[colorIndex++ % colors.length],
      deliveries: metrics.totalDeliveries || 0,
      avgTime: metrics.avgDeliveryTime || 0,
    }));
  };

  const transformGrowthData = () => {
    if (!data?.topGrowthZones) return [];
    return data.topGrowthZones.map((zone: any, idx: number) => ({
      name: `Zone ${idx + 1}`,
      lat: zone.centerLat,
      lng: zone.centerLng,
      orderCount: zone.orderCount,
      avgDeliveryTime: zone.avgDeliveryTime,
    }));
  };

  const renderGISMap = () => {
    switch (sectionType) {
      case "geographic":
        return <GISGeographicDistribution data={transformGeographicData()} />;
      case "time":
        return <GISTimeAnalysis data={transformTimeData()} />;
      case "performance":
        return <GISDeliveryPerformance data={transformPerformanceData()} />;
      case "driver":
        return <GISDriverPerformance drivers={transformDriverData()} />;
      case "growth":
        return <GISGrowthOpportunities zones={transformGrowthData()} />;
      default:
        return <div className="text-gray-500">GIS map not available for this section</div>;
    }
  };

  const renderChartContent = () => {
    switch (sectionType) {
      case "geographic":
        return (
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Geographic Distribution</h3>
            {data?.areaMetrics ? (
              <div className="grid grid-cols-3 gap-4">
                {Object.entries(data.areaMetrics).map(([area, metrics]: any) => (
                  <div key={area} className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">{area}</p>
                    <p className="text-2xl font-bold text-gray-900">{metrics.total}</p>
                    <p className="text-xs text-gray-500">{metrics.percentage.toFixed(1)}% of total</p>
                    <p className="text-xs text-gray-500 mt-1">Avg: {metrics.avgPerDay.toFixed(1)}/day</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No data available</p>
            )}
          </div>
        );

      case "time":
        const timeData = transformTimeData();
        return (
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Time Analysis</h3>
            {timeData?.hourlyData && timeData.hourlyData.length > 0 ? (
              <div className="space-y-2">
                <div className="bg-blue-50 p-3 rounded">
                  <p className="text-sm font-medium">Peak Hour: {data.peakHour}:00</p>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left">Hour</th>
                        <th className="px-3 py-2 text-right">Downtown</th>
                        <th className="px-3 py-2 text-right">Central Park</th>
                        <th className="px-3 py-2 text-right">Both</th>
                        <th className="px-3 py-2 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {timeData.hourlyData.map((row: any) => (
                        <tr key={row.hour} className="border-b hover:bg-gray-50">
                          <td className="px-3 py-2 font-medium">{row.hour}:00</td>
                          <td className="px-3 py-2 text-right">{row.areaBreakdown?.Downtown || 0}</td>
                          <td className="px-3 py-2 text-right">{row.areaBreakdown?.["Central Park"] || 0}</td>
                          <td className="px-3 py-2 text-right">{row.areaBreakdown?.Both || 0}</td>
                          <td className="px-3 py-2 text-right font-medium">{row.total}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">No data available</p>
            )}
          </div>
        );

      case "performance":
        return (
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Delivery Performance</h3>
            {data?.areaMetrics ? (
              <div className="space-y-3">
                {Object.entries(data.areaMetrics).map(([area, metrics]: any) => (
                  <div key={area} className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium">{area}</p>
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        metrics.rating === "Green" ? "bg-green-100 text-green-800" :
                        metrics.rating === "Yellow" ? "bg-yellow-100 text-yellow-800" :
                        "bg-red-100 text-red-800"
                      }`}>
                        {metrics.rating}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <p className="text-gray-600">Prep Time</p>
                        <p className="font-semibold">{metrics.avgPrepTime.toFixed(1)}m</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Delivery Time</p>
                        <p className="font-semibold">{metrics.avgDeliveryTime.toFixed(1)}m</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Total Time</p>
                        <p className="font-semibold">{metrics.avgTotalTime.toFixed(1)}m</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No data available</p>
            )}
          </div>
        );

      case "driver":
        return (
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Driver Performance</h3>
            {data && Object.keys(data).length > 0 ? (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {Object.entries(data).map(([driverId, metrics]: any) => (
                  <div key={driverId} className="bg-gray-50 p-4 rounded-lg">
                    <p className="font-medium mb-2">{metrics.driverId || `Driver ${driverId}`}</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-gray-600">Deliveries</p>
                        <p className="font-semibold">{metrics.totalDeliveries}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Avg Time</p>
                        <p className="font-semibold">{metrics.avgDeliveryTime.toFixed(1)}m</p>
                      </div>
                      <div>
                        <p className="text-gray-600">On-Time Rate</p>
                        <p className="font-semibold">{metrics.onTimeRate.toFixed(1)}%</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Efficiency</p>
                        <p className="font-semibold">{metrics.efficiencyScore.toFixed(1)}/100</p>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">Main Area: {metrics.mostFrequentArea}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No data available</p>
            )}
          </div>
        );

      case "growth":
        return (
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Growth Opportunities</h3>
            {data?.topGrowthZones && data.topGrowthZones.length > 0 ? (
              <div className="space-y-3">
                <div className="bg-blue-50 p-3 rounded">
                  <p className="text-sm font-medium">Top Growth Zones</p>
                </div>
                {data.topGrowthZones.map((zone: any, idx: number) => (
                  <div key={idx} className="bg-gray-50 p-4 rounded-lg">
                    <p className="font-medium mb-2">Zone {idx + 1}</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-gray-600">Orders</p>
                        <p className="font-semibold">{zone.orderCount}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Avg Delivery</p>
                        <p className="font-semibold">{zone.avgDeliveryTime.toFixed(1)}m</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No data available</p>
            )}
          </div>
        );

      default:
        return <div className="text-gray-500">No chart data available</div>;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapIcon className="w-5 h-5" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {/* View Toggle */}
        <div className="flex gap-2 border-b pb-4">
          <Button
            variant={activeView === "gis" ? "default" : "outline"}
            onClick={() => setActiveView("gis")}
            size="sm"
            className="gap-2"
          >
            <Layers className="w-4 h-4" />
            GIS Map
          </Button>
          <Button
            variant={activeView === "chart" ? "default" : "outline"}
            onClick={() => setActiveView("chart")}
            size="sm"
            className="gap-2"
          >
            <BarChart3 className="w-4 h-4" />
            Chart/Table
          </Button>
        </div>

        {/* Content */}
        <div className="py-4">
          {activeView === "gis" && (
            <div className="space-y-4">
              {data ? renderGISMap() : <p className="text-gray-500">Loading analytics data...</p>}
            </div>
          )}

          {activeView === "chart" && (
            <div className="space-y-4">
              {data ? renderChartContent() : <p className="text-gray-500">Loading analytics data...</p>}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
