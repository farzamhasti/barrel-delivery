import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface GrowthZone {
  name: string;
  lat: number;
  lng: number;
  orderCount: number;
  avgDeliveryTime: number;
}

interface GISGrowthOpportunitiesProps {
  zones?: GrowthZone[];
  gridCells?: Record<string, { orderCount: number; orders?: any[] }>;
  competitors?: any[];
  showCompetitors?: boolean;
}

const RESTAURANT_LOCATION = { lat: 42.90517, lng: -78.92295 };

const getZoneColor = (avgTime: number) => {
  if (avgTime > 35) return "#dc2626"; // Red - high delivery time
  return "#16a34a"; // Green - normal
};

export function GISGrowthOpportunities({ zones = [], gridCells = {}, competitors = [], showCompetitors = true }: GISGrowthOpportunitiesProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const cellsRef = useRef<L.Rectangle[]>([]);

  useEffect(() => {
    if (!mapContainer.current) return;

    map.current = L.map(mapContainer.current).setView(
      [RESTAURANT_LOCATION.lat, RESTAURANT_LOCATION.lng],
      12
    );

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map.current);

    L.control.scale().addTo(map.current);

    // Add restaurant marker
    L.marker([RESTAURANT_LOCATION.lat, RESTAURANT_LOCATION.lng], {
      title: "Restaurant Location",
    })
      .addTo(map.current!)
      .bindPopup("Restaurant - The Barrel");

    // Display all grid cells as rectangles
    const gridSize = 500; // meters
    const metersPerDegree = 111000; // approximate conversion
    const gridSizeDegrees = gridSize / metersPerDegree;

    Object.entries(gridCells).forEach(([cellKey, cell]) => {
      if (!cell.orders || cell.orders.length === 0) return;

      // Calculate bounds from orders in this cell
      const lats = cell.orders.map((o: any) => parseFloat(o.customerLatitude || 0));
      const lngs = cell.orders.map((o: any) => parseFloat(o.customerLongitude || 0));
      
      if (lats.length === 0 || lngs.length === 0) return;

      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      const minLng = Math.min(...lngs);
      const maxLng = Math.max(...lngs);

      // Create rectangle for this grid cell
      const bounds: L.LatLngBoundsExpression = [
        [minLat, minLng],
        [maxLat, maxLng],
      ];

      // Color based on order density
      const orderDensity = cell.orderCount;
      let color = "#9ca3af"; // Gray - low density
      if (orderDensity > 10) color = "#16a34a"; // Green - medium
      if (orderDensity > 20) color = "#eab308"; // Yellow - high
      if (orderDensity > 30) color = "#dc2626"; // Red - very high

      const rectangle = L.rectangle(bounds, {
        color: color,
        weight: 2,
        opacity: 0.7,
        fillColor: color,
        fillOpacity: 0.3,
      })
        .addTo(map.current!)
        .bindPopup(
          `<strong>Grid Cell</strong><br/>Orders: ${cell.orderCount}<br/>Density: ${orderDensity > 30 ? "Very High" : orderDensity > 20 ? "High" : orderDensity > 10 ? "Medium" : "Low"}`
        );

      cellsRef.current.push(rectangle);
    });

    // Add top growth zones as larger markers
    zones.forEach((zone) => {
      L.circleMarker([zone.lat, zone.lng], {
        radius: 12,
        fillColor: "#3b82f6",
        color: "#1e40af",
        weight: 3,
        opacity: 1,
        fillOpacity: 0.8,
      })
        .addTo(map.current!)
        .bindPopup(
          `<strong>${zone.name}</strong><br/>Orders: ${zone.orderCount}<br/>Avg Distance: ${zone.avgDeliveryTime.toFixed(1)}km`
        );
    });

    // Add competitor markers if available
    if (showCompetitors && competitors.length > 0) {
      const competitorColors: Record<string, string> = {
        restaurant: "#FF6B6B",
        fast_food: "#FFA500",
        cafe: "#8B4513",
        bar: "#4B0082",
        food_court: "#FF1493",
        pub: "#8B0000",
        bakery: "#FFD700",
        ice_cream: "#87CEEB",
        pizza: "#DC143C",
        other: "#808080",
      };

      competitors.forEach((competitor: any) => {
        const color = competitorColors[competitor.type] || competitorColors.other;
        L.circleMarker([competitor.latitude, competitor.longitude], {
          radius: 6,
          fillColor: color,
          color: "white",
          weight: 2,
          opacity: 0.9,
          fillOpacity: 0.7,
        })
          .addTo(map.current!)
          .bindPopup(
            `<strong>${competitor.name}</strong><br/>Type: ${competitor.type}<br/>Distance: ${competitor.distanceFromRestaurantKm?.toFixed(1) || "N/A"} km`
          );
      });
    }

    return () => {
      if (map.current) {
        cellsRef.current.forEach((cell) => map.current!.removeLayer(cell));
        map.current.remove();
        map.current = null;
      }
    };
  }, [zones, gridCells, competitors, showCompetitors]);

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium text-gray-700">Growth Opportunities - GIS Map</h3>
      </div>
      <div
        ref={mapContainer}
        className="rounded-lg border border-gray-200 overflow-hidden"
        style={{ height: "500px" }}
      />
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-gray-50 p-2 rounded">
          <div className="font-semibold text-gray-700">Order Density</div>
          <div className="space-y-1 mt-1">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3" style={{ backgroundColor: "#9ca3af" }}></div>
              <span>Low (&lt;10)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3" style={{ backgroundColor: "#16a34a" }}></div>
              <span>Medium (10-20)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3" style={{ backgroundColor: "#eab308" }}></div>
              <span>High (20-30)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3" style={{ backgroundColor: "#dc2626" }}></div>
              <span>Very High (&gt;30)</span>
            </div>
          </div>
        </div>
        <div className="bg-blue-50 p-2 rounded">
          <div className="font-semibold text-blue-900">Top Growth Zones</div>
          <div className="text-blue-700 mt-1">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "#3b82f6" }}></div>
              <span>Highlighted zones</span>
            </div>
            <p className="text-xs mt-2">Rectangles show all grid cells. Blue markers show top 5 opportunities.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
