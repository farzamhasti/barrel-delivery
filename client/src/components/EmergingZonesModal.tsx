'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { EmergingZonesMapOSM } from './EmergingZonesMapOSM';
import { trpc } from '@/lib/trpc';
// SpatialZone type is inferred from tRPC response
type SpatialZone = {
  hexId: string;
  latitude: number;
  longitude: number;
  previousDensity: number;
  currentDensity: number;
  densityChange: number;
  growthPercentage: number;
  classification: 'Strong Growth' | 'Moderate Growth' | 'Stable' | 'Decline' | 'Rapid Shift';
  hotspotMovementDirection?: string;
  clusterStatus: 'new' | 'growing' | 'stable' | 'shrinking' | 'disappearing';
  orderCount: number;
  orderLocations: Array<{ lat: number; lon: number; orderId: string }>;
};

interface EmergingZonesModalProps {
  isOpen: boolean;
  onClose: () => void;
  dateRange?: { startDate: Date; endDate: Date };
  areaFilter?: string;
}

export function EmergingZonesModal({ isOpen, onClose }: EmergingZonesModalProps) {
  const [selectedZone, setSelectedZone] = useState<SpatialZone | null>(null);
  const [startDate, setStartDate] = useState(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const contentRef = useRef<HTMLDivElement>(null);

  const { data: spatialData, isLoading } = trpc.analytics.analyzeSpatialDemandShift.useQuery(
    {
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    },
    { enabled: isOpen }
  );

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const getClassificationColor = (classification: string) => {
    const colors: Record<string, { bg: string; text: string; border: string; badge: string }> = {
      'Strong Growth': { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', badge: 'bg-green-100 text-green-800' },
      'Moderate Growth': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', badge: 'bg-blue-100 text-blue-800' },
      'Stable': { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200', badge: 'bg-gray-100 text-gray-800' },
      'Decline': { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', badge: 'bg-orange-100 text-orange-800' },
      'Rapid Shift': { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', badge: 'bg-red-100 text-red-800' },
    };
    return colors[classification] || colors['Stable'];
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose}>
      <div
        ref={contentRef}
        className="fixed bg-white rounded-lg shadow-2xl overflow-hidden flex flex-col"
        style={{
          width: '95vw',
          height: '95vh',
          left: '50%',
          top: '50%',
          transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px))`,
          transition: isDragging ? 'none' : 'transform 0.2s ease-out',
        }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Draggable */}
        <div
          className="flex-shrink-0 border-b px-6 py-4 cursor-move hover:bg-gray-50 transition-colors flex items-center justify-between"
          onMouseDown={handleMouseDown}
        >
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900">Spatial-Temporal Geographic Demand Shift Analysis</h2>
            <p className="text-sm text-gray-600 mt-1">Visualize delivery demand intensity across residential areas</p>
          </div>
          <div className="flex gap-2 ml-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="hover:bg-gray-200"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden flex gap-6 p-6">
          {/* Left: Map Section (70%) */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Date Range Controls */}
            <div className="flex gap-4 mb-4 items-center">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Analysis Period</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
                <span className="text-gray-500">to</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
            </div>

            {/* Map */}
            <div className="flex-1 border border-gray-300 rounded-lg overflow-hidden bg-gray-100">
              {isLoading ? (
                <div className="w-full h-full flex items-center justify-center">
                  <p className="text-gray-500">Loading spatial analysis...</p>
                </div>
              ) : spatialData?.zones && spatialData.zones.length > 0 ? (
                <EmergingZonesMapOSM zones={spatialData.zones} />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <p className="text-gray-500">No spatial data available</p>
                </div>
              )}
            </div>
          </div>

          {/* Right: Sidebar (30%) */}
          <div className="w-80 flex flex-col gap-4 overflow-y-auto">
            {/* Map Legend */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Map Legend</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <h4 className="text-xs font-semibold text-gray-700 mb-2">Zone Classification</h4>
                  <div className="space-y-1 text-xs">
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
                </div>

                <div className="border-t pt-3">
                  <h4 className="text-xs font-semibold text-gray-700 mb-2">Competitors</h4>
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-red-600"></div>
                      <span>Restaurant</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-orange-600"></div>
                      <span>Cafe</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                      <span>Fast Food</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-purple-600"></div>
                      <span>Pizza</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Spatial Zones */}
            {spatialData?.zones && spatialData.zones.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Spatial Zones ({spatialData.zones.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {spatialData.zones.map((zone, idx) => {
                      const colors = getClassificationColor(zone.classification);
                      return (
                        <button
                          key={idx}
                          onClick={() => setSelectedZone(zone)}
                          className={`w-full text-left p-3 rounded-lg border transition-all ${
                            selectedZone?.hexId === zone.hexId
                              ? `${colors.bg} ${colors.border} border-2`
                              : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                          }`}
                        >
                          <div className="font-semibold text-gray-800">Zone {idx + 1}</div>
                          <Badge className={`text-xs mt-1 ${colors.badge}`}>{zone.classification}</Badge>
                          <div className="text-gray-600 mt-1 text-xs">Growth: {zone.growthPercentage.toFixed(1)}%</div>
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Zone Details */}
            {selectedZone && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Zone Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div>
                    <span className="text-gray-600">Status</span>
                    <p className="font-semibold">{selectedZone.clusterStatus}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-gray-600">Orders</span>
                      <p className="font-semibold">{selectedZone.orderCount}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Prev Density</span>
                      <p className="font-semibold">{selectedZone.previousDensity}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-gray-600">Curr Density</span>
                      <p className="font-semibold">{selectedZone.currentDensity}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Density Change</span>
                      <p className="font-semibold">{selectedZone.densityChange.toFixed(1)}</p>
                    </div>
                  </div>
                  <div className="pt-2 border-t">
                    <span className="text-gray-600">Growth Rate</span>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full ${
                            selectedZone.growthPercentage > 0 ? 'bg-green-500' : 'bg-red-500'
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

            {/* Spatial Analysis Summary */}
            {spatialData?.spatialInterpretation && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Spatial Analysis Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-gray-700 leading-relaxed">{spatialData.spatialInterpretation}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
