import { useState, useEffect } from "react";
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
import { trpc } from "@/lib/trpc";
import { analyzeCompetitorBuffers } from "@/lib/bufferAnalysis";
import { OrderDetailsModal } from "./OrderDetailsModal";

import { Eye } from "lucide-react";

type ViewType = "gis" | "chart";

interface AnalyticsSectionModalWithGISProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  sectionType: "geographic" | "time" | "performance" | "driver" | "growth";
  data?: any;
}

// Fort Erie competitors data - All 56 competitors
const FORT_ERIE_COMPETITORS = [
  { id: 1172079406, name: "McDonald's", latitude: 42.9077128, longitude: -78.9190110, type: "fast_food", hasDelivery: true },
  { id: 1721210349, name: "Shake n' Dog", latitude: 42.8639661, longitude: -79.0683893, type: "restaurant", hasDelivery: false },
  { id: 2503413489, name: "Tim Hortons", latitude: 42.9076679, longitude: -78.9189208, type: "cafe" },
  { id: 5070173721, name: "335 on the Ridge", latitude: 42.8833677, longitude: -79.0524639, type: "restaurant", hasDelivery: false },
  { id: 6728537025, name: "Our Corner Cafe", latitude: 42.8859235, longitude: -79.0522642, type: "cafe", hasDelivery: false },
  { id: 7349691717, name: "Chuck's Roadhouse", latitude: 42.9048291, longitude: -78.9274862, type: "restaurant", hasDelivery: false },
  { id: 7349691731, name: "Pizza Pizza", latitude: 42.9047653, longitude: -78.9256173, type: "fast_food", hasDelivery: true },
  { id: 7349691783, name: "The Barrel", latitude: 42.9052194, longitude: -78.9232931, type: "restaurant", hasDelivery: false },
  { id: 7349692458, name: "Little Caesars", latitude: 42.9048874, longitude: -78.9308618, type: "fast_food", hasDelivery: true },
  { id: 7349692460, name: "M&J's", latitude: 42.9049739, longitude: -78.9301483, type: "fast_food", hasDelivery: true },
  { id: 7349731014, name: "Subway", latitude: 42.9058015, longitude: -78.9244808, type: "fast_food", hasDelivery: true },
  { id: 7349731015, name: "Pita Pit", latitude: 42.9058074, longitude: -78.9237995, type: "fast_food", hasDelivery: true },
  { id: 7349738505, name: "Yukiguni II", latitude: 42.9057459, longitude: -78.9396668, type: "restaurant", hasDelivery: false },
  { id: 7352994236, name: "Subway", latitude: 42.9501464, longitude: -79.0555546, type: "fast_food", hasDelivery: false },
  { id: 9989780584, name: "Shaggy's Pizza & Eats", latitude: 42.9445158, longitude: -79.0550848, type: "restaurant", hasDelivery: false },
  { id: 10172458516, name: "Mae's Place", latitude: 42.9448312, longitude: -79.0545588, type: "restaurant", hasDelivery: false },
  { id: 10278842509, name: "Bella Pizza", latitude: 42.8851377, longitude: -79.0579428, type: "fast_food", hasDelivery: true },
  { id: 10278852409, name: "Subway", latitude: 42.8850714, longitude: -79.0589701, type: "fast_food", hasDelivery: false },
  { id: 11979893866, name: "South Coast Cookhouse", latitude: 42.8638695, longitude: -79.0614649, type: "restaurant", hasDelivery: false },
  { id: 11992741406, name: "Amafli's Trattoria & Bar", latitude: 42.8639310, longitude: -79.0631738, type: "restaurant", hasDelivery: false },
  { id: 663169639, name: "McDonald's", latitude: 42.9060040, longitude: -78.9275090, type: "fast_food", hasDelivery: false },
  { id: 663169665, name: "Garrison Grill", latitude: 42.9051515, longitude: -78.9295640, type: "fast_food", hasDelivery: true },
  { id: 663171739, name: "Tim Hortons", latitude: 42.9044395, longitude: -78.9589475, type: "cafe", hasDelivery: false },
  { id: 663182520, name: "Tim Hortons", latitude: 42.9061340, longitude: -78.9182915, type: "cafe", hasDelivery: false },
  { id: 663182521, name: "Wendy's", latitude: 42.9060295, longitude: -78.9187955, type: "fast_food", hasDelivery: true },
  { id: 663182646, name: "Artemis", latitude: 42.9059780, longitude: -78.9210090, type: "restaurant", hasDelivery: false },
  { id: 663182691, name: "KFC", latitude: 42.9047770, longitude: -78.9253040, type: "fast_food", hasDelivery: true },
  { id: 663182734, name: "Vaticano Restaurant", latitude: 42.9110805, longitude: -78.9090575, type: "restaurant", hasDelivery: true },
  { id: 663182735, name: "Happy Jack's", latitude: 42.9113715, longitude: -78.9090245, type: "restaurant", hasDelivery: true },
  { id: 663182737, name: "Ming Teh", latitude: 42.9119595, longitude: -78.9089565, type: "restaurant", hasDelivery: false },
  { id: 663182827, name: "The Sicilian Chef", latitude: 42.9094398, longitude: -78.9145282, type: "restaurant", hasDelivery: true },
  { id: 663214348, name: "The Breakfast Beacon", latitude: 42.8644220, longitude: -79.0583545, type: "restaurant", hasDelivery: false },
  { id: 663299556, name: "The Scuttlebutt Tap & Eatery", latitude: 42.9455105, longitude: -79.0544950, type: "restaurant", hasDelivery: false },
  { id: 663299642, name: "Tim Hortons", latitude: 42.9506930, longitude: -79.0542615, type: "cafe", hasDelivery: false },
  { id: 1111892111, name: "Red's Takeout", latitude: 42.9460823, longitude: -79.0545900, type: "restaurant", hasDelivery: false },
  { id: 1469989685, name: "A&W", latitude: 42.9056188, longitude: -78.9380640, type: "fast_food", hasDelivery: true },
  { id: 9999999999, name: "Red Swan Pizza", latitude: 42.9056700, longitude: -78.9264499, type: "restaurant", hasDelivery: true },
  { id: 9999999998, name: "Crafted 1885", latitude: 42.8862884, longitude: -78.9633893, type: "restaurant", hasDelivery: true },
  { id: 9999999997, name: "Take 2 Restaurant & Bar", latitude: 42.9042302, longitude: -78.9848798, type: "restaurant", hasDelivery: false },
  { id: 9999999996, name: "Rizzo's House of Parm", latitude: 42.8747407, longitude: -79.0588556, type: "restaurant", hasDelivery: false },
  { id: 9999999995, name: "Rina's Place", latitude: 42.8863661, longitude: -78.9598362, type: "restaurant", hasDelivery: true },
  { id: 9999999994, name: "Tahini's", latitude: 42.9053193, longitude: -78.9330572, type: "restaurant", hasDelivery: true },
  { id: 9999999993, name: "Osmow's Shawarma", latitude: 42.9053193, longitude: -78.9330572, type: "fast_food", hasDelivery: true },
  { id: 9999999992, name: "The Plaice Bar & Grill", latitude: 42.9048928, longitude: -78.9514935, type: "restaurant", hasDelivery: false },
  { id: 9999999991, name: "Pizza Hut", latitude: 42.9057655, longitude: -78.9210877, type: "fast_food", hasDelivery: true },
  { id: 9999999990, name: "Arby's", latitude: 42.9057655, longitude: -78.9210877, type: "fast_food", hasDelivery: true },
  { id: 9999999989, name: "Little Red Coffee & Catering", latitude: 42.9093891, longitude: -78.9118284, type: "restaurant", hasDelivery: true },
  { id: 9999999988, name: "Southsides Patio Bar & Grill", latitude: 42.9107045, longitude: -78.9091060, type: "cafe", hasDelivery: false },
  { id: 9999999987, name: "City Thai Restaurant", latitude: 42.9108257, longitude: -78.9095244, type: "restaurant", hasDelivery: false },
  { id: 9999999986, name: "Quality Pizza Burgers Subs", latitude: 42.9196380, longitude: -78.9189240, type: "fast_food", hasDelivery: true },
  { id: 9999999985, name: "Tito's Pizza and Wings Fort Erie", latitude: 42.9296855, longitude: -78.9181012, type: "fast_food", hasDelivery: true },
  { id: 9999999984, name: "Kaizen Sushi & Ramen", latitude: 42.9297233, longitude: -78.9162130, type: "restaurant", hasDelivery: true },
  { id: 9999999983, name: "Central Pizza", latitude: 42.9128035, longitude: -78.9189003, type: "fast_food", hasDelivery: true },
  { id: 9999999982, name: "Zia's Pizzeria", latitude: 42.9046522, longitude: -78.9618237, type: "fast_food", hasDelivery: true },
  { id: 9999999981, name: "Domino's Pizza 1", latitude: 42.9043651, longitude: -78.9630328, type: "fast_food", hasDelivery: true },
  { id: 9999999980, name: "Domino's Pizza 2", latitude: 42.8850714, longitude: -79.0589701, type: "fast_food", hasDelivery: true },
];

