import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, ChevronLeft, ChevronRight, MapPin, Download, Grid3x3, Flame } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';

interface RelativeDemandRegion {
  id: string;
  lat: number;
  lon: number;
  orderCount: number;
  relativeDemand: number;
  classification: 'very_high' | 'high' | 'average' | 'weak' | 'underperforming';
  color: string;
}

interface CityWideStats {
  totalOrders: number;
  avgDeliveryTime: number;
  avgWaitingTime: number;
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

// Color mapping based on demand percentage
const getColorByDemand = (demand: number): string => {
  if (demand >= 20) return '#dc2626'; // Red (Very High)
  if (demand >= 15) return '#ea580c'; // Orange (High)
  if (demand >= 10) return '#eab308'; // Yellow (Average)
  if (demand >= 5) return '#16a34a'; // Green (Weak)
  return '#374151'; // Dark Grey (Underperforming)
};

export const RelativeDemandAnalysisCard: React.FC<RelativeDemandAnalysisCardProps> = ({
  isCompact = false,
  onOpenExpanded,
  dateRangeQuery,
}) => {
  const [isExpanded, setIsExpanded] = useState(!isCompact);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [regions, setRegions] = useState<RelativeDemandRegion[]>([]);
  const [cityStats, setCityStats] = useState<CityWideStats | null>(null);
  const [interpretation, setInterpretation] = useState('');
  const [selectedRegion, setSelectedRegion] = useState<RelativeDemandRegion | null>(null);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const rasterMapRef = useRef<L.Map | null>(null);
  const heatmapLayerRef = useRef<any>(null);
  const gridLayersRef = useRef<L.Rectangle[]>([]);
  const rasterContainerRef = useRef<HTMLDivElement>(null);
  const utils = trpc.useUtils();

  // Calculate date range based on selectedMonth or dateRangeQuery
  const getDateRangeForQuery = () => {
    const start = startOfMonth(selectedMonth);
    const end = endOfMonth(selectedMonth);
    return { startDate: start, endDate: end };
  };

  // Query data
  const { data: gridData, isLoading } = trpc.analytics.analyzeBoundaryRaster.useQuery(
    getDateRangeForQuery(),
    { enabled: isExpanded }
  );

  // Update data when received
  useEffect(() => {
    if (gridData) {
      const typedCells = (gridData.cells || []).map(cell => ({
        ...cell,
        classification: cell.classification as 'very_high' | 'high' | 'average' | 'weak' | 'underperforming',
      }));
      setRegions(typedCells);
      setCityStats({
        totalOrders: gridData.totalOrders,
        avgDeliveryTime: gridData.avgDeliveryTime,
        avgWaitingTime: gridData.avgWaitingTime,
      });
      setInterpretation('Geographic demand analysis for Fort Erie: Demand is relatively evenly distributed across Fort Erie with minor localized variations.');
    }
  }, [gridData]);

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

  // Initialize grid view with proper colors and labels
  useEffect(() => {
    if (showHeatmap || !rasterContainerRef.current || !regions || regions.length === 0) return;

    if (!rasterMapRef.current) {
      rasterMapRef.current = L.map(rasterContainerRef.current).setView(FORT_ERIE_CENTER, 12);

      // Dark theme tile layer
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '© OpenStreetMap, © CartoDB',
        maxZoom: 19,
      }).addTo(rasterMapRef.current);
    }

    const map = rasterMapRef.current;

    // Clear existing grid layers
    gridLayersRef.current.forEach((layer) => map.removeLayer(layer));
    gridLayersRef.current = [];

    // Clear heatmap if visible
    if (heatmapLayerRef.current) {
      map.removeLayer(heatmapLayerRef.current);
    }

    // Draw grid cells with correct colors based on demand percentage
    regions.forEach((region) => {
      const cellSize = 0.009; // ~1km at equator
      const bounds = [
        [region.lat - cellSize / 2, region.lon - cellSize / 2],
        [region.lat + cellSize / 2, region.lon + cellSize / 2],
      ] as [[number, number], [number, number]];

      // Get color based on demand percentage (not classification)
      const color = getColorByDemand(region.relativeDemand);

      const rectangle = L.rectangle(bounds, {
        color: '#60a5fa', // Light blue border
        weight: 1,
        opacity: 1,
        fillColor: color,
        fillOpacity: 0.75, // Increased opacity for visibility
        className: 'grid-cell-transition',
      }).addTo(map);

      // Add popup on click
      rectangle.bindPopup(`
        <div class="text-sm text-white">
          <p class="font-semibold">${getClassificationLabel(region.classification)}</p>
          <p>Orders: ${region.orderCount}</p>
          <p>Demand: ${region.relativeDemand.toFixed(1)}%</p>
          <p class="text-xs text-gray-300">Lat: ${region.lat.toFixed(4)}, Lon: ${region.lon.toFixed(4)}</p>
        </div>
      `);

      // Add hover effects
      rectangle.on('mouseover', function(this: L.Rectangle) {
        this.setStyle({
          color: '#ffffff', // White border on hover
          weight: 2,
          opacity: 1,
        });
      });

      rectangle.on('mouseout', function(this: L.Rectangle) {
        this.setStyle({
          color: '#60a5fa', // Back to light blue
          weight: 1,
          opacity: 1,
        });
      });

      // Add demand percentage label if zone has orders
      if (region.orderCount > 0) {
        const labelIcon = L.divIcon({
          html: `<div style="
            background: rgba(0, 0, 0, 0.7);
            border: 1px solid rgba(255, 255, 255, 0.3);
            border-radius: 4px;
            padding: 2px 6px;
            color: white;
            font-weight: bold;
            font-size: 12px;
            text-align: center;
            white-space: nowrap;
          ">${region.relativeDemand.toFixed(1)}%</div>`,
          iconSize: [60, 24],
          className: 'demand-label',
        });

        L.marker([region.lat, region.lon], { icon: labelIcon }).addTo(map);
      }

      gridLayersRef.current.push(rectangle);
    });

    // Draw Fort Erie boundary
    const boundaryPolygon = L.polygon(FORT_ERIE_BOUNDARY, {
      color: '#3b82f6',
      weight: 2,
      opacity: 0.6,
      fillOpacity: 0,
    }).addTo(map);

    // Fit map to boundary
    const bounds = L.latLngBounds(FORT_ERIE_BOUNDARY);
    map.fitBounds(bounds, { padding: [80, 80] });

    return () => {
      // Cleanup handled by React
    };
  }, [showHeatmap, regions]);

  // Initialize heatmap view
  useEffect(() => {
    if (!showHeatmap || !rasterContainerRef.current || !regions || regions.length === 0) return;

    if (!rasterMapRef.current) {
      rasterMapRef.current = L.map(rasterContainerRef.current).setView(FORT_ERIE_CENTER, 12);

      // Dark theme tile layer
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '© OpenStreetMap, © CartoDB',
        maxZoom: 19,
      }).addTo(rasterMapRef.current);
    }

    const map = rasterMapRef.current;

    // Clear existing grid layers
    gridLayersRef.current.forEach((layer) => map.removeLayer(layer));
    gridLayersRef.current = [];

    // Clear heatmap if visible
    if (heatmapLayerRef.current) {
      map.removeLayer(heatmapLayerRef.current);
    }

    // Prepare heatmap data: [lat, lon, intensity]
    const heatmapData = regions.map((region) => {
      const intensity = region.relativeDemand / 100; // Normalize to 0-1
      return [region.lat, region.lon, intensity];
    });

    // Create heatmap layer
    heatmapLayerRef.current = (L as any).heatLayer(heatmapData, {
      radius: 40,
      blur: 25,
      maxZoom: 17,
      gradient: {
        0.0: '#374151', // Dark grey
        0.25: '#16a34a', // Green
        0.5: '#eab308', // Yellow
        0.75: '#ea580c', // Orange
        1.0: '#dc2626', // Red
      },
    }).addTo(map);

    // Draw Fort Erie boundary
    const boundaryPolygon = L.polygon(FORT_ERIE_BOUNDARY, {
      color: '#3b82f6',
      weight: 2,
      opacity: 0.6,
      fillOpacity: 0,
    }).addTo(map);

    // Fit map to boundary
    const bounds = L.latLngBounds(FORT_ERIE_BOUNDARY);
    map.fitBounds(bounds, { padding: [80, 80] });

    return () => {
      // Cleanup handled by React
    };
  }, [showHeatmap, regions]);

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Relative Demand Analysis
            </CardTitle>
            <CardDescription>Geographic demand relative to city-wide averages</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Month Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1))}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Previous
          </Button>
          <h3 className="text-lg font-semibold animate-pulse">{format(selectedMonth, 'MMMM yyyy')}</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1))}
          >
            Next
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>

        {/* Map with Floating Stats Panel */}
        {cityStats && (
          <div className="relative">
            {/* Map Container - 500px height */}
            <div className="relative h-screen rounded-lg overflow-hidden border border-gray-700 bg-gray-900" style={{ maxHeight: '500px' }}>
              {isLoading ? (
                <div className="h-full flex items-center justify-center bg-gray-900">
                  <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                </div>
              ) : (
                <div ref={rasterContainerRef} className="h-full w-full" />
              )}

              {/* Floating Glassmorphism Stats Panel - Inside Map */}
              <div className="absolute top-4 right-4 z-10 bg-black/70 backdrop-blur-md border border-white/15 rounded-xl p-3 text-white space-y-2 w-56">
                <div>
                  <p className="text-xs text-white/70">Total Grid Cells</p>
                  <p className="text-xl font-bold">{regions.length}</p>
                </div>
                <div>
                  <p className="text-xs text-white/70">Avg Relative Demand</p>
                  <p className="text-xl font-bold text-green-400">
                    {(regions.reduce((sum, r) => sum + r.relativeDemand, 0) / regions.length).toFixed(2)}%
                  </p>
                </div>
                <div>
                  <p className="text-xs text-white/70">Max Demand</p>
                  <p className="text-xl font-bold text-red-500">
                    {Math.max(...regions.map((r) => r.relativeDemand)).toFixed(2)}%
                  </p>
                </div>
                <div>
                  <p className="text-xs text-white/70">Total Orders</p>
                  <p className="text-xl font-bold text-blue-400">{cityStats.totalOrders}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* View Toggle Button */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowHeatmap(!showHeatmap)}
            className="flex-1 bg-black/20 border-white/20 text-white hover:bg-black/40 backdrop-blur-sm"
          >
            {showHeatmap ? (
              <>
                <Flame className="w-4 h-4 mr-2" />
                Heatmap View
              </>
            ) : (
              <>
                <Grid3x3 className="w-4 h-4 mr-2" />
                Grid View
              </>
            )}
          </Button>
        </div>

        {/* Animated Legend */}
        <div className="bg-gradient-to-r from-gray-400 via-green-500 via-yellow-500 via-orange-500 to-red-700 h-8 rounded-lg relative">
          <div className="absolute inset-0 flex justify-between px-4 text-xs text-white font-semibold">
            <span>0-5%</span>
            <span>5-10%</span>
            <span>10-15%</span>
            <span>15-20%</span>
            <span>20%+</span>
          </div>
        </div>

        {/* Classification Legend and Explanation */}
        <div className="bg-gray-50 border rounded-lg p-4 space-y-3">
          <div>
            <h4 className="font-semibold text-sm mb-2">Relative Demand Classification</h4>
            <p className="text-xs text-gray-700 mb-3">
              Each 1000x1000m grid cell is classified based on its relative demand as a percentage of total city demand:
            </p>
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <div className="w-4 h-4 bg-gray-400 rounded mt-0.5 flex-shrink-0"></div>
                <div className="text-xs">
                  <span className="font-semibold">Underperforming (0-5%)</span>
                  <p className="text-gray-600">Below expected demand intensity. Areas with minimal delivery activity.</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-4 h-4 bg-green-500 rounded mt-0.5 flex-shrink-0"></div>
                <div className="text-xs">
                  <span className="font-semibold">Weak (5-10%)</span>
                  <p className="text-gray-600">Below-average demand. Residential areas with lower delivery frequency.</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-4 h-4 bg-yellow-500 rounded mt-0.5 flex-shrink-0"></div>
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
      </CardContent>

      <style>{`
        .grid-cell-transition {
          transition: fill 0.5s ease, stroke 0.5s ease, stroke-width 0.3s ease;
        }
        @keyframes pulse-month {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        .animate-pulse {
          animation: pulse-month 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        .demand-label {
          filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.5));
        }
      `}</style>
    </Card>
  );
};
