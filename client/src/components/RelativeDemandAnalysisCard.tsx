'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, ChevronLeft, ChevronRight, MapPin } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface RelativeDemandRegion {
  id: string;
  centerLat: number;
  centerLon: number;
  orderCount: number;
  avgDeliveryTime: number;
  avgWaitingTime: number;
  relativeDemandScore: number;
  relativeDeliveryPerformance: number;
  relativeWaitingTime: number;
  relativeOperationalIntensity: number;
  classification: 'very_high' | 'high' | 'average' | 'weak' | 'underperforming';
  color: string;
}

interface CityWideStats {
  totalOrders: number;
  avgOrderDensity: number;
  avgDeliveryTime: number;
  avgWaitingTime: number;
  avgOperationalIntensity: number;
}

interface RelativeDemandAnalysisCardProps {
  isCompact?: boolean;
  onOpenExpanded?: () => void;
  dateRangeQuery?: { startDate: Date; endDate: Date };
}

// Fort Erie boundary polygon coordinates
const FORT_ERIE_BOUNDARY = [
  [42.8765244, -78.999892],
  [42.8919223, -78.9996819],
  [42.9036221, -79.0009428],
  [42.9042378, -79.0055659],
  [42.9287076, -79.0089282],
  [42.9557824, -79.0097688],
  [42.9667012, -79.0154427],
  [42.9755716, -79.0166213],
  [42.9741848, -79.0087238],
  [42.9723357, -79.0005104],
  [42.9690161, -78.9858657],
  [42.9652306, -78.9793129],
  [42.9569016, -78.9768987],
  [42.9518533, -78.9718979],
  [42.9490765, -78.9610341],
  [42.947688, -78.9513773],
  [42.9493289, -78.9482734],
  [42.9497076, -78.9401686],
  [42.9478143, -78.9341331],
  [42.9407454, -78.9243039],
  [42.9360744, -78.9175787],
  [42.9307718, -78.913785],
  [42.9286254, -78.9124055],
  [42.9247111, -78.9125779],
  [42.9149875, -78.9082669],
  [42.9086727, -78.9084393],
  [42.9061465, -78.9099913],
  [42.9041256, -78.9155094],
  [42.9013466, -78.9172338],
  [42.896041, -78.9203378],
  [42.8925037, -78.9218898],
  [42.891114, -78.9218898],
  [42.8889662, -78.9244764],
  [42.8873237, -78.9256835],
  [42.8849231, -78.9296496],
  [42.884165, -78.9339607],
  [42.8836595, -78.9365473],
  [42.8829014, -78.9405135],
  [42.8820169, -78.9486183],
  [42.8808797, -78.95086],
  [42.8837859, -78.9603443],
  [42.8834068, -78.9681042],
  [42.8807533, -78.9703459],
  [42.8794897, -78.9701735],
  [42.8788579, -78.9720703],
  [42.8793633, -78.974657],
  [42.8801215, -78.9781058],
  [42.8791106, -78.9829342],
  [42.879296, -78.9907284],
  [42.8781587, -78.9955568],
  [42.8765244, -78.999892],
] as [number, number][];

const FORT_ERIE_CENTER = [42.9155, -78.9580] as [number, number];

