import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Download } from "lucide-react";
import { trpc } from "@/lib/trpc";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface BoundaryRasterGridCardProps {
  dateRangeQuery: { startDate: Date; endDate: Date };
}

export default function BoundaryRasterGridCard({ dateRangeQuery }: BoundaryRasterGridCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date());

  // Fetch raster grid data
  const { data: gridData, isLoading } = trpc.analytics.analyzeBoundaryRaster.useQuery(dateRangeQuery);

  // Initialize map
  const handleExpandClick = () => {
    setIsExpanded(!isExpanded);
    setTimeout(() => {
      if (!isExpanded && gridData?.cells) {
        initializeMap();
      }
    }, 100);
  };

  const initializeMap = () => {
    const mapContainer = document.getElementById("boundary-raster-map");
    if (!mapContainer || mapContainer.children.length > 0) return;

    // Center on Fort Erie
    const map = L.map("boundary-raster-map").setView([42.91, -78.99], 11);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    if (gridData?.cells) {
      // Draw raster grid cells
      for (const cell of gridData.cells) {
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
          `<div class="p-2">
            <p class="font-semibold">${cell.id}</p>
            <p>Demand: ${cell.relativeDemand.toFixed(2)}%</p>
            <p>Orders: ${cell.orderCount}</p>
            <p>Classification: ${cell.classification}</p>
          </div>`
        );

        rectangle.addTo(map);
      }

      // Fit map to bounds
      const allLats = gridData.cells.map((c) => c.lat);
      const allLons = gridData.cells.map((c) => c.lon);
      const bounds = L.latLngBounds(
        [Math.min(...allLats), Math.min(...allLons)],
        [Math.max(...allLats), Math.max(...allLons)]
      );
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  };

  const handleExportPNG = () => {
    const mapContainer = document.getElementById("boundary-raster-map");
    if (mapContainer && (window as any).leafletImage) {
      ((window as any).leafletImage)(L.map("boundary-raster-map"), (err: any, canvas: any) => {
        if (err) return;
        const link = document.createElement("a");
        link.href = canvas.toDataURL();
        link.download = "raster-grid.png";
        link.click();
      });
    }
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Raster-Based Relative Demand Classification
            </CardTitle>
            <CardDescription>1000x1000m grid cells classified by relative demand for entire Fort Erie</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExpandClick}
            disabled={isLoading}
          >
            {isExpanded ? "Collapse" : "Expand"}
          </Button>
        </div>
      </CardHeader>

      {!isExpanded && (
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg bg-blue-50 p-4">
              <p className="text-sm text-gray-600">Total Grid Cells</p>
              <p className="text-2xl font-bold text-blue-600">{gridData?.cells?.length || 0}</p>
            </div>
            <div className="rounded-lg bg-green-50 p-4">
              <p className="text-sm text-gray-600">Avg Relative Demand</p>
              <p className="text-2xl font-bold text-green-600">
                {gridData?.cells && gridData.cells.length > 0
                  ? (gridData.cells.reduce((sum, c) => sum + c.relativeDemand, 0) / gridData.cells.length).toFixed(2)
                  : 0}
                %
              </p>
            </div>
            <div className="rounded-lg bg-orange-50 p-4">
              <p className="text-sm text-gray-600">Max Relative Demand</p>
              <p className="text-2xl font-bold text-orange-600">
                {gridData?.cells && gridData.cells.length > 0
                  ? Math.max(...gridData.cells.map((c) => c.relativeDemand)).toFixed(2)
                  : 0}
                %
              </p>
            </div>
            <div className="rounded-lg bg-purple-50 p-4">
              <p className="text-sm text-gray-600">Total Orders</p>
              <p className="text-2xl font-bold text-purple-600">{gridData?.totalOrders || 0}</p>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <p className="text-sm font-semibold">Demand Classification Legend</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded" style={{ backgroundColor: "#cccccc" }}></div>
                <span>Underperforming (0-5%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded" style={{ backgroundColor: "#90ee90" }}></div>
                <span>Weak (5-10%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded" style={{ backgroundColor: "#ffff00" }}></div>
                <span>Average (10-15%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded" style={{ backgroundColor: "#ff4500" }}></div>
                <span>High (15-20%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded" style={{ backgroundColor: "#8b0000" }}></div>
                <span>Very High (20%+)</span>
              </div>
            </div>
          </div>

          <p className="mt-4 text-xs text-gray-500">Click to expand and view full raster grid map</p>
        </CardContent>
      )}

      {isExpanded && (
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-semibold">Grid Statistics</p>
                <p className="text-xs text-gray-600">
                  {gridData?.cells?.length || 0} cells | Avg Demand:{" "}
                  {gridData?.cells && gridData.cells.length > 0
                    ? (gridData.cells.reduce((sum, c) => sum + c.relativeDemand, 0) / gridData.cells.length).toFixed(2)
                    : 0}
                  % | Total Orders: {gridData?.totalOrders || 0}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleExportPNG}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Export PNG
              </Button>
            </div>

            <div
              id="boundary-raster-map"
              className="h-96 w-full rounded-lg border border-gray-200"
              style={{ minHeight: "400px" }}
            />

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-blue-50 p-3">
                <p className="text-xs text-gray-600">Avg Delivery Time</p>
                <p className="text-lg font-bold text-blue-600">
                  {gridData?.avgDeliveryTime ? Math.round(gridData.avgDeliveryTime / 60) : 0} min
                </p>
              </div>
              <div className="rounded-lg bg-green-50 p-3">
                <p className="text-xs text-gray-600">Avg Wait Time</p>
                <p className="text-lg font-bold text-green-600">
                  {gridData?.avgWaitingTime ? Math.round(gridData.avgWaitingTime / 60) : 0} min
                </p>
              </div>
            </div>

            <div className="rounded-lg bg-gray-50 p-3">
              <p className="text-xs font-semibold text-gray-700">Demand Distribution</p>
              <div className="mt-2 space-y-1 text-xs">
                {gridData?.cells && (
                  <>
                    <p>Very High (20%+): {gridData.cells.filter((c) => c.relativeDemand >= 20).length} cells</p>
                    <p>High (15-20%): {gridData.cells.filter((c) => c.relativeDemand >= 15 && c.relativeDemand < 20).length} cells</p>
                    <p>Average (10-15%): {gridData.cells.filter((c) => c.relativeDemand >= 10 && c.relativeDemand < 15).length} cells</p>
                    <p>Weak (5-10%): {gridData.cells.filter((c) => c.relativeDemand >= 5 && c.relativeDemand < 10).length} cells</p>
                    <p>Underperforming (0-5%): {gridData.cells.filter((c) => c.relativeDemand < 5).length} cells</p>
                  </>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