export function AnalyticsSectionModalWithGIS({
  isOpen,
  onClose,
  title,
  description,
  sectionType,
  data,
}: AnalyticsSectionModalWithGISProps) {
  const [activeView, setActiveView] = useState<ViewType>("gis");

  const [competitors, setCompetitors] = useState<any[]>([]);
  const [showOrdersModal, setShowOrdersModal] = useState(false);
  const [selectedOrdersType, setSelectedOrdersType] = useState<"inside" | "outside">("inside");
  const [selectedOrders, setSelectedOrders] = useState<any[]>([]);
  
  // State for competitor buffer analysis (only used for growth section)
  const [selectedCompetitorIds, setSelectedCompetitorIds] = useState<Set<number>>(new Set());
  const [bufferRadiusKm, setBufferRadiusKm] = useState<number>(1);
  const [visibleCompetitorTypes, setVisibleCompetitorTypes] = useState<Set<string>>(new Set(['restaurant', 'cafe', 'fast_food']));
  
  // Helper function to get selected competitors
  const getSelectedCompetitors = () => {
    if (!selectedCompetitorIds || selectedCompetitorIds.size === 0) return [];
    return FORT_ERIE_COMPETITORS.filter((c) => selectedCompetitorIds.has(c.id));
  };
  
  // Helper function to get visible competitors
  const getVisibleCompetitors = () => {
    return FORT_ERIE_COMPETITORS.filter((c) => visibleCompetitorTypes.has(c.type));
  };
  
  // Helper function to get selected and visible competitors
  const handleViewOrders = (type: "inside" | "outside", orders: any[]) => {
    setSelectedOrdersType(type);
    setSelectedOrders(orders);
    setShowOrdersModal(true);
  };

  const getSelectedVisibleCompetitors = () => {
    return FORT_ERIE_COMPETITORS.filter((c) => selectedCompetitorIds.has(c.id) && visibleCompetitorTypes.has(c.type));
  };

  // Use tRPC query hook for fetching competitors
  const { data: competitorData, isLoading: isLoadingCompetitors } = trpc.analytics.fetchCompetitorsFromAPI.useQuery(
    {
      latitude: 42.90517,
      longitude: -78.92295,
      radiusKm: 2,
    },
    {
      enabled: isOpen && sectionType === "growth",
      staleTime: 1000 * 60 * 5, // 5 minutes
    }
  );

  // Update competitors when data changes
  useEffect(() => {
    if (competitorData?.success && competitorData?.competitors) {
      setCompetitors(competitorData.competitors);
    }
  }, [competitorData]);

  // Transform backend data to GIS component format
  const transformGeographicData = () => {
    if (!data?.areaMetrics) return { downtown: 0, centralPark: 0, both: 0 };
    return {
      downtown: data.areaMetrics["Downtown"]?.total || 0,
      centralPark: data.areaMetrics["Central Park"]?.total || 0,
      both: data.areaMetrics["Both"]?.total || 0,
      clusters: data.clusters,
      areaMetrics: data.areaMetrics,
    };
  };

  const transformTimeData = () => {
    if (!data?.hourlyData) return undefined;
    // Convert hourly record to array format for rendering
    const hourlyArray = Object.entries(data.hourlyData).map(([hour, count]: [string, any]) => {
      const areaBreakdown: Record<string, number> = {};
      if (data.areaTimeData) {
        areaBreakdown["Downtown"] = Number(data.areaTimeData["Downtown"]?.hourly?.[parseInt(hour)] || 0);
        areaBreakdown["Central Park"] = Number(data.areaTimeData["Central Park"]?.hourly?.[parseInt(hour)] || 0);
        areaBreakdown["Both"] = Number(data.areaTimeData["Both"]?.hourly?.[parseInt(hour)] || 0);
      }
      return {
        hour: parseInt(hour),
        total: Number(count),
        areaBreakdown: Object.keys(areaBreakdown).length > 0 ? areaBreakdown : undefined,
      };
    });
    return {
      hourlyData: hourlyArray,
      orders: data.orders,
      peakHour: data.peakHour,
    };
  };

  const transformPerformanceData = () => {
    if (!data?.areaMetrics) return { downtown: { avgTime: 0 }, centralPark: { avgTime: 0 }, both: { avgTime: 0 } };
    return {
      downtown: { avgTime: data.areaMetrics["Downtown"]?.avgTotalTime || 0 },
      centralPark: { avgTime: data.areaMetrics["Central Park"]?.avgTotalTime || 0 },
      both: { avgTime: data.areaMetrics["Both"]?.avgTotalTime || 0 },
      areaMetrics: data.areaMetrics,
      orders: data.orders,
    };
  };

  const transformDriverData = () => {
    if (!data || typeof data !== "object") return { drivers: [], driverMetrics: {} };
    const colors = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A", "#98D8C8"];
    let colorIndex = 0;
    const drivers = Object.entries(data).map(([driverId, metrics]: any) => ({
      name: metrics.driverId || `Driver ${driverId}`,
      color: colors[colorIndex++ % colors.length],
      deliveries: metrics.totalDeliveries || 0,
      avgTime: metrics.avgDeliveryTime || 0,
    }));
    return {
      drivers,
      driverMetrics: data,
    };
  };

  const transformGrowthData = () => {
    if (!data?.topGrowthZones) return { zones: [] };
    const zones = data.topGrowthZones.map((zone: any, idx: number) => {
      // Calculate center from orders if available
      if (zone.orders && zone.orders.length > 0) {
        const lats = zone.orders.map((o: any) => parseFloat(o.customerLatitude || 0));
        const lngs = zone.orders.map((o: any) => parseFloat(o.customerLongitude || 0));
        const centerLat = lats.reduce((a: number, b: number) => a + b, 0) / lats.length;
        const centerLng = lngs.reduce((a: number, b: number) => a + b, 0) / lngs.length;
        return {
          name: `Zone ${idx + 1}`,
          lat: centerLat,
          lng: centerLng,
          orderCount: zone.orderCount,
          avgDeliveryTime: zone.distanceFromRestaurant,
          orders: zone.orders,
        };
      }
      return {
        name: `Zone ${idx + 1}`,
        lat: 42.90517,
        lng: -78.92295,
        orderCount: zone.orderCount,
        avgDeliveryTime: 0,
        orders: [],
      };
    });
    return { zones, gridCells: data.gridCells };
  };

  const renderGISMap = () => {
    switch (sectionType) {
      case "geographic":
        return <GISGeographicDistribution data={transformGeographicData()} />;
      case "time":
        const timeData = transformTimeData();
        return <GISTimeAnalysis data={timeData} />;
      case "performance":
        const perfData = transformPerformanceData();
        return <GISDeliveryPerformance data={perfData} />;
      case "driver":
        return <GISDriverPerformance driverMetrics={data} />;
      case "growth":
        const growthData = transformGrowthData();
        return (
          <GISGrowthOpportunities
            zones={growthData.zones}
            gridCells={data?.gridCells}
            competitors={competitors}
            showCompetitors={true}
            selectedCompetitorIds={selectedCompetitorIds}
            onSelectedCompetitorsChange={setSelectedCompetitorIds}
            bufferRadiusKm={bufferRadiusKm}
            onBufferRadiusChange={setBufferRadiusKm}
            visibleCompetitorTypes={visibleCompetitorTypes}
            onVisibleCompetitorTypesChange={setVisibleCompetitorTypes}
          />
        );
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
                        <p className="font-semibold">{(metrics.avgPrepTime || 0).toFixed(1)}m</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Delivery Time</p>
                        <p className="font-semibold">{(metrics.avgDeliveryTime || 0).toFixed(1)}m</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Total Time</p>
                        <p className="font-semibold">{(metrics.avgTotalTime || 0).toFixed(1)}m</p>
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
                    <p className="font-medium mb-2">{metrics.driverName || metrics.driverId || `Driver ${driverId}`}</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-gray-600">Deliveries</p>
                        <p className="font-semibold">{metrics.totalDeliveries}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Avg Time</p>
                        <p className="font-semibold">{(metrics.avgDeliveryTime || 0).toFixed(1)}m</p>
                      </div>
                      <div>
                        <p className="text-gray-600">On-Time Rate</p>
                        <p className="font-semibold">{(metrics.onTimeRate || 0).toFixed(1)}%</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Efficiency</p>
                        <p className="font-semibold">{(metrics.efficiencyScore || 0).toFixed(1)}/100</p>
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
        // Collect all orders from grid cells
        const allOrders: any[] = [];
        if (data?.gridCells) {
          Object.values(data.gridCells).forEach((cell: any) => {
            if (cell.orders && Array.isArray(cell.orders)) {
              allOrders.push(...cell.orders);
            }
          });
        }
        
        // Get selected and visible competitors for analysis
        const selectedCompetitorsForAnalysis = getSelectedVisibleCompetitors();
        
        // Analyze buffer
        const bufferAnalysis = analyzeCompetitorBuffers(
          allOrders,
          selectedCompetitorsForAnalysis,
          bufferRadiusKm
        );
        
        return (
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Geographical Analysis of Competitors</h3>
            
            {/* Competitor Buffer Analysis Section */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
              <h4 className="font-semibold text-blue-900 mb-3">📊 Competitor Buffer Analysis</h4>
              
              {selectedCompetitorIds && selectedCompetitorIds.size > 0 && getSelectedVisibleCompetitors().length > 0 ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white p-3 rounded border border-blue-100">
                      <p className="text-xs text-gray-600 mb-1">Selected Competitors</p>
                      <p className="text-2xl font-bold text-blue-600">{bufferAnalysis.selectedCompetitorsCount}</p>
                    </div>
                    <div className="bg-white p-3 rounded border border-blue-100">
                      <p className="text-xs text-gray-600 mb-1">Buffer Radius</p>
                      <p className="text-2xl font-bold text-blue-600">{bufferAnalysis.bufferRadiusKm.toFixed(1)} km</p>
                    </div>
                  </div>
                  
                   <div className="grid grid-cols-3 gap-2">
                     <div className="bg-white p-3 rounded border border-green-200 cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleViewOrders("inside", bufferAnalysis.ordersInsideList)}>
                       <div className="flex items-start justify-between">
                         <div>
                           <p className="text-xs text-gray-600 mb-1">Inside Buffer</p>
                           <p className="text-xl font-bold text-green-600">{bufferAnalysis.ordersInsideBuffer}</p>
                           <p className="text-xs text-green-600 font-semibold">{bufferAnalysis.percentageInside.toFixed(1)}%</p>
                           <p className="text-xs text-gray-500 mt-1">Loyal Customers</p>
                         </div>
                         <Eye className="w-4 h-4 text-green-600 mt-1" />
                       </div>
                     </div>
                     <div className="bg-white p-3 rounded border border-orange-200 cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleViewOrders("outside", bufferAnalysis.ordersOutsideList)}>
                       <div className="flex items-start justify-between">
                         <div>
                           <p className="text-xs text-gray-600 mb-1">Outside Buffer</p>
                           <p className="text-xl font-bold text-orange-600">{bufferAnalysis.ordersOutsideBuffer}</p>
                           <p className="text-xs text-orange-600 font-semibold">{bufferAnalysis.percentageOutside.toFixed(1)}%</p>
                           <p className="text-xs text-gray-500 mt-1">Growth Potential</p>
                         </div>
                         <Eye className="w-4 h-4 text-orange-600 mt-1" />
                       </div>
                     </div>
                    <div className="bg-white p-3 rounded border border-blue-200">
                      <p className="text-xs text-gray-600 mb-1">Total Orders</p>
                      <p className="text-xl font-bold text-blue-600">{bufferAnalysis.totalOrders}</p>
                      <p className="text-xs text-blue-600 font-semibold">100%</p>
                      <p className="text-xs text-gray-500 mt-1">Analyzed</p>
                    </div>
                  </div>
                  
                  <div className="bg-white p-3 rounded border border-blue-100">
                    <p className="text-xs text-gray-600 mb-2">Analysis Summary</p>
                    <p className="text-sm text-gray-700">
                      {bufferAnalysis.percentageInside.toFixed(1)}% of your orders are within the {bufferAnalysis.bufferRadiusKm.toFixed(1)} km buffer of the selected {bufferAnalysis.selectedCompetitorsCount} competitor{bufferAnalysis.selectedCompetitorsCount !== 1 ? 's' : ''}, indicating customer loyalty in these areas. The remaining {bufferAnalysis.percentageOutside.toFixed(1)}% represent growth opportunities outside competitor zones.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-white p-4 rounded border border-yellow-200">
                  <p className="text-sm text-gray-600">Select competitors from the GIS map to analyze their buffer zones and see which orders fall inside vs outside their delivery areas.</p>
                </div>
              )}
            </div>
            
            {/* Top Growth Zones Section */}
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-900">Top Growth Zones</h4>
              {data?.topGrowthZones && data.topGrowthZones.length > 0 ? (
                <div className="space-y-2">
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
                          <p className="font-semibold">{(zone.avgDeliveryTime || 0).toFixed(1)}m</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No data available</p>
              )}
            </div>
          </div>
        );

      default:
        return <div className="text-gray-500">No data available</div>;
    }
  };

  const getOrdersInsideBuffer = () => {
    const allOrders: any[] = [];
    if (data?.gridCells) {
      Object.values(data.gridCells).forEach((cell: any) => {
        if (cell.orders && Array.isArray(cell.orders)) {
          allOrders.push(...cell.orders);
        }
      });
    }
    const selectedCompetitorsForAnalysis = getSelectedVisibleCompetitors();
    const bufferAnalysis = analyzeCompetitorBuffers(
      allOrders,
      selectedCompetitorsForAnalysis,
      bufferRadiusKm
    );
    return bufferAnalysis.ordersInsideList || [];
  };

  const getOrdersOutsideBuffer = () => {
    const allOrders: any[] = [];
    if (data?.gridCells) {
      Object.values(data.gridCells).forEach((cell: any) => {
        if (cell.orders && Array.isArray(cell.orders)) {
          allOrders.push(...cell.orders);
        }
      });
    }
    const selectedCompetitorsForAnalysis = getSelectedVisibleCompetitors();
    const bufferAnalysis = analyzeCompetitorBuffers(
      allOrders,
      selectedCompetitorsForAnalysis,
      bufferRadiusKm
    );
    return bufferAnalysis.ordersOutsideList || [];
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
        <div className="flex gap-2 mb-4">
          <Button
            variant={activeView === "gis" ? "default" : "outline"}
            onClick={() => setActiveView("gis")}
            className="flex items-center gap-2"
          >
            <MapIcon className="h-4 w-4" />
            GIS Map
          </Button>
          <Button
            variant={activeView === "chart" ? "default" : "outline"}
            onClick={() => setActiveView("chart")}
            className="flex items-center gap-2"
          >
            <BarChart3 className="h-4 w-4" />
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
        
        <OrderDetailsModal
          isOpen={showOrdersModal}
          onClose={() => setShowOrdersModal(false)}
          title={selectedOrdersType === "inside" ? "Orders Inside Competitor Buffer" : "Orders Outside Competitor Buffer"}
          orders={selectedOrders}
          type={selectedOrdersType}
        />
      </DialogContent>
    </Dialog>
  );
}