export const RelativeDemandAnalysisCard: React.FC<RelativeDemandAnalysisCardProps> = ({
  isCompact = false,
  onOpenExpanded,
  dateRangeQuery,
}) => {
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [isExpanded, setIsExpanded] = useState(!isCompact);
  const [regions, setRegions] = useState<RelativeDemandRegion[]>([]);
  const [cityStats, setCityStats] = useState<CityWideStats | null>(null);
  const [interpretation, setInterpretation] = useState('');
  const [selectedRegion, setSelectedRegion] = useState<RelativeDemandRegion | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const utils = trpc.useUtils();

  // Calculate date range based on selectedMonth or dateRangeQuery
  const startDate = dateRangeQuery?.startDate || startOfMonth(selectedMonth);
  const endDateObj = dateRangeQuery?.endDate || endOfMonth(selectedMonth);
  const endDate = new Date(endDateObj.getFullYear(), endDateObj.getMonth(), endDateObj.getDate(), 23, 59, 59, 999);

  // Query with proper dependencies - will refetch when startDate or endDate changes
  const { data, isLoading, error } = trpc.analytics.analyzeRelativeDemand.useQuery(
    {
      startDate,
      endDate,
    },
    {
      enabled: isExpanded,
      refetchOnMount: true,
      refetchOnWindowFocus: false,
      staleTime: 0,
    }
  );

  // Refetch when selectedMonth changes
  useEffect(() => {
    if (isExpanded && !dateRangeQuery) {
      utils.analytics.analyzeRelativeDemand.invalidate();
    }
  }, [selectedMonth, isExpanded, dateRangeQuery, utils]);

  // Update regions when data changes
  useEffect(() => {
    if (data?.regions) {
      setRegions(data.regions);
      setCityStats(data.cityWideStats);
      setInterpretation(data.interpretation);
    }
  }, [data, startDate, endDate]);

  const handlePreviousMonth = () => {
    const newMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1);
    setSelectedMonth(newMonth);
    utils.analytics.analyzeRelativeDemand.invalidate();
  };

  const handleNextMonth = () => {
    const nextMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 1);
    if (nextMonth <= new Date()) {
      setSelectedMonth(nextMonth);
      utils.analytics.analyzeRelativeDemand.invalidate();
    }
  };

  const getClassificationLabel = (classification: string) => {
    const labels: Record<string, string> = {
      very_high: 'Very High Demand',
      high: 'High Demand',
      average: 'Average',
      weak: 'Weak Demand',
      underperforming: 'Underperforming',
    };
    return labels[classification] || classification;
  };

  const getClassificationColor = (classification: string): string => {
    switch (classification) {
      case 'very_high':
        return '#1e3a8a'; // Dark blue
      case 'high':
        return '#2563eb'; // Blue
      case 'average':
        return '#eab308'; // Yellow
      case 'weak':
        return '#f97316'; // Orange
      case 'underperforming':
        return '#dc2626'; // Red
      default:
        return '#9ca3af'; // Gray
    }
  };

  // Initialize Leaflet map
  useEffect(() => {
    if (!isExpanded || !containerRef.current || regions.length === 0) return;

    if (!mapRef.current) {
      mapRef.current = L.map(containerRef.current).setView(FORT_ERIE_CENTER, 12);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(mapRef.current);
    }

    const map = mapRef.current;

    // Clear existing layers (except tile layer)
    map.eachLayer((layer) => {
      if (layer instanceof L.Polygon || layer instanceof L.Circle || layer instanceof L.Marker) {
        map.removeLayer(layer);
      }
    });

    // Draw Fort Erie boundary polygon
    const boundaryPolygon = L.polygon(FORT_ERIE_BOUNDARY, {
      color: '#1e40af',
      weight: 2.5,
      opacity: 0.85,
      fillColor: '#93c5fd',
      fillOpacity: 0.05,
    }).addTo(map);

    boundaryPolygon.bindPopup('<div class="text-sm font-semibold">Service Area</div>');

    // Add demand zones as circles
    regions.forEach((region) => {
      const color = getClassificationColor(region.classification);
      const radius = Math.max(150, Math.min(500, region.orderCount * 60));

      const circle = L.circle([region.centerLat, region.centerLon], {
        color: color,
        weight: 2,
        opacity: 0.85,
        fillColor: color,
        fillOpacity: 0.55,
        radius: radius,
      }).addTo(map);

      const popupContent = `
        <div class="p-2 text-sm">
          <p class="font-semibold">${getClassificationLabel(region.classification)}</p>
          <p>Orders: ${region.orderCount}</p>
          <p>Demand Score: ${(Number(region.relativeDemandScore) || 0).toFixed(0)}/100</p>
          <p>Avg Delivery: ${(Number(region.avgDeliveryTime) || 0).toFixed(0)} min</p>
        </div>
      `;

      circle.bindPopup(popupContent);
      circle.on('click', () => {
        setSelectedRegion(region);
      });
    });

    // Fit map to Fort Erie boundary
    const bounds = L.latLngBounds(FORT_ERIE_BOUNDARY);
    map.fitBounds(bounds, { padding: [80, 80] });

    return () => {
      // Cleanup handled by React
    };
  }, [regions, isExpanded]);

  if (isCompact && !isExpanded) {
    return (
      <Card
        className="cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => {
          setIsExpanded(true);
          onOpenExpanded?.();
        }}
      >
        <CardHeader>
          <CardTitle className="text-lg">Relative Demand Analysis</CardTitle>
          <CardDescription>Geographic demand relative to city-wide averages</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {cityStats && (
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <div className="text-gray-600">Total Orders</div>
                  <div className="text-2xl font-bold text-blue-600">{cityStats.totalOrders}</div>
                </div>
                <div>
                  <div className="text-gray-600">Zones Detected</div>
                  <div className="text-2xl font-bold text-purple-600">{regions.length}</div>
                </div>
              </div>
            )}
            <div className="text-xs text-gray-500">Click to expand</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Relative Demand Analysis</CardTitle>
            <CardDescription>Geographic demand relative to city-wide averages</CardDescription>
          </div>
          {isCompact && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(false)}
            >
              ← Back to Grid View
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Month Navigation */}
        <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePreviousMonth}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Previous
          </Button>
          <h3 className="text-lg font-semibold">{format(selectedMonth, 'MMMM yyyy')}</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNextMonth}
            disabled={new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 1) > new Date()}
          >
            Next
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>

        {/* City-wide         {!isCompact && (
            <div className="grid grid-cols-4 gap-3 mb-4">
              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="text-xs text-gray-600 mb-1">Total Orders</div>
                <div className="text-2xl font-bold text-blue-600">{Number(cityStats.totalOrders) || 0}</div>
              </div>
              <div className="bg-green-50 p-3 rounded-lg">
                <div className="text-xs text-gray-600 mb-1">Avg Delivery Time</div>
                <div className="text-2xl font-bold text-green-600">{(Number(cityStats.avgDeliveryTime) || 0).toFixed(0)} min</div>
              </div>
              <div className="bg-orange-50 p-3 rounded-lg">
                <div className="text-xs text-gray-600 mb-1">Avg Waiting Time</div>
                <div className="text-2xl font-bold text-orange-600">{(Number(cityStats.avgWaitingTime) || 0).toFixed(0)} min</div>
              </div>
              <div className="bg-purple-50 p-3 rounded-lg">
                <div className="text-xs text-gray-600 mb-1">Order Density</div>
                <div className="text-2xl font-bold text-purple-600">{(Number(cityStats.avgOrderDensity) || 0).toFixed(1)}/km²</div>
              </div>
            </div>
        )}* Map */}
        {isLoading ? (
          <div className="h-96 flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : regions.length > 0 ? (
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Geographic Demand Distribution</h3>
            <div className="h-96 rounded-lg overflow-hidden border border-gray-200" ref={containerRef} />
          </div>
        ) : (
          <div className="h-96 flex flex-col items-center justify-center bg-gray-50 rounded-lg border border-gray-200">
            <MapPin className="w-12 h-12 text-gray-300 mb-2" />
            <p className="text-gray-500">No delivery data available for {format(selectedMonth, 'MMMM yyyy')}</p>
          </div>
        )}

        {/* Demand Zones */}
        {regions.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Demand Zones ({regions.length})</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {regions.map((region) => (
                <div
                  key={region.id}
                  className="border rounded-lg p-3 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setSelectedRegion(region)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold text-sm">{region.id}</h4>
                    <Badge variant="secondary" className="text-xs">
                      {getClassificationLabel(region.classification)}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <div className="text-gray-600">Orders</div>
                      <div className="font-semibold">{region.orderCount}</div>
                    </div>
                    <div>
                      <div className="text-gray-600">Demand Score</div>
                      <div className="font-semibold">{region.relativeDemandScore.toFixed(0)}/100</div>
                    </div>
                    <div>
                      <div className="text-gray-600">Avg Delivery</div>
                      <div className="font-semibold">{(Number(region.avgDeliveryTime) || 0).toFixed(0)} min</div>
                    </div>
                    <div>
                      <div className="text-gray-600">Delivery Perf</div>
                      <div className="font-semibold">{region.relativeDeliveryPerformance.toFixed(0)}/100</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Spatial Insight */}
        {interpretation && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <h4 className="font-semibold text-sm text-blue-900 mb-1">Spatial Insight</h4>
            <p className="text-sm text-blue-800">{interpretation}</p>
          </div>
        )}

        {/* Selected Region Details */}
        {selectedRegion && (
          <div className="bg-gray-50 border rounded-lg p-4">
            <h4 className="font-semibold text-sm mb-3">{selectedRegion.id} - Detailed Metrics</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-gray-600">Order Count</div>
                <div className="font-semibold">{selectedRegion.orderCount}</div>
              </div>
              <div>
                <div className="text-gray-600">Demand Score</div>
                <div className="font-semibold">{selectedRegion.relativeDemandScore.toFixed(1)}/100</div>
              </div>
              <div>
                <div className="text-gray-600">Delivery Performance</div>
                <div className="font-semibold">{selectedRegion.relativeDeliveryPerformance.toFixed(1)}/100</div>
              </div>
              <div>
                <div className="text-gray-600">Avg Delivery Time</div>
                <div className="font-semibold">{(Number(selectedRegion.avgDeliveryTime) || 0).toFixed(1)} min</div>
              </div>
              <div>
                <div className="text-gray-600">Avg Waiting Time</div>
                <div className="font-semibold">{(Number(selectedRegion.avgWaitingTime) || 0).toFixed(1)} min</div>
              </div>
              <div>
                <div className="text-gray-600">Classification</div>
                <div className="font-semibold">{getClassificationLabel(selectedRegion.classification)}</div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
