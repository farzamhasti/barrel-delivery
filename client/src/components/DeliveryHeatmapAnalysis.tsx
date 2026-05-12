'use client';

import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Loader2, TrendingUp } from 'lucide-react';
import { GISMap } from './GISMap';
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
      setResidentialPolygons(polygonsResponse.polygons);
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
      id: point.orderId,
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

  const handleResidentialFilterChange = useCallback(() => {
    setFilterResidential((prev) => !prev);
  }, []);

  const handleMapReady = useCallback(
    (map: any) => {
      if (!map || !window.L) {
        console.warn('Map not ready or Leaflet not available');
        return;
      }

      mapRef.current = map;

      // Add residential polygon boundaries to map
      if (residentialPolygons.length > 0) {
        residentialPolygons.forEach((polygon) => {
          if (polygon.coordinates && polygon.coordinates.length > 0) {
            const leafletCoords = polygon.coordinates.map((coord) => [coord[1], coord[0]]);

            window.L.polyline(leafletCoords, {
              color: '#8b5cf6',
              weight: 2,
              opacity: 0.7,
              dashArray: '5, 5',
            }).addTo(map);
          }
        });
      }

      // Add legend to map
      try {
        addLegendToMap(map);
      } catch (e) {
        console.warn('Could not add legend to map:', e);
      }

      // Fit bounds to residential polygons with delay to ensure map is ready
      setTimeout(() => {
        try {
          if (residentialPolygons.length > 0 && mapRef.current) {
            let minLat = Infinity;
            let maxLat = -Infinity;
            let minLng = Infinity;
            let maxLng = -Infinity;

            residentialPolygons.forEach((polygon) => {
              polygon.coordinates.forEach((coord) => {
                minLat = Math.min(minLat, coord[1]);
                maxLat = Math.max(maxLat, coord[1]);
                minLng = Math.min(minLng, coord[0]);
                maxLng = Math.max(maxLng, coord[0]);
              });
            });

            if (minLat !== Infinity && maxLat !== -Infinity && minLng !== Infinity && maxLng !== -Infinity) {
              const bounds = window.L.latLngBounds([minLat, minLng], [maxLat, maxLng]);
              mapRef.current.fitBounds(bounds, { padding: [50, 50] });
            }
          }
        } catch (e) {
          console.error('Error calculating bounds:', e);
        }
      }, 100);
    },
    [residentialPolygons]
  );

  // Separate effect to handle clipped heatmap layer
  useEffect(() => {
    if (!mapRef.current || !window.L || !clippedHeatmapData) {
      return;
    }

    const map = mapRef.current;

    try {
      const heatmapLayerData = convertToLeafletFormat(clippedHeatmapData);

      // Add heatmap layer if leaflet-heat is available
      if (window.L.heatLayer && heatmapLayerData.length > 0) {
        window.L.heatLayer(heatmapLayerData, {
          radius: 25,
          blur: 15,
          maxZoom: 17,
          gradient: {
            0.0: '#0000ff', // Blue - Very Low
            0.25: '#00ff00', // Green - Low
            0.5: '#ffff00', // Yellow - Medium
            0.75: '#ff7f00', // Orange - High
            1.0: '#ff0000', // Red - Very High
          },
        }).addTo(map);
      } else if (heatmapLayerData.length > 0) {
        // Fallback: Add circles for each clipped heatmap cell
        clippedHeatmapData.gridPoints.forEach((point) => {
          const intensity = point.intensity;
          const color =
            intensity > 0.75
              ? '#ff0000'
              : intensity > 0.5
                ? '#ff7f00'
                : intensity > 0.25
                  ? '#ffff00'
                  : '#00ff00';
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
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Delivery Heatmap Analysis
        </CardTitle>
        <CardDescription>
          Visualize delivery demand intensity across residential areas only (OpenStreetMap land-use data)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
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

        {/* Statistics */}
        {hasData && (
          <div className="text-xs text-gray-600 space-y-1 p-2 bg-gray-50 rounded">
            <p>
              <strong>Total deliveries:</strong> {deliveryPoints.length}
            </p>
            <p>
              <strong>Heatmap cells (clipped to residential):</strong> {clippedPointCount}
            </p>
            <p>
              <strong>Max intensity:</strong> {(clippedHeatmapData.maxIntensity * 100).toFixed(1)}%
            </p>
            <p>
              <strong>Residential polygons:</strong> {residentialPolygons.length}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
