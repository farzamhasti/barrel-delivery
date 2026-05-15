'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, ChevronLeft, ChevronRight, MapPin, Download } from 'lucide-react';
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
  const [showRasterGrid, setShowRasterGrid] = useState(false);
  const [isExpanded, setIsExpanded] = useState(!isCompact);
  const [regions, setRegions] = useState<RelativeDemandRegion[]>([]);
  const [cityStats, setCityStats] = useState<CityWideStats | null>(null);
  const [interpretation, setInterpretation] = useState('');
  const [selectedRegion, setSelectedRegion] = useState<RelativeDemandRegion | null>(null);
  const rasterMapRef = useRef<L.Map | null>(null);
  const rasterContainerRef = useRef<HTMLDivElement>(null);
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

  // Fetch raster grid data
  const { data: gridData, isLoading: gridLoading } = trpc.analytics.analyzeBoundaryRaster.useQuery(
    { startDate, endDate },
    { enabled: isExpanded }
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

  // Initialize raster grid map - always show basemap, conditionally render grid cells
  useEffect(() => {
    if (!rasterContainerRef.current) return;

    // Initialize map if not already done
    if (!rasterMapRef.current) {
      rasterMapRef.current = L.map(rasterContainerRef.current).setView(FORT_ERIE_CENTER, 12);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(rasterMapRef.current);
    }

    const map = rasterMapRef.current;

    // Clear existing grid layers (except tile layer)
    map.eachLayer((layer) => {
      if (layer instanceof L.Rectangle || layer instanceof L.Polygon) {
        map.removeLayer(layer);
      }
    });

    // Only draw grid cells if checkbox is enabled and data is available
    if (showRasterGrid && gridData?.cells && gridData.cells.length > 0) {
      gridData.cells.forEach((cell) => {
        const cellSize = 1000; // 1000 meters
        const latStep = cellSize / 111320;
        const lonStep = cellSize / (111320 * Math.cos((cell.lat * Math.PI) / 180));

        const bounds = [
          [cell.lat - latStep / 2, cell.lon - lonStep / 2],
          [cell.lat + latStep / 2, cell.lon + lonStep / 2],
        ] as L.LatLngBoundsExpression;

        const rectangle = L.rectangle(bounds, {
          color: cell.color,
          weight: 1,
          opacity: 0.8,
          fillOpacity: 0.6,
        });

        rectangle.bindPopup(
          `<div class="p-2 text-sm">
            <p class="font-semibold">${cell.id}</p>
            <p>Demand: ${cell.relativeDemand.toFixed(2)}%</p>
            <p>Orders: ${cell.orderCount}</p>
            <p>Classification: ${cell.classification}</p>
          </div>`
        );

        rectangle.addTo(map);
      });

      // Fit map to grid bounds
      const allLats = gridData.cells.map((c) => c.lat);
      const allLons = gridData.cells.map((c) => c.lon);
      const bounds = L.latLngBounds(
        [Math.min(...allLats), Math.min(...allLons)],
        [Math.max(...allLats), Math.max(...allLons)]
      );
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [gridData, showRasterGrid]);

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

        {/* City-wide Stats */}
        {!isCompact && (
            <div className="grid grid-cols-4 gap-3 mb-4">
              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="text-xs text-gray-600 mb-1">Total Orders</div>
                <div className="text-2xl font-bold text-blue-600">{Number(cityStats?.totalOrders) || 0}</div>
              </div>
              <div className="bg-green-50 p-3 rounded-lg">
                <div className="text-xs text-gray-600 mb-1">Avg Delivery Time</div>
                <div className="text-2xl font-bold text-green-600">{(Number(cityStats?.avgDeliveryTime) || 0).toFixed(0)} min</div>
              </div>
              <div className="bg-orange-50 p-3 rounded-lg">
                <div className="text-xs text-gray-600 mb-1">Avg Waiting Time</div>
                <div className="text-2xl font-bold text-orange-600">{(Number(cityStats?.avgWaitingTime) || 0).toFixed(0)} min</div>
              </div>
              <div className="bg-purple-50 p-3 rounded-lg">
                <div className="text-xs text-gray-600 mb-1">Order Density</div>
                <div className="text-2xl font-bold text-purple-600">{(Number(cityStats?.avgOrderDensity) || 0).toFixed(1)}/km²</div>
              </div>
            </div>
        )}

        {/* Loading state */}
        {isLoading ? (
          <div className="h-96 flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : null}

        {/* Raster-Based Grid Toggle */}
        <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <Checkbox
            id="raster-toggle"
            checked={showRasterGrid}
            onCheckedChange={(checked) => setShowRasterGrid(checked as boolean)}
          />
          <label htmlFor="raster-toggle" className="text-sm font-medium cursor-pointer flex-1">
            Show Raster Grid (500x500m) Classification Overlay
          </label>
        </div>

        {/* Raster Grid Visualization */}
        <div className="space-y-3">
          <h3 className="font-semibold text-sm">Raster-Based Relative Demand Classification</h3>
          {gridLoading && showRasterGrid ? (
            <div className="h-96 flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : (
            <>
              {/* Map always visible */}
              <div className="h-96 rounded-lg overflow-hidden border border-gray-200" ref={rasterContainerRef} />
              
              {/* Grid stats and legend only shown when enabled */}
              {showRasterGrid && gridData?.cells && gridData.cells.length > 0 && (
                <>
                  <div className="grid grid-cols-4 gap-2 text-sm">
                    <div className="bg-blue-50 p-2 rounded">
                      <div className="text-xs text-gray-600">Grid Cells</div>
                      <div className="font-bold text-blue-600">{gridData.cells.length}</div>
                    </div>
                    <div className="bg-green-50 p-2 rounded">
                      <div className="text-xs text-gray-600">Avg Demand</div>
                      <div className="font-bold text-green-600">{(gridData.cells.reduce((sum, c) => sum + c.relativeDemand, 0) / gridData.cells.length).toFixed(2)}%</div>
                    </div>
                    <div className="bg-orange-50 p-2 rounded">
                      <div className="text-xs text-gray-600">Max Demand</div>
                      <div className="font-bold text-orange-600">{Math.max(...gridData.cells.map(c => c.relativeDemand)).toFixed(2)}%</div>
                    </div>
                    <div className="bg-purple-50 p-2 rounded">
                      <div className="text-xs text-gray-600">Total Orders</div>
                      <div className="font-bold text-purple-600">{gridData.totalOrders}</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-5 gap-2 text-xs">
                    <div className="flex items-center gap-1">
                      <div className="h-3 w-3 rounded" style={{ backgroundColor: '#A855F7' }}></div>
                      <span>0-5%</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="h-3 w-3 rounded" style={{ backgroundColor: '#90ee90' }}></div>
                      <span>5-10%</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="h-3 w-3 rounded" style={{ backgroundColor: '#ffff00' }}></div>
                      <span>10-15%</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="h-3 w-3 rounded" style={{ backgroundColor: '#ff4500' }}></div>
                      <span>15-20%</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="h-3 w-3 rounded" style={{ backgroundColor: '#8b0000' }}></div>
                      <span>20%+</span>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {/* Classification Legend and Explanation */}
        <div className="bg-gray-50 border rounded-lg p-4 space-y-3">
          <div>
            <h4 className="font-semibold text-sm mb-2">Relative Demand Classification</h4>
            <p className="text-xs text-gray-700 mb-3">
              Each 500x500m grid cell is classified based on its relative demand as a percentage of total city demand:
            </p>
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <div className="w-4 h-4 bg-purple-400 rounded mt-0.5 flex-shrink-0"></div>
                <div className="text-xs">
                  <span className="font-semibold">Underperforming (0-5%)</span>
                  <p className="text-gray-600">Below expected demand intensity. Areas with minimal delivery activity.</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-4 h-4 bg-green-400 rounded mt-0.5 flex-shrink-0"></div>
                <div className="text-xs">
                  <span className="font-semibold">Weak (5-10%)</span>
                  <p className="text-gray-600">Below-average demand. Residential areas with lower delivery frequency.</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-4 h-4 bg-yellow-400 rounded mt-0.5 flex-shrink-0"></div>
                <div className="text-xs">
                  <span className="font-semibold">Average (10-15%)</span>
                  <p className="text-gray-600">Typical demand level. Meets citywide average delivery intensity.</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-4 h-4 bg-orange-500 rounded mt-0.5 flex-shrink-0"></div>
                <div className="text-xs">
                  <span className="font-semibold">High (15-20%)</span>
                  <p className="text-gray-600">Above-average demand. Commercial or high-density residential zones.</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-4 h-4 bg-red-700 rounded mt-0.5 flex-shrink-0"></div>
                <div className="text-xs">
                  <span className="font-semibold">Very High (20%+)</span>
                  <p className="text-gray-600">Significantly above average. Central business or high-demand residential areas.</p>
                </div>
              </div>
            </div>
          </div>
          <div className="border-t pt-3">
            <h4 className="font-semibold text-sm mb-2">Calculation Methodology</h4>
            <p className="text-xs text-gray-700">
              Relative demand for each cell = (Orders in cell / Total orders in Fort Erie) × 100%. 
              This metric shows each grid cell's contribution to total city demand, enabling identification of high-performing zones and underutilized areas.
            </p>
          </div>
        </div>

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
