import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, AlertCircle, ArrowUpRight, ArrowDownLeft, Maximize2, Minimize2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useState, useEffect } from "react";
import { EmergingZonesMapOSM } from "./EmergingZonesMapOSM";

interface EmergingZonesModalProps {
  isOpen: boolean;
  onClose: () => void;
  dateRange: { startDate: Date; endDate: Date };
  areaFilter?: string;
}

export function EmergingZonesModal({
  isOpen,
  onClose,
  dateRange,
  areaFilter,
}: EmergingZonesModalProps) {
  const [selectedZoneIndex, setSelectedZoneIndex] = useState(0);
  const [isFullScreen, setIsFullScreen] = useState(false);

  const { data: spatialData, isLoading } = trpc.analytics.analyzeSpatialDemandShift.useQuery(
    {
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      areaFilter: areaFilter,
    },
    { enabled: isOpen }
  );

  useEffect(() => {
    setSelectedZoneIndex(0);
  }, [spatialData]);

  const zones = spatialData?.zones || [];
  const selectedZone = zones[selectedZoneIndex];

  const getClassificationColor = (classification: string) => {
    switch (classification) {
      case "Strong Growth":
        return { bg: "bg-green-50", text: "text-green-700", border: "border-green-200", badge: "bg-green-100 text-green-800" };
      case "Moderate Growth":
        return { bg: "bg-lime-50", text: "text-lime-700", border: "border-lime-200", badge: "bg-lime-100 text-lime-800" };
      case "Stable":
        return { bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-200", badge: "bg-yellow-100 text-yellow-800" };
      case "Decline":
        return { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200", badge: "bg-orange-100 text-orange-800" };
      case "Rapid Shift":
        return { bg: "bg-red-50", text: "text-red-700", border: "border-red-200", badge: "bg-red-100 text-red-800" };
      default:
        return { bg: "bg-gray-50", text: "text-gray-700", border: "border-gray-200", badge: "bg-gray-100 text-gray-800" };
    }
  };

  const getClusterStatusLabel = (status: string) => {
    switch (status) {
      case "new":
        return "New Cluster Formation";
      case "growing":
        return "Cluster Expanding";
      case "stable":
        return "Stable Cluster";
      case "shrinking":
        return "Cluster Shrinking";
      case "disappearing":
        return "Cluster Disappearing";
      default:
        return "Unknown Status";
    }
  };

  const colors = selectedZone ? getClassificationColor(selectedZone.classification) : { bg: '', text: '', border: '', badge: '' };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`overflow-hidden flex flex-col ${
        isFullScreen 
          ? "fixed inset-0 max-w-none max-h-none rounded-none p-0" 
          : "max-w-[95vw] max-h-[92vh]"
      }`}>
        {/* Header */}
        <DialogHeader className={`flex-shrink-0 border-b ${isFullScreen ? "px-6 py-4" : ""}`}>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2 text-2xl font-bold">
                <MapPin className="w-6 h-6 text-blue-600" />
                Spatial-Temporal Geographic Demand Shift Analysis
              </DialogTitle>
              <p className="text-sm text-gray-600 mt-1">Visualize delivery demand intensity across residential areas</p>
            </div>
            <button
              onClick={() => setIsFullScreen(!isFullScreen)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
              title={isFullScreen ? "Exit full-screen" : "Enter full-screen"}
            >
              {isFullScreen ? (
                <Minimize2 className="w-5 h-5" />
              ) : (
                <Maximize2 className="w-5 h-5" />
              )}
            </button>
          </div>
        </DialogHeader>

        {/* Main Content */}
        <div className={`flex-1 overflow-hidden flex flex-col ${isFullScreen ? "px-6 pb-6" : ""}`}>
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
                <p className="text-gray-600">Analyzing spatial demand patterns...</p>
              </div>
            </div>
          ) : !zones || zones.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No spatial demand patterns detected for this period</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col h-full gap-4">
              {/* Top Row: Large Map + Right Sidebar */}
              <div className="flex-1 flex gap-4 min-h-0">
                {/* Left: Map (Main Focus) */}
                <div className="flex-1 flex flex-col min-w-0">
                  <Card className="h-full border-0 shadow-sm flex flex-col">
                    <CardHeader className="flex-shrink-0">
                      <CardTitle className="text-base">Delivery Heatmap - Geographic Distribution</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-hidden p-0">
                      <div className="h-full w-full rounded-lg overflow-hidden border border-gray-200">
                        <EmergingZonesMapOSM zones={zones} selectedZoneIndex={selectedZoneIndex} />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Right Sidebar */}
                <div className="w-72 flex flex-col gap-4 overflow-y-auto pr-2">
                  {/* Legend Card */}
                  <Card className="border-0 shadow-sm flex-shrink-0">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-semibold">Map Legend</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-xs">
                      <div className="space-y-2">
                        <p className="font-semibold text-gray-700 mb-2">Zone Classification</p>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-green-500"></div>
                          <span>Strong Growth</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                          <span>Moderate Growth</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-gray-500"></div>
                          <span>Stable</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                          <span>Decline</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-red-500"></div>
                          <span>Rapid Shift</span>
                        </div>
                      </div>

                      <div className="border-t pt-3">
                        <p className="font-semibold text-gray-700 mb-2">Competitor Types</p>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full bg-red-600"></div>
                            <span>Restaurant</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full bg-orange-500"></div>
                            <span>Cafe</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full bg-blue-600"></div>
                            <span>Fast Food</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                            <span>Pizza</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Zones List */}
                  <Card className="border-0 shadow-sm flex-1 flex flex-col overflow-hidden">
                    <CardHeader className="pb-3 flex-shrink-0">
                      <CardTitle className="text-sm font-semibold">Spatial Zones ({zones.length})</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-y-auto space-y-2 pr-2">
                      {zones.map((zone, idx) => (
                        <button
                          key={zone.hexId}
                          onClick={() => setSelectedZoneIndex(idx)}
                          className={`w-full text-left p-2.5 rounded-lg border-2 transition-all text-xs ${
                            selectedZoneIndex === idx
                              ? `${getClassificationColor(zone.classification).border} ${getClassificationColor(zone.classification).bg}`
                              : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold">Zone {idx + 1}</span>
                            <Badge className={`text-xs px-1.5 py-0.5 ${getClassificationColor(zone.classification).badge}`}>
                              {zone.classification}
                            </Badge>
                          </div>
                          <p className="text-gray-600">
                            Growth: {zone.growthPercentage > 0 ? '+' : ''}{zone.growthPercentage.toFixed(1)}%
                          </p>
                        </button>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Bottom Row: Zone Details + Spatial Interpretation */}
              <div className="flex gap-4 h-48 flex-shrink-0">
                {/* Zone Details */}
                {selectedZone && (
                  <Card className={`flex-1 border-2 ${getClassificationColor(selectedZone.classification).border} ${getClassificationColor(selectedZone.classification).bg}`}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        {selectedZone.growthPercentage > 0 ? (
                          <ArrowUpRight className="w-4 h-4 text-green-600" />
                        ) : (
                          <ArrowDownLeft className="w-4 h-4 text-red-600" />
                        )}
                        Zone {selectedZoneIndex + 1}: {selectedZone.classification}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-xs">
                      <div className="grid grid-cols-4 gap-3">
                        <div>
                          <p className="text-gray-600 mb-0.5">Cluster Status</p>
                          <p className="font-semibold text-sm">{getClusterStatusLabel(selectedZone.clusterStatus)}</p>
                        </div>
                        <div>
                          <p className="text-gray-600 mb-0.5">Previous Density</p>
                          <p className="font-semibold text-sm">{selectedZone.previousDensity}</p>
                        </div>
                        <div>
                          <p className="text-gray-600 mb-0.5">Current Density</p>
                          <p className="font-semibold text-sm">{selectedZone.currentDensity}</p>
                        </div>
                        <div>
                          <p className="text-gray-600 mb-0.5">Orders</p>
                          <p className="font-semibold text-sm">{selectedZone.orderCount}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-gray-600 mb-1">Growth Rate</p>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                selectedZone.growthPercentage > 0 ? "bg-green-500" : "bg-red-500"
                              }`}
                              style={{
                                width: `${Math.min(Math.abs(selectedZone.growthPercentage), 100)}%`,
                              }}
                            ></div>
                          </div>
                          <span className="font-semibold text-xs whitespace-nowrap">
                            {selectedZone.growthPercentage > 0 ? '+' : ''}{selectedZone.growthPercentage.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Spatial Interpretation */}
                {!isLoading && spatialData?.spatialInterpretation && (
                  <Card className="flex-1 bg-blue-50 border-blue-200 border-2">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        Spatial Analysis Summary
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-blue-900 line-clamp-4">{spatialData.spatialInterpretation}</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
