'use client';

import { useState, useRef, useEffect } from 'react';
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

export function EmergingZonesModal({ isOpen, onClose, dateRange }: EmergingZonesModalProps) {
  const [selectedZone, setSelectedZone] = useState<SpatialZone | null>(null);
  
  // Initialize with passed dateRange or default to last 7 days
  const getInitialStartDate = () => {
    if (dateRange?.startDate) {
      return dateRange.startDate.toISOString().split('T')[0];
    }
    return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  };
  
  const getInitialEndDate = () => {
    if (dateRange?.endDate) {
      return dateRange.endDate.toISOString().split('T')[0];
    }
    return new Date().toISOString().split('T')[0];
  };
  
  const [startDate, setStartDate] = useState(getInitialStartDate());
  const [endDate, setEndDate] = useState(getInitialEndDate());
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const contentRef = useRef<HTMLDivElement>(null);

  const { data: spatialData, isLoading } = trpc.analytics.analyzeSpatialDemandShift.useQuery(
    {
      startDate: new Date(startDate),
      endDate: (() => {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        return end;
      })(),
    },
    { enabled: isOpen }
  );

  const { data: forecastData, isLoading: isForecastLoading } = trpc.analytics.forecastSpatialDemand.useQuery(
    {
      startDate: new Date(startDate),
      endDate: (() => {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        return end;
      })(),
    },
    { enabled: isOpen && !!spatialData }
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
          <div className="w-80 flex flex-col gap-3 overflow-y-auto pr-2">
            {/* Map Legend */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Map Legend</h3>
              
              <div className="mb-4">
                <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Zone Classification</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-3 h-3 rounded-full bg-green-500 flex-shrink-0"></div>
                    <span className="text-gray-700">Strong Growth</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-3 h-3 rounded-full bg-blue-500 flex-shrink-0"></div>
                    <span className="text-gray-700">Moderate Growth</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-3 h-3 rounded-full bg-gray-500 flex-shrink-0"></div>
                    <span className="text-gray-700">Stable</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-3 h-3 rounded-full bg-orange-500 flex-shrink-0"></div>
                    <span className="text-gray-700">Decline</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-3 h-3 rounded-full bg-red-500 flex-shrink-0"></div>
                    <span className="text-gray-700">Rapid Shift</span>
                  </div>
                </div>
              </div>

              <div className="border-t pt-3">
                <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Competitor Types</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 rounded-full bg-red-600 flex-shrink-0"></div>
                    <span className="text-gray-700">Restaurant</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 rounded-full bg-orange-600 flex-shrink-0"></div>
                    <span className="text-gray-700">Cafe</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 rounded-full bg-blue-600 flex-shrink-0"></div>
                    <span className="text-gray-700">Fast Food</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 rounded-full bg-purple-600 flex-shrink-0"></div>
                    <span className="text-gray-700">Pizza</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Spatial Zones */}
            {spatialData?.zones && spatialData.zones.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Spatial Zones ({spatialData.zones.length})</h3>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {spatialData.zones.map((zone, idx) => {
                    const colors = getClassificationColor(zone.classification);
                    return (
                      <button
                        key={idx}
                        onClick={() => setSelectedZone(zone)}
                        className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                          selectedZone?.hexId === zone.hexId
                            ? `${colors.bg} ${colors.border}`
                            : 'bg-gray-50 border-gray-200 hover:bg-gray-100 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-semibold text-sm text-gray-900">Zone {idx + 1}</div>
                            <Badge className={`text-xs mt-1 ${colors.badge}`}>{zone.classification}</Badge>
                          </div>
                          <div className="text-right">
                            <div className={`text-sm font-semibold ${
                              zone.growthPercentage > 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {zone.growthPercentage > 0 ? '+' : ''}{zone.growthPercentage.toFixed(1)}%
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Zone Details */}
            {selectedZone && (
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Zone Details</h3>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="text-xs text-gray-600 font-medium mb-1">Status</div>
                      <div className="text-sm font-semibold text-gray-900 capitalize">{selectedZone.clusterStatus}</div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="text-xs text-gray-600 font-medium mb-1">Orders</div>
                      <div className="text-sm font-semibold text-gray-900">{selectedZone.orderCount}</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="text-xs text-gray-600 font-medium mb-1">Prev Density</div>
                      <div className="text-sm font-semibold text-gray-900">{selectedZone.previousDensity}</div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="text-xs text-gray-600 font-medium mb-1">Curr Density</div>
                      <div className="text-sm font-semibold text-gray-900">{selectedZone.currentDensity}</div>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="text-xs text-gray-600 font-medium mb-2">Growth Rate</div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full ${
                            selectedZone.growthPercentage > 0 ? 'bg-green-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${Math.min(Math.abs(selectedZone.growthPercentage) / 100, 1) * 100}%` }}
                        ></div>
                      </div>
                      <span className={`text-sm font-semibold ${
                        selectedZone.growthPercentage > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {selectedZone.growthPercentage > 0 ? '+' : ''}{selectedZone.growthPercentage.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Predicted Zones */}
            {forecastData?.forecasts && forecastData.forecasts.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Predicted Zones ({forecastData.forecasts.length})</h3>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {forecastData.forecasts.slice(0, 5).map((forecast: any, idx: number) => {
                    const colors = getClassificationColor(forecast.forecastedClassification);
                    const projectionChange = forecast.projectedDensity30d - forecast.currentDensity;
                    return (
                      <div
                        key={idx}
                        className={`p-3 rounded-lg border-2 ${colors.bg} ${colors.border}`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-semibold text-sm text-gray-900">Predicted Zone {idx + 1}</div>
                            <Badge className={`text-xs mt-1 ${colors.badge}`}>{forecast.forecastedClassification}</Badge>
                            <div className="text-xs text-gray-600 mt-1">Confidence: {(forecast.predictionConfidence * 100).toFixed(0)}%</div>
                          </div>
                          <div className="text-right">
                            <div className={`text-sm font-semibold ${
                              projectionChange > 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {projectionChange > 0 ? '+' : ''}{projectionChange.toFixed(1)}
                            </div>
                            <div className="text-xs text-gray-600">30-day projection</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Forecast Summary */}
            {forecastData?.forecastSummary && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h3 className="font-semibold text-purple-900 mb-2">Demand Forecast Summary</h3>
                <p className="text-sm text-purple-800 leading-relaxed">{forecastData.forecastSummary}</p>
              </div>
            )}

            {/* Spatial Analysis Summary */}
            {spatialData?.spatialInterpretation && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">Spatial Analysis Summary</h3>
                <p className="text-sm text-blue-800 leading-relaxed">{spatialData.spatialInterpretation}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
