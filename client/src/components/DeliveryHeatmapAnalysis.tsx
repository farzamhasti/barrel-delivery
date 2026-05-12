
import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Loader2, TrendingUp, Info, ChevronDown } from 'lucide-react';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { HeatmapAnalysisDashboard } from './HeatmapAnalysisDashboard';
import { HeatmapLegendPanel } from './HeatmapLegendPanel';
import { trpc } from '@/lib/trpc';
import {
  generateClippedResidentialHeatmap,
  convertToLeafletFormat,
  ResidentialPolygon,
  DeliveryPoint,
} from '@/lib/heatmapClippedToResidential';
import { addLegendToMap } from '@/lib/heatmapLegend';

// Declare window.L for Leaflet library
declare global {
  interface Window {
    L: any;
  }
}

export interface DeliveryHeatmapAnalysisProps {
  dateRange: { startDate: Date; endDate: Date };
  areaFilter: 'all' | 'Downtown' | 'Central Park' | 'Both';
}

export const DeliveryHeatmapAnalysis: React.FC<DeliveryHeatmapAnalysisProps> = ({
  dateRange,
  areaFilter,
}) => {
  const [filterResidential, setFilterResidential] = useState(true);
  const [residentialPolygons, setResidentialPolygons] = useState<ResidentialPolygon[]>([]);
  const [clippedHeatmapData, setClippedHeatmapData] = useState<any>(null);
  const [clippedPointCount, setClippedPointCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [showMethodology, setShowMethodology] = useState(false);
  const mapRef = useRef<any>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  // Fetch residential polygons from server via tRPC
  const { data: polygonsResponse, isLoading: isLoadingPolygons, error: polygonsError } = trpc.analytics.getResidentialPolygons.useQuery(
    undefined,
    {
      retry: 3,
      retryDelay: 1000,
    }
  );

  // Update polygons when response arrives
  useEffect(() => {
    if (polygonsResponse?.success && polygonsResponse.polygons && polygonsResponse.polygons.length > 0) {
      setResidentialPolygons(polygonsResponse.polygons as any);
      setError(null);
    } else if (polygonsResponse && !polygonsResponse.success) {
      setError(polygonsResponse.message || 'Failed to load residential polygons');
    }
  }, [polygonsResponse]);

  // Fetch heatmap data from server
  const { data: heatmapDataResponse, isLoading: isDataLoading } = trpc.analytics.getDeliveryHeatmapData.useQuery({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    areaFilter: areaFilter,
  });

  // Convert server response to DeliveryPoint format
  const deliveryPoints = useMemo(() => {
    if (!heatmapDataResponse?.points) return [];
    return heatmapDataResponse.points.map((point) => ({
      id: String(point.orderId),
      latitude: point.lat,
      longitude: point.lng,
      timestamp: point.timestamp,
    }));
  }, [heatmapDataResponse?.points]);

  // Generate clipped heatmap when data changes
  useEffect(() => {
    if (deliveryPoints.length === 0 || residentialPolygons.length === 0 || !filterResidential) {
      setClippedHeatmapData(null);
      setClippedPointCount(0);
      return;
    }

    try {
      // Generate KDE heatmap clipped to residential polygons
      const clipped = generateClippedResidentialHeatmap(deliveryPoints, residentialPolygons, 50);
      setClippedHeatmapData(clipped);
      setClippedPointCount(clipped.gridPoints.length);
    } catch (err) {
      console.error('[DeliveryHeatmapAnalysis] Error generating clipped heatmap:', err);
      setClippedHeatmapData(null);
      setClippedPointCount(0);
      setError('Error generating heatmap');
    }
  }, [deliveryPoints, residentialPolygons, filterResidential]);

  const handleResidentialFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilterResidential(e.target.checked);
  };

  const handleMapReady = useCallback((map: any) => {
    mapRef.current = map;

    if (!map || !window.L) return;

    // Clear existing layers
    map.eachLayer((layer: any) => {
      if (layer instanceof window.L.TileLayer || layer instanceof window.L.Marker) {
        // Keep base tiles and markers
      } else if (layer instanceof window.L.FeatureGroup || layer.options?.pane === 'overlayPane') {
        try {
          map.removeLayer(layer);
        } catch (e) {}
      }
    });

    // Add legend
    addLegendToMap(map);

    // Add heatmap visualization
    if (clippedHeatmapData && clippedHeatmapData.gridPoints.length > 0) {
      try {
        // Use Leaflet.heat if available, otherwise use circle markers
        const heatmapLayerData = clippedHeatmapData.gridPoints.map((point: any) => [
          point.lat,
          point.lng,
          point.intensity,
        ]);

        if (window.L.heatLayer) {
          window.L.heatLayer(heatmapLayerData, {
            radius: 25,
            blur: 15,
            maxZoom: 17,
            gradient: {
              0.0: '#0000ff',
              0.167: '#00bfff',
              0.333: '#00ff00',
              0.5: '#ffff00',
              0.667: '#ff7f00',
              1.0: '#ff0000',
            },
          }).addTo(map);
        } else if (heatmapLayerData.length > 0) {
          // Fallback: Add circles for each clipped heatmap cell
          clippedHeatmapData.gridPoints.forEach((point: any) => {
            const intensity = point.intensity;
            const color =
              intensity > 0.833
                ? '#ff0000'
                : intensity > 0.667
                  ? '#ff7f00'
                  : intensity > 0.5
                    ? '#ffff00'
                    : intensity > 0.333
                      ? '#00ff00'
                      : intensity > 0.167
                        ? '#00bfff'
                        : '#0000ff';
            window.L.circleMarker([point.lat, point.lng], {
              radius: 4,
              fillColor: color,
              color: color,
              weight: 1,
              opacity: 0.8,
              fillOpacity: 0.6,
            }).addTo(map);
          });
        }
      } catch (e) {
        console.error('Error adding clipped heatmap layer:', e);
      }
    }
  }, [clippedHeatmapData]);

  const isLoading = isDataLoading || isLoadingPolygons;
  const hasData = clippedPointCount > 0 && clippedHeatmapData;
  const hasPolygons = residentialPolygons.length > 0;

  // Prevent click events on map from propagating to parent
  const handleMapContainerClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Delivery Heatmap Analysis
            </CardTitle>
            <CardDescription>
              Visualize delivery demand intensity across residential areas only (OpenStreetMap land-use data)
            </CardDescription>
          </div>
          <button
            onClick={() => setShowMethodology(!showMethodology)}
            className="ml-2 p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="View methodology and analysis details"
          >
            <Info className="h-5 w-5 text-blue-600" />
          </button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Advanced Methodology Panel */}
        {showMethodology && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
            <h3 className="font-semibold text-sm text-blue-900 flex items-center gap-2">
              <Info className="h-4 w-4" />
              How This Heatmap Works
            </h3>
            
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="methodology">
                <AccordionTrigger className="text-sm font-medium hover:no-underline">
                  <span>Methodology: Kernel Density Estimation (KDE)</span>
                </AccordionTrigger>
                <AccordionContent className="text-sm text-gray-700 space-y-2">
                  <p>
                    This heatmap uses <strong>Kernel Density Estimation</strong>, an advanced statistical technique that transforms individual delivery points into a smooth, continuous intensity surface. Here's how it works:
                  </p>
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li>Each delivery location is treated as a data point on the map</li>
                    <li>A Gaussian (bell-shaped) kernel is placed at each delivery point</li>
                    <li>The kernels overlap and sum together to create a smooth intensity gradient</li>
                    <li>Areas with many nearby deliveries show higher intensity (red/orange)</li>
                    <li>Isolated deliveries show lower intensity (blue/cyan)</li>
                  </ol>
                  <p className="text-xs text-gray-600 mt-2">
                    The bandwidth is automatically calculated using Scott's rule to balance smoothing and detail preservation.
                  </p>
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="data-sources">
                <AccordionTrigger className="text-sm font-medium hover:no-underline">
                  <span>Data Sources & Filtering</span>
                </AccordionTrigger>
                <AccordionContent className="text-sm text-gray-700 space-y-2">
                  <p><strong>Delivery Orders:</strong> All successfully delivered orders within your selected date range are included in the analysis.</p>
                  <p><strong>Residential Areas:</strong> The heatmap is clipped to residential zones only using OpenStreetMap land-use data. This filters out commercial, industrial, and non-residential areas.</p>
                  <p><strong>Coordinates:</strong> Delivery locations are geocoded from customer addresses using Google Maps API. Cached results ensure consistent analysis.</p>
                  <p className="text-xs text-gray-600">
                    Only cells that fall within residential polygons are displayed, ensuring your analysis focuses on actual customer areas.
                  </p>
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="interpretation">
                <AccordionTrigger className="text-sm font-medium hover:no-underline">
                  <span>How to Interpret the Colors</span>
                </AccordionTrigger>
                <AccordionContent className="text-sm text-gray-700">
                  <HeatmapLegendPanel />
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="insights">
                <AccordionTrigger className="text-sm font-medium hover:no-underline">
                  <span>Key Insights & Use Cases</span>
                </AccordionTrigger>
                <AccordionContent className="text-sm text-gray-700 space-y-2">
                  <p><strong>Identify High-Demand Zones:</strong> Red and orange areas represent your most profitable delivery zones. Consider prioritizing marketing and resources here.</p>
                  <p><strong>Optimize Delivery Routes:</strong> Use the heatmap to plan efficient delivery routes that cluster nearby orders together.</p>
                  <p><strong>Expansion Planning:</strong> Green and cyan areas show emerging markets with growth potential. These are opportunities for targeted promotions.</p>
                  <p><strong>Service Coverage:</strong> Blue areas indicate underserved regions. Evaluate whether expanding service to these areas is strategically valuable.</p>
                  <p><strong>Driver Allocation:</strong> Assign more drivers to red/orange zones during peak hours to minimize delivery times.</p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        )}

        {/* Residential Filter Toggle */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="residential-filter"
            checked={filterResidential}
            onChange={handleResidentialFilterChange}
            className="w-4 h-4"
          />
          <label htmlFor="residential-filter" className="text-sm font-medium">
            Filter to Residential Areas Only
          </label>
          {hasData && (
            <span className="text-xs text-gray-500">
              ({deliveryPoints.length} deliveries, {clippedPointCount} clipped cells)
            </span>
          )}
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center gap-2 text-blue-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Loading heatmap data...</span>
          </div>
        )}

        {/* Error State - No Polygons */}
        {!isLoading && !hasPolygons && (
          <div className="flex items-center gap-2 text-yellow-600 p-3 bg-yellow-50 rounded-lg">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">Unable to load residential area polygons from OpenStreetMap</span>
          </div>
        )}

        {/* Error State - No Data */}
        {!isLoading && hasPolygons && deliveryPoints.length === 0 && (
          <div className="flex items-center gap-2 text-yellow-600 p-3 bg-yellow-50 rounded-lg">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">No delivery data available for selected filters</span>
          </div>
        )}

        {/* Map Display - Show if we have polygons (even without clipped data) */}
        {!isLoading && hasPolygons && (
          <div
            ref={mapContainerRef}
            className="h-96 rounded-lg overflow-hidden border border-gray-200"
            onClick={handleMapContainerClick}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
          >
            <GISMap title="Delivery Heatmap - Clipped to Residential Areas" onMapReady={handleMapReady} />
          </div>
        )}

        {/* Comprehensive Analysis Dashboard */}
        {hasData && clippedHeatmapData && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="font-semibold text-lg mb-4">Heatmap Analysis Results</h3>
            <HeatmapAnalysisDashboard
              gridPoints={clippedHeatmapData.gridPoints || []}
              deliveryPoints={deliveryPoints}
              previousGridPoints={null}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Import GISMap
import { GISMap } from './GISMap';
