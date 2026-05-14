import React, { useState, useEffect, useMemo } from 'react';
import { format, addMonths, startOfMonth, endOfMonth } from 'date-fns';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GISMap } from './GISMap';
import L from 'leaflet';

interface GridHeatmapAnalysisCardProps {
  dateRangeQuery?: any;
}

export default function GridHeatmapAnalysisCard({ dateRangeQuery }: GridHeatmapAnalysisCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedCell, setSelectedCell] = useState<any>(null);

  // Calculate date range based on current month
  const dateRange = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return {
      startDate: new Date(start.getFullYear(), start.getMonth(), start.getDate(), 0, 0, 0),
      endDate: new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999),
    };
  }, [currentMonth]);

  // Fetch grid heatmap data
  const { data: heatmapData, isLoading } = trpc.analytics.analyzeGridHeatmap.useQuery(
    {
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
    },
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );

  const handlePreviousMonth = () => {
    setCurrentMonth(addMonths(currentMonth, -1));
  };

  const handleNextMonth = () => {
    const nextMonth = addMonths(currentMonth, 1);
    if (nextMonth <= new Date()) {
      setCurrentMonth(nextMonth);
    }
  };

  const classificationColors: Record<string, string> = {
    'Very High': '#8B0000',
    'High': '#FF4500',
    'Average': '#FFD700',
    'Weak': '#90EE90',
    'Underperforming': '#E8E8E8',
  };

  if (!isExpanded) {
    return (
      <Card
        className="cursor-pointer hover:shadow-lg transition-shadow"
        onClick={() => setIsExpanded(true)}
      >
        <CardHeader>
          <CardTitle>Grid Heatmap Analysis</CardTitle>
          <CardDescription>Geographic demand distribution across Fort Erie</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 p-3 rounded">
                <p className="text-sm text-gray-600">Total Orders</p>
                <p className="text-2xl font-bold text-blue-600">{heatmapData?.cityStats.totalOrders || 0}</p>
              </div>
              <div className="bg-green-50 p-3 rounded">
                <p className="text-sm text-gray-600">Avg Delivery Time</p>
                <p className="text-2xl font-bold text-green-600">{heatmapData?.cityStats.avgDeliveryTime || 0} min</p>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              {heatmapData?.cells?.slice(0, 5).map((cell, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {cell.classification}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-gray-500">Click to expand and view full heatmap</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(false)}
            className="mb-2"
          >
            ← Back to Grid View
          </Button>
          <CardTitle>Grid Heatmap Analysis</CardTitle>
          <CardDescription>Geographic demand distribution across Fort Erie</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Month Navigation */}
        <div className="flex items-center justify-between bg-gray-100 p-4 rounded">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePreviousMonth}
          >
            ← Previous
          </Button>
          <span className="text-lg font-semibold">
            {format(currentMonth, 'MMMM yyyy')}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNextMonth}
            disabled={addMonths(currentMonth, 1) > new Date()}
          >
            Next →
          </Button>
        </div>

        {/* City-Wide Statistics */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded">
            <p className="text-sm text-gray-600">Total Orders</p>
            <p className="text-2xl font-bold text-blue-600">{heatmapData?.cityStats.totalOrders || 0}</p>
          </div>
          <div className="bg-green-50 p-4 rounded">
            <p className="text-sm text-gray-600">Avg Delivery Time</p>
            <p className="text-2xl font-bold text-green-600">{heatmapData?.cityStats.avgDeliveryTime || 0} min</p>
          </div>
          <div className="bg-orange-50 p-4 rounded">
            <p className="text-sm text-gray-600">Avg Waiting Time</p>
            <p className="text-2xl font-bold text-orange-600">{heatmapData?.cityStats.avgWaitingTime || 0} min</p>
          </div>
          <div className="bg-purple-50 p-4 rounded">
            <p className="text-sm text-gray-600">Avg Demand Score</p>
            <p className="text-2xl font-bold text-purple-600">{heatmapData?.cityStats.avgDemandScore || 0}/100</p>
          </div>
        </div>

        {/* Heatmap Visualization */}
        <div className="h-96 rounded border border-gray-300 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-full bg-gray-100">
              <p className="text-gray-600">Loading heatmap...</p>
            </div>
          ) : heatmapData && heatmapData.cells.length > 0 ? (
            <GISMap
              title="Demand Heatmap"
              onMapReady={(map: L.Map) => {
                // Clear existing layers
                map.eachLayer((layer) => {
                  if (layer instanceof L.Rectangle) {
                    map.removeLayer(layer);
                  }
                });

                // Add grid cells as rectangles
                heatmapData.cells.forEach((cell) => {
                  const bounds = L.latLngBounds(
                    [cell.lat, cell.lon],
                    [cell.lat + 0.005, cell.lon + 0.005]
                  );

                  const rectangle = L.rectangle(bounds, {
                    color: cell.color,
                    weight: 1,
                    opacity: 0.7,
                    fillOpacity: 0.6,
                    fillColor: cell.color,
                  });

                  rectangle.bindPopup(`
                    <div class="text-sm">
                      <p><strong>${cell.classification}</strong></p>
                      <p>Demand Score: ${cell.demandScore}/100</p>
                      <p>Orders: ${cell.orderCount}</p>
                      <p>Avg Delivery: ${cell.avgDeliveryTime} min</p>
                    </div>
                  `);

                  rectangle.on('click', () => {
                    setSelectedCell(cell);
                  });

                  rectangle.addTo(map);
                });

                // Fit bounds to all cells
                if (heatmapData.cells.length > 0) {
                  const bounds = L.latLngBounds(
                    heatmapData.cells.map((c) => [c.lat, c.lon])
                  );
                  map.fitBounds(bounds, { padding: [50, 50] });
                }
              }}
            />
          ) : (
            <div className="flex items-center justify-center h-full bg-gray-100">
              <p className="text-gray-600">No delivery data available for {format(currentMonth, 'MMMM yyyy')}</p>
            </div>
          )}
        </div>

        {/* Classification Legend */}
        <div className="bg-gray-50 p-4 rounded">
          <h3 className="font-semibold mb-3">Demand Classification</h3>
          <div className="grid grid-cols-5 gap-2">
            {Object.entries(classificationColors).map(([classification, color]) => (
              <div key={classification} className="flex items-center gap-2">
                <div
                  className="w-6 h-6 rounded border border-gray-300"
                  style={{ backgroundColor: color, opacity: 0.6 }}
                />
                <span className="text-xs">{classification}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Spatial Insight */}
        <div className="bg-blue-50 p-4 rounded border border-blue-200">
          <h3 className="font-semibold text-blue-900 mb-2">Spatial Insight</h3>
          <p className="text-sm text-blue-800">{heatmapData?.interpretation || 'No data available'}</p>
        </div>

        {/* Selected Cell Details */}
        {selectedCell && (
          <div className="bg-gray-50 p-4 rounded border border-gray-300">
            <h3 className="font-semibold mb-3">Cell Details</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Classification</p>
                <p className="font-semibold">{selectedCell.classification}</p>
              </div>
              <div>
                <p className="text-gray-600">Demand Score</p>
                <p className="font-semibold">{selectedCell.demandScore}/100</p>
              </div>
              <div>
                <p className="text-gray-600">Order Count</p>
                <p className="font-semibold">{selectedCell.orderCount}</p>
              </div>
              <div>
                <p className="text-gray-600">Avg Delivery Time</p>
                <p className="font-semibold">{selectedCell.avgDeliveryTime} min</p>
              </div>
              <div>
                <p className="text-gray-600">Avg Waiting Time</p>
                <p className="font-semibold">{selectedCell.avgWaitingTime} min</p>
              </div>
              <div>
                <p className="text-gray-600">Coordinates</p>
                <p className="font-semibold text-xs">{selectedCell.centerLat.toFixed(4)}, {selectedCell.centerLon.toFixed(4)}</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
