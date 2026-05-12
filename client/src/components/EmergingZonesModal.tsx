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
  const [isFullScreen, setIsFullScreen] = useState(true);

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
        return "New Cluster";
      case "growing":
        return "Expanding";
      case "stable":
        return "Stable";
      case "shrinking":
        return "Shrinking";
      case "disappearing":
        return "Disappearing";
      default:
        return "Unknown";
    }
  };

  const colors = selectedZone ? getClassificationColor(selectedZone.classification) : { bg: '', text: '', border: '', badge: '' };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
       <DialogContent className={`overflow-hidden flex flex-col fixed inset-0 max-w-none max-h-none rounded-none p-0`}>
        {/* Header */}
        <DialogHeader className={`flex-shrink-0 border-b px-6 py-4`}>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                <MapPin className="w-5 h-5 text-blue-600" />
                Spatial-Temporal Geographic Demand Shift Analysis
              </DialogTitle>
              <p className="text-xs text-gray-600 mt-0.5">Visualize delivery demand intensity across residential areas</p>
            </div>
            <button
              onClick={() => setIsFullScreen(!isFullScreen)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
              title="Exit full-screen"
            >
              <Minimize2 className="w-5 h-5" />
            </button>
          </div>
        </DialogHeader>

        {/* Main Content - Landscape Layout */}
        <div className={`flex-1 overflow-hidden flex gap-4 px-6 pb-6`}>
          {isLoading ? (
            <div className="flex items-center justify-center w-full">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
                <p className="text-gray-600">Analyzing spatial demand patterns...</p>
              </div>
            </div>
          ) : !zones || zones.length === 0 ? (
            <div className="flex items-center justify-center w-full text-gray-500">
              <div className="text-center">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No spatial demand patterns detected for this period</p>
              </div>
            </div>
          ) : (
            <>
              {/* Left: Large Heatmap */}
              <div className="flex-1 flex flex-col min-w-0">
                <Card className="h-full border-0 shadow-sm flex flex-col">
                  <CardHeader className="flex-shrink-0 pb-2">
                    <CardTitle className="text-sm">Delivery Heatmap - Geographic Distribution</CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1 overflow-hidden p-0">
                    <div className="h-full w-full rounded-lg overflow-hidden border border-gray-200">
                      <EmergingZonesMapOSM zones={zones} selectedZoneIndex={selectedZoneIndex} />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right Sidebar - All Controls and Information */}
              <div className="w-80 flex flex-col gap-3 overflow-y-auto pr-1">
                {/* Legend */}
                <Card className="border-0 shadow-sm flex-shrink-0">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-semibold">Map Legend</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-xs">
                    <div className="space-y-1.5">
                      <p className="font-semibold text-gray-700 text-xs">Zone Classification</p>
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-green-500 flex-shrink-0"></div>
                        <span className="text-xs">Strong Growth</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-blue-500 flex-shrink-0"></div>
                        <span className="text-xs">Moderate Growth</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-gray-500 flex-shrink-0"></div>
                        <span className="text-xs">Stable</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-orange-500 flex-shrink-0"></div>
                        <span className="text-xs">Decline</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500 flex-shrink-0"></div>
                        <span className="text-xs">Rapid Shift</span>
                      </div>
                    </div>

                    <div className="border-t pt-2">
                      <p className="font-semibold text-gray-700 text-xs mb-1">Competitors</p>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-red-600 flex-shrink-0"></div>
                          <span className="text-xs">Restaurant</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-orange-500 flex-shrink-0"></div>
                          <span className="text-xs">Cafe</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-blue-600 flex-shrink-0"></div>
                          <span className="text-xs">Fast Food</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0"></div>
                          <span className="text-xs">Pizza</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Zones List */}
                <Card className="border-0 shadow-sm flex-1 flex flex-col overflow-hidden">
                  <CardHeader className="pb-2 flex-shrink-0">
                    <CardTitle className="text-xs font-semibold">Spatial Zones ({zones.length})</CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                    {zones.map((zone, idx) => (
                      <button
                        key={zone.hexId}
                        onClick={() => setSelectedZoneIndex(idx)}
                        className={`w-full text-left p-2 rounded-lg border-2 transition-all text-xs ${
                          selectedZoneIndex === idx
                            ? `${getClassificationColor(zone.classification).border} ${getClassificationColor(zone.classification).bg}`
                            : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="font-semibold text-xs">Zone {idx + 1}</span>
                          <Badge className={`text-xs px-1 py-0 h-5 ${getClassificationColor(zone.classification).badge}`}>
                            {zone.classification}
                          </Badge>
                        </div>
                        <p className="text-gray-600 text-xs">
                          Growth: {zone.growthPercentage > 0 ? '+' : ''}{zone.growthPercentage.toFixed(1)}%
                        </p>
                      </button>
                    ))}
                  </CardContent>
                </Card>

                {/* Selected Zone Details */}
                {selectedZone && (
                  <Card className={`border-2 flex-shrink-0 ${getClassificationColor(selectedZone.classification).border} ${getClassificationColor(selectedZone.classification).bg}`}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs flex items-center gap-1">
                        {selectedZone.growthPercentage > 0 ? (
                          <ArrowUpRight className="w-3 h-3 text-green-600" />
                        ) : (
                          <ArrowDownLeft className="w-3 h-3 text-red-600" />
                        )}
                        Zone {selectedZoneIndex + 1} Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-xs">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <p className="text-gray-600 text-xs mb-0.5">Status</p>
                          <p className="font-semibold text-xs">{getClusterStatusLabel(selectedZone.clusterStatus)}</p>
                        </div>
                        <div>
                          <p className="text-gray-600 text-xs mb-0.5">Orders</p>
                          <p className="font-semibold text-xs">{selectedZone.orderCount}</p>
                        </div>
                        <div>
                          <p className="text-gray-600 text-xs mb-0.5">Prev Density</p>
                          <p className="font-semibold text-xs">{selectedZone.previousDensity}</p>
                        </div>
                        <div>
                          <p className="text-gray-600 text-xs mb-0.5">Curr Density</p>
                          <p className="font-semibold text-xs">{selectedZone.currentDensity}</p>
                        </div>
                      </div>

                      <div>
                        <p className="text-gray-600 text-xs mb-1">Growth Rate</p>
                        <div className="flex items-center gap-1.5">
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
                  <Card className="bg-blue-50 border-blue-200 border-2 flex-shrink-0">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Analysis Summary
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-blue-900 line-clamp-5">{spatialData.spatialInterpretation}</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
