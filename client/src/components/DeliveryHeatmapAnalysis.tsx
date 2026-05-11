'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Loader2, TrendingUp } from 'lucide-react';
import { GISMap } from './GISMap';
import { trpc } from '@/lib/trpc';
import {
  generateKDEHeatmap,
  HeatmapData,
  DeliveryPoint,
  convertToLeafletHeatmapFormat,
} from '@/lib/heatmapCalculation';
import { filterToResidentialAreas } from '@/lib/osmResidentialFilter';
import { getResidentialBoundary, isPointInPolygon, createBoundaryLayer } from '@/lib/residentialBoundary';
import { addLegendToMap } from '@/lib/heatmapLegend';

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
  const [isLoadingBoundary, setIsLoadingBoundary] = useState(false);

  // Fetch residential boundary on component mount
  useEffect(() => {
    const fetchBoundary = async () => {
      setIsLoadingBoundary(true);
      try {
        const boundary = await getResidentialBoundary();
        setResidentialBoundary(boundary);
      } catch (error) {
        console.error('Error fetching residential boundary:', error);
      } finally {
        setIsLoadingBoundary(false);
      }
    };

    fetchBoundary();
  }, []);

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

  // Calculate heatmap when data changes
  useMemo(() => {
    if (deliveryPoints.length === 0) {
      setHeatmapData(null);
      setFilteredPoints([]);
      return;
    }

    // Apply residential filtering if enabled
    let filtered = filterResidential ? filterToResidentialAreas(deliveryPoints) : deliveryPoints;

    // Apply boundary masking if boundary is available
    if (residentialBoundary && filterResidential) {
      filtered = filtered.filter((point) =>
        isPointInPolygon(
          { lat: point.latitude, lng: point.longitude },
          residentialBoundary
        )
      );
    }

    setFilteredPoints(filtered);

    // Generate KDE heatmap
    if (filtered.length > 0) {
      const heatmap = generateKDEHeatmap(filtered, 50);
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
      if (!heatmapData || !window.L) return;

      // Add residential boundary layer if available
      if (residentialBoundary) {
        const boundaryLayer = createBoundaryLayer(residentialBoundary);
        if (boundaryLayer) {
          boundaryLayer.addTo(map);
        }
      }

      // Create heatmap layer data in Leaflet format
      const heatmapLayerData = convertToLeafletHeatmapFormat(heatmapData);

      // Add heatmap layer if leaflet-heat is available
      if (window.L.heatLayer) {
        window.L.heatLayer(heatmapLayerData, {
          radius: 25,
          blur: 15,
          maxZoom: 17,
          gradient: {
            0.0: '#0000ff', // Blue
            0.25: '#00ff00', // Green
            0.5: '#ffff00', // Yellow
            0.75: '#ff7f00', // Orange
            1.0: '#ff0000', // Red
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

      // Add legend to map
      addLegendToMap(map);
    },
    [heatmapData, residentialBoundary]
  );

  const isLoading = isDataLoading || isLoadingBoundary;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Delivery Heatmap Analysis
        </CardTitle>
        <CardDescription>
          Visualize delivery demand intensity across residential areas
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
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center gap-2 text-blue-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Loading heatmap data...</span>
          </div>
        )}

        {/* Error State */}
        {!isLoading && filteredPoints.length === 0 && (
          <div className="flex items-center gap-2 text-yellow-600 p-3 bg-yellow-50 rounded-lg">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">No delivery data available for selected filters</span>
          </div>
        )}

        {/* Map Display */}
        {heatmapData && (
          <div className="h-96 rounded-lg overflow-hidden border border-gray-200">
            <GISMap title="Delivery Heatmap" onMapReady={handleMapReady} />
          </div>
        )}
      </CardContent>
    </Card>
  );
};
