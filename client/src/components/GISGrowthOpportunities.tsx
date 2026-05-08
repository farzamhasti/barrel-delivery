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
}

const RESTAURANT_LOCATION = { lat: 42.90517, lng: -78.92295 };

const getZoneColor = (avgTime: number) => {
  if (avgTime > 35) return "#dc2626"; // Red - high delivery time
  return "#16a34a"; // Green - normal
};

const getZoneSize = (orderCount: number, maxOrders: number) => {
  return Math.max(5, (orderCount / maxOrders) * 30);
};

export function GISGrowthOpportunities({ zones = [], gridCells = {} }: GISGrowthOpportunitiesProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);

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

    // Add growth zones
    zones.forEach((zone) => {
      const maxOrders = Math.max(...zones.map((z) => z.orderCount), 1);
      const size = getZoneSize(zone.orderCount, maxOrders);
      const color = getZoneColor(zone.avgDeliveryTime);

      L.circleMarker([zone.lat, zone.lng], {
        radius: size,
        fillColor: color,
        color: color,
        weight: 2,
        opacity: 0.8,
        fillOpacity: 0.5,
      })
        .addTo(map.current!)
        .bindPopup(
          `<strong>${zone.name}</strong><br/>Orders: ${zone.orderCount}<br/>Avg Distance: ${zone.avgDeliveryTime.toFixed(1)}km`
        );
    });

    // Add all grid cell orders as smaller markers
    Object.entries(gridCells).forEach(([cellKey, cell]) => {
      if (cell.orders && cell.orders.length > 0) {
        cell.orders.forEach((order: any) => {
          if (!order.customerLatitude || !order.customerLongitude) return;

          L.circleMarker(
            [parseFloat(order.customerLatitude), parseFloat(order.customerLongitude)],
            {
              radius: 3,
              fillColor: "#9ca3af",
              color: "#9ca3af",
              weight: 1,
              opacity: 0.5,
              fillOpacity: 0.3,
            }
          )
            .addTo(map.current!)
            .bindPopup(`Order #${order.id}<br/>${order.area || "Unknown"}`);
        });
      }
    });

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [zones, gridCells]);

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
        <div className="bg-green-50 p-2 rounded">
          <div className="font-semibold text-green-900">Good Zone</div>
          <div className="text-green-700">Normal delivery time</div>
        </div>
        <div className="bg-red-50 p-2 rounded">
          <div className="font-semibold text-red-900">Challenge Zone</div>
          <div className="text-red-700">High delivery time</div>
        </div>
      </div>
      <div className="text-xs text-gray-600">
        <p>Zone size represents order volume. Larger circles = more orders.</p>
      </div>
    </div>
  );
}
