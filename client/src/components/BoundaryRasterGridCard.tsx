import { useState, useMemo } from 'react';
import { format, addMonths, startOfMonth, endOfMonth } from 'date-fns';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GISMap } from './GISMap';
import L from 'leaflet';

interface BoundaryRasterGridCardProps {
  dateRangeQuery?: any;
}

export default function BoundaryRasterGridCard({ dateRangeQuery }: BoundaryRasterGridCardProps) {
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

  // Fetch boundary raster data
  const { data: rasterData, isLoading } = trpc.analytics.analyzeBoundaryRaster.useQuery(
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

  // Calculate statistics from cells
  const stats = useMemo(() => {
    if (!rasterData?.cells) {
      return {
        cellCount: 0,
        avgRelativeDemand: 0,
        maxRelativeDemand: 0,
        minRelativeDemand: 0,
      };
    }

    const demands = rasterData.cells.map(c => c.relativeDemand);
    return {
      cellCount: rasterData.cells.length,
      avgRelativeDemand: demands.length > 0 ? Math.round((demands.reduce((a, b) => a + b, 0) / demands.length) * 100) / 100 : 0,
      maxRelativeDemand: demands.length > 0 ? Math.max(...demands) : 0,
      minRelativeDemand: demands.length > 0 ? Math.min(...demands) : 0,
    };
  }, [rasterData?.cells]);

  if (!isExpanded) {
    return (
      <Card
        className="cursor-pointer hover:shadow-lg transition-shadow"
        onClick={() => setIsExpanded(true)}
      >
        <CardHeader>
          <CardTitle>Boundary-Clipped Raster Grid</CardTitle>
          <CardDescription>30x30m relative demand heatmap</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 p-3 rounded">
                <p className="text-sm text-gray-600">Grid Cells</p>
                <p className="text-2xl font-bold text-blue-600">{stats.cellCount}</p>
              </div>
              <div className="bg-green-50 p-3 rounded">
                <p className="text-sm text-gray-600">Avg Relative Demand</p>
                <p className="text-2xl font-bold text-green-600">{stats.avgRelativeDemand}%</p>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              {rasterData?.cells?.slice(0, 5).map((cell, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {cell.classification}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-gray-500">Click to expand and view full raster grid</p>
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
          <CardTitle>Boundary-Clipped Raster Grid</CardTitle>
          <CardDescription>30x30m relative demand heatmap (percentage of total city demand)</CardDescription>
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
            <p className="text-sm text-gray-600">Total Grid Cells</p>
            <p className="text-2xl font-bold text-blue-600">{stats.cellCount}</p>
          </div>
          <div className="bg-green-50 p-4 rounded">
            <p className="text-sm text-gray-600">Avg Relative Demand</p>
            <p className="text-2xl font-bold text-green-600">{stats.avgRelativeDemand}%</p>
          </div>
          <div className="bg-orange-50 p-4 rounded">
            <p className="text-sm text-gray-600">Max Relative Demand</p>
            <p className="text-2xl font-bold text-orange-600">{stats.maxRelativeDemand}%</p>
          </div>
          <div className="bg-purple-50 p-4 rounded">
            <p className="text-sm text-gray-600">Total Orders</p>
            <p className="text-2xl font-bold text-purple-600">{rasterData?.totalOrders || 0}</p>
          </div>
        </div>

        {/* Raster Grid Visualization */}
        <div className="h-96 rounded border border-gray-300 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-full bg-gray-100">
              <p className="text-gray-600">Loading raster grid...</p>
            </div>
          ) : rasterData && rasterData.cells.length > 0 ? (
            <GISMap
              title="Boundary-Clipped Raster Grid"
              onMapReady={(map: L.Map) => {
                // Clear existing layers
                map.eachLayer((layer) => {
                  if (layer instanceof L.Rectangle) {
                    map.removeLayer(layer);
                  }
                });

                // Add grid cells as rectangles
                rasterData.cells.forEach((cell) => {
                  // Each cell is 30m x 30m
                  // Convert 30m to degrees (approximately 0.00027 degrees)
                  const cellSizeInDegrees = 0.00027;
                  
                  const bounds = L.latLngBounds(
                    [cell.lat - cellSizeInDegrees / 2, cell.lon - cellSizeInDegrees / 2],
                    [cell.lat + cellSizeInDegrees / 2, cell.lon + cellSizeInDegrees / 2]
                  );

                  const rectangle = L.rectangle(bounds, {
                    color: cell.color,
                    weight: 0.5,
                    opacity: 0.8,
                    fillOpacity: 0.7,
                    fillColor: cell.color,
                  });

                  rectangle.bindPopup(`
                    <div class="text-sm">
                      <p><strong>${cell.classification}</strong></p>
                      <p>Relative Demand: ${cell.relativeDemand}%</p>
                      <p>Orders: ${cell.orderCount}</p>
                      <p>Cell ID: ${cell.id}</p>
                    </div>
                  `);

                  rectangle.on('click', () => {
                    setSelectedCell(cell);
                  });

                  rectangle.addTo(map);
                });

                // Fit bounds to all cells
                if (rasterData.cells.length > 0) {
                  const bounds = L.latLngBounds(
                    rasterData.cells.map((c) => [c.lat, c.lon])
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
          <h3 className="font-semibold mb-3">Relative Demand Classification</h3>
          <div className="grid grid-cols-5 gap-2">
            {Object.entries(classificationColors).map(([classification, color]) => (
              <div key={classification} className="flex items-center gap-2">
                <div
                  className="w-6 h-6 rounded border border-gray-300"
                  style={{ backgroundColor: color, opacity: 0.7 }}
                />
                <span className="text-xs">{classification}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-600 mt-3">
            Each cell represents 30x30 meters. Color intensity indicates percentage of total city demand.
          </p>
        </div>

        {/* Spatial Insight */}
        <div className="bg-blue-50 p-4 rounded border border-blue-200">
          <h3 className="font-semibold text-blue-900 mb-2">Grid Analysis</h3>
          <p className="text-sm text-blue-800">
            This raster grid divides the service area into 30x30 meter cells, clipped to the actual city boundary.
            Each cell is colored based on its relative demand (percentage of total city orders).
            Cells with higher demand percentages indicate hotspots for delivery concentration.
          </p>
        </div>

        {/* Selected Cell Details */}
        {selectedCell && (
          <div className="bg-gray-50 p-4 rounded border border-gray-300">
            <h3 className="font-semibold mb-3">Cell Details</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Cell ID</p>
                <p className="font-semibold">{selectedCell.id}</p>
              </div>
              <div>
                <p className="text-gray-600">Classification</p>
                <p className="font-semibold">{selectedCell.classification}</p>
              </div>
              <div>
                <p className="text-gray-600">Relative Demand</p>
                <p className="font-semibold">{selectedCell.relativeDemand}%</p>
              </div>
              <div>
                <p className="text-gray-600">Order Count</p>
                <p className="font-semibold">{selectedCell.orderCount}</p>
              </div>
              <div>
                <p className="text-gray-600">Latitude</p>
                <p className="font-semibold text-xs">{selectedCell.lat.toFixed(6)}</p>
              </div>
              <div>
                <p className="text-gray-600">Longitude</p>
                <p className="font-semibold text-xs">{selectedCell.lon.toFixed(6)}</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
