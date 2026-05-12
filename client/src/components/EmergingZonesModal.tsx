import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, TrendingUp, TrendingDown, AlertCircle, ArrowUpRight, ArrowDownLeft, Layers } from "lucide-react";
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

  const getClusterStatusIcon = (status: string) => {
    switch (status) {
      case "new":
        return "🆕";
      case "growing":
        return "📈";
      case "stable":
        return "➡️";
      case "shrinking":
        return "📉";
      case "disappearing":
        return "❌";
      default:
        return "•";
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
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-blue-600" />
            Spatial-Temporal Geographic Demand Shift Analysis
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-gray-600">Analyzing spatial demand patterns...</p>
            </div>
          </div>
        ) : !zones || zones.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No spatial demand patterns detected for this period</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Map Section */}
            <div className="lg:col-span-2">
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Layers className="w-4 h-4" />
                    Geographic Demand Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-96 rounded-lg overflow-hidden border border-gray-200">
                    <EmergingZonesMapOSM zones={zones} selectedZoneIndex={selectedZoneIndex} />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Zones List and Details */}
            <div className="space-y-4">
              {/* Zone List */}
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-sm">Spatial Zones ({zones.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {zones.map((zone, idx) => (
                      <button
                        key={zone.hexId}
                        onClick={() => setSelectedZoneIndex(idx)}
                        className={`w-full text-left p-2 rounded-lg border-2 transition-all ${
                          selectedZoneIndex === idx
                            ? `${getClassificationColor(zone.classification).border} ${getClassificationColor(zone.classification).bg}`
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold">Zone {idx + 1}</span>
                          <Badge className={getClassificationColor(zone.classification).badge}>{zone.classification}</Badge>
                        </div>
                        <p className="text-xs text-gray-600 mt-1">
                          Growth: {zone.growthPercentage > 0 ? '+' : ''}{zone.growthPercentage.toFixed(1)}%
                        </p>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Selected Zone Details */}
              {selectedZone && (
                <>
                  {/* Classification Card */}
                  <Card className={`border-2 ${selectedZone ? getClassificationColor(selectedZone.classification).border : ''} ${selectedZone ? getClassificationColor(selectedZone.classification).bg : ''}`}>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        {selectedZone.growthPercentage > 0 ? (
                          <ArrowUpRight className="w-4 h-4" />
                        ) : (
                          <ArrowDownLeft className="w-4 h-4" />
                        )}
                        {selectedZone.classification}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <p className="text-xs text-gray-600">Cluster Status</p>
                        <p className="text-sm font-semibold">
                          {getClusterStatusIcon(selectedZone.clusterStatus)} {getClusterStatusLabel(selectedZone.clusterStatus)}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <p className="text-gray-600">Previous Density</p>
                          <p className="font-semibold">{selectedZone.previousDensity}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Current Density</p>
                          <p className="font-semibold">{selectedZone.currentDensity}</p>
                        </div>
                      </div>

                      <div>
                        <p className="text-gray-600">Spatial Growth Rate</p>
                        <div className="flex items-center gap-2 mt-1">
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
                          <span className="text-xs font-semibold">
                            {selectedZone.growthPercentage > 0 ? '+' : ''}{selectedZone.growthPercentage.toFixed(1)}%
                          </span>
                        </div>
                      </div>

                      <div>
                        <p className="text-gray-600">Orders in Zone</p>
                        <p className="font-semibold">{selectedZone.orderCount}</p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Spatial Metrics */}
                  <Card className="border-0 shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-sm">Spatial Metrics</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Density Change</span>
                        <span className="font-semibold">{selectedZone.densityChange > 0 ? '+' : ''}{selectedZone.densityChange}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Hotspot Movement</span>
                        <span className="font-semibold">{selectedZone.hotspotMovementDirection || 'Stable'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Hex ID</span>
                        <span className="font-mono text-xs truncate">{selectedZone.hexId}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Center Coordinates</span>
                        <span className="font-mono text-xs">
                          {selectedZone.latitude.toFixed(4)}, {selectedZone.longitude.toFixed(4)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          </div>
        )}

        {/* Spatial Interpretation */}
        {!isLoading && spatialData?.spatialInterpretation && (
          <Card className="bg-blue-50 border-blue-200 mt-4">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Spatial Analysis Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-blue-900">{spatialData.spatialInterpretation}</p>
            </CardContent>
          </Card>
        )}

        {/* Temporal Snapshots */}
        {!isLoading && spatialData?.temporalSnapshots && spatialData.temporalSnapshots.length > 0 && (
          <Card className="border-0 shadow-sm mt-4">
            <CardHeader>
              <CardTitle className="text-sm">Temporal Density Evolution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {spatialData.temporalSnapshots.map((snapshot, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs p-2 bg-gray-50 rounded">
                    <span className="font-medium">{snapshot.period}</span>
                    <div className="flex gap-4">
                      <span>Orders: {snapshot.density}</span>
                      <span>Hotspots: {snapshot.hotspotCount}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </DialogContent>
    </Dialog>
  );
}
