'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Loader2, TrendingUp } from 'lucide-react';
import { GISMap } from './GISMap';
import { trpc } from '@/lib/trpc';
import {
  generateKDEHeatmapResidential,
  HeatmapData,
  DeliveryPoint,
  convertToLeafletHeatmapFormat,
} from '@/lib/heatmapCalculationResidential';
import { isPointInPolygon, createBoundaryLayer, getBoundaryLatLngs } from '@/lib/residentialBoundaryShared';
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
  const [heatmapData, setHeatmapData] = useState<HeatmapData | null>(null);
  const [filteredPoints, setFilteredPoints] = useState<DeliveryPoint[]>([]);
  const [residentialBoundary, setResidentialBoundary] = useState<any>(null);

  // Fetch residential boundary from server via tRPC
  const { data: boundaryResponse, isLoading: isLoadingBoundary } = trpc.analytics.getResidentialBoundary.useQuery();

  // Update boundary when response arrives
  useMemo(() => {
    if (boundaryResponse?.success && boundaryResponse.boundary) {
      setResidentialBoundary(boundaryResponse.boundary);
    }
  }, [boundaryResponse]);

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

  // Calculate heatmap when data changes - ONLY for residential areas
  useMemo(() => {
    if (deliveryPoints.length === 0 || !residentialBoundary) {
      setHeatmapData(null);
      setFilteredPoints([]);
      return;
    }

    // Filter points to residential areas only
    const filtered = deliveryPoints.filter((point) =>
      isPointInPolygon(
        { lat: point.latitude, lng: point.longitude },
        residentialBoundary
      )
    );

    setFilteredPoints(filtered);

    // Generate KDE heatmap ONLY from residential points
    // The heatmap grid is also constrained to residential boundary
    if (filtered.length > 0 && filterResidential) {
      const heatmap = generateKDEHeatmapResidential(filtered, residentialBoundary, 50);
      setHeatmapData(heatmap);
    } else if (!filterResidential) {
      // If filter is disabled, show all points (for comparison)
      const heatmap = generateKDEHeatmapResidential(deliveryPoints, residentialBoundary, 50);
      setHeatmapData(heatmap);
    } else {
      setHeatmapData(null);
    }
  }, [deliveryPoints, filterResidential, residentialBoundary]);

  const handleResidentialFilterChange = useCallback(() => {
    setFilterResidential((prev) => !prev);
  }, []);

  const handleMapReady = useCallback(
    (map: any) => {
      if (!window.L) return;

      // Add residential boundary layer and fit map to it
      if (residentialBoundary) {
        const boundaryLayer = createBoundaryLayer(residentialBoundary);
        if (boundaryLayer) {
          boundaryLayer.addTo(map);
        }

        // Fit map to residential boundary bounds
        try {
          const latLngs = getBoundaryLatLngs(residentialBoundary);
          if (latLngs.length > 0) {
            const bounds = window.L.latLngBounds(latLngs);
            map.fitBounds(bounds, { padding: [50, 50] });
          }
        } catch (e) {
          console.error('Error fitting map to boundary:', e);
        }
      }

      // Add heatmap visualization if data exists
      if (heatmapData) {
        const heatmapLayerData = convertToLeafletHeatmapFormat(heatmapData);

        // Add heatmap layer if leaflet-heat is available
        if (window.L.heatLayer) {
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
        } else {
          // Fallback: Add circles for each heatmap cell
          heatmapData.gridPoints.forEach((point) => {
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
              radius: 5,
              fillColor: color,
              color: color,
              weight: 1,
              opacity: 0.7,
              fillOpacity: 0.5,
            }).addTo(map);
          });
        }
      }

      // Add legend to map
      addLegendToMap(map);
    },
    [heatmapData, residentialBoundary]
  );

  const isLoading = isDataLoading || isLoadingBoundary;
  const hasData = filteredPoints.length > 0 && heatmapData;

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
              ({filteredPoints.length} residential deliveries)
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

        {/* Error State - No Boundary */}
        {!isLoading && !residentialBoundary && (
          <div className="flex items-center gap-2 text-yellow-600 p-3 bg-yellow-50 rounded-lg">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">Unable to load residential area boundaries from OpenStreetMap</span>
          </div>
        )}

        {/* Error State - No Data */}
        {!isLoading && residentialBoundary && filteredPoints.length === 0 && (
          <div className="flex items-center gap-2 text-yellow-600 p-3 bg-yellow-50 rounded-lg">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">No delivery data available in residential areas for selected filters</span>
          </div>
        )}

        {/* Map Display - Only shown if we have data and boundary */}
        {hasData && (
          <div className="h-96 rounded-lg overflow-hidden border border-gray-200">
            <GISMap title="Delivery Heatmap - Residential Areas Only" onMapReady={handleMapReady} />
          </div>
        )}

        {/* Statistics */}
        {hasData && (
          <div className="text-xs text-gray-600 space-y-1 p-2 bg-gray-50 rounded">
            <p>
              <strong>Residential deliveries:</strong> {filteredPoints.length}
            </p>
            <p>
              <strong>Heatmap grid cells (residential only):</strong> {heatmapData.gridPoints.length}
            </p>
            <p>
              <strong>Max intensity:</strong> {(heatmapData.maxIntensity * 100).toFixed(1)}%
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Heatmap generated only from delivery points within residential areas. Non-residential zones (industrial, parks, highways, waterways) are excluded from analysis.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
