import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, AlertCircle, ArrowUpRight, ArrowDownLeft, Minimize2, X } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useState, useEffect, useRef } from "react";
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
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const contentRef = useRef<HTMLDivElement>(null);

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

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

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
      <DialogContent
        ref={contentRef}
        className={`overflow-hidden flex flex-col fixed inset-0 max-w-none max-h-none rounded-none p-0`}
        style={{
          transform: `translate(${position.x}px, ${position.y}px)`,
          transition: isDragging ? 'none' : 'transform 0.2s ease-out',
        }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Header - Draggable */}
        <DialogHeader
          className={`flex-shrink-0 border-b px-6 py-4 cursor-move hover:bg-gray-50 transition-colors`}
          onMouseDown={handleMouseDown}
        >
          <div className="flex items-center justify-between select-none">
            <div>
              <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                <MapPin className="w-5 h-5 text-blue-600" />
                Spatial-Temporal Geographic Demand Shift Analysis
              </DialogTitle>
              <p className="text-xs text-gray-600 mt-0.5">Visualize delivery demand intensity across residential areas</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsFullScreen(!isFullScreen);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
                title="Exit full-screen"
              >
                <Minimize2 className="w-5 h-5" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
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
            <div className="flex items-center justify-center w-full">
              <div className="text-center">
                <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No spatial demand patterns detected for this period</p>
              </div>
            </div>
          ) : (
            <>
              {/* Left: Map (70%) */}
              <div className="flex-[2] overflow-hidden rounded-lg border border-gray-200">
                <EmergingZonesMapOSM zones={zones} />
              </div>

              {/* Right: Sidebar (30%) */}
              <div className="flex-1 flex flex-col gap-4 overflow-hidden">
                {/* Legend */}
                <Card className="flex-shrink-0">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Map Legend</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-xs">
                    <div className="space-y-1">
                      <p className="font-semibold text-gray-700">Zone Classification</p>
                      <div className="space-y-1 ml-2">
                        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-green-500"></div><span>Strong Growth</span></div>
                        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-lime-500"></div><span>Moderate Growth</span></div>
                        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-yellow-500"></div><span>Stable</span></div>
                        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-orange-500"></div><span>Decline</span></div>
                        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500"></div><span>Rapid Shift</span></div>
                      </div>
                    </div>
                    <div className="space-y-1 pt-2 border-t">
                      <p className="font-semibold text-gray-700">Competitors</p>
                      <div className="space-y-1 ml-2">
                        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-600"></div><span>Restaurant</span></div>
                        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-orange-600"></div><span>Cafe</span></div>
                        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-600"></div><span>Fast Food</span></div>
                        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-700"></div><span>Pizza</span></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Zones List */}
                <Card className="flex-1 overflow-hidden flex flex-col">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Spatial Zones ({zones.length})</CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1 overflow-y-auto space-y-2">
                    {zones.map((zone, idx) => (
                      <div
                        key={idx}
                        onClick={() => setSelectedZoneIndex(idx)}
                        className={`p-2 rounded-lg cursor-pointer transition-all text-xs ${
                          idx === selectedZoneIndex
                            ? `${colors.bg} ${colors.border} border-2`
                            : "bg-gray-50 border border-gray-200 hover:bg-gray-100"
                        }`}
                      >
                        <div className="font-semibold text-gray-800">Zone {idx + 1}</div>
                        <Badge className={`text-xs mt-1 ${colors.badge}`}>{zone.classification}</Badge>
                        <div className="text-gray-600 mt-1">Growth: {zone.growthPercentage.toFixed(1)}%</div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Selected Zone Details */}
                {selectedZone && (
                  <Card className="flex-shrink-0">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Zone {selectedZoneIndex + 1} Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-xs">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-gray-600">Status</span>
                          <p className="font-semibold">{getClusterStatusLabel(selectedZone.clusterStatus)}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Orders</span>
                          <p className="font-semibold">{selectedZone.orderCount}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Prev Density</span>
                          <p className="font-semibold">{selectedZone.previousDensity}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Curr Density</span>
                          <p className="font-semibold">{selectedZone.currentDensity}</p>
                        </div>
                      </div>
                      <div className="pt-2 border-t">
                        <span className="text-gray-600">Growth Rate</span>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-full ${
                                selectedZone.growthPercentage > 0 ? "bg-green-500" : "bg-red-500"
                              }`}
                              style={{ width: `${Math.min(Math.abs(selectedZone.growthPercentage) / 100, 1) * 100}%` }}
                            ></div>
                          </div>
                          <span className="font-semibold">{selectedZone.growthPercentage.toFixed(1)}%</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </>
          )}
        </div>

        {/* Bottom: Spatial Interpretation */}
        {spatialData?.spatialInterpretation && (
          <div className="flex-shrink-0 border-t px-6 py-4 bg-blue-50 max-h-24 overflow-y-auto">
            <p className="text-xs text-blue-800"><strong>Spatial Analysis Summary:</strong> {spatialData.spatialInterpretation}</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
