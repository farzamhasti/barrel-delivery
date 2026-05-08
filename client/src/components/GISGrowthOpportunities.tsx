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
}

const RESTAURANT_LOCATION = { lat: 42.90517, lng: -78.92295 };

const getZoneColor = (avgTime: number) => {
  if (avgTime > 35) return "#dc2626"; // Red - high delivery time
  return "#16a34a"; // Green - normal
};

const getZoneSize = (orderCount: number, maxOrders: number) => {
  return Math.max(5, (orderCount / maxOrders) * 30);
};

export function GISGrowthOpportunities({ zones = [] }: GISGrowthOpportunitiesProps) {
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
    const maxOrders = Math.max(...zones.map((z) => z.orderCount), 1);

    zones.forEach((zone) => {
      const size = getZoneSize(zone.orderCount, maxOrders);
      const color = zone.orderCount < 5 ? "#eab308" : getZoneColor(zone.avgDeliveryTime);
      const borderColor = zone.avgDeliveryTime > 35 ? "#dc2626" : "#16a34a";

      L.circleMarker([zone.lat, zone.lng], {
        radius: size,
        fillColor: color,
        color: borderColor,
        weight: zone.avgDeliveryTime > 35 ? 3 : 1,
        opacity: 0.8,
        fillOpacity: 0.6,
      })
        .addTo(map.current!)
        .bindPopup(
          `<strong>${zone.name}</strong><br/>
          Orders: ${zone.orderCount}<br/>
          Avg Delivery Time: ${zone.avgDeliveryTime.toFixed(1)} min<br/>
          ${zone.orderCount < 5 ? "⭐ Growth Opportunity" : zone.avgDeliveryTime > 35 ? "⚠ High Delivery Time" : "✓ Strong Zone"}`
        );
    });

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [zones]);

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
      <div className="space-y-2 text-xs">
        <div className="bg-gray-50 p-2 rounded">
          <div className="font-semibold text-gray-700 mb-2">Legend:</div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
              <span>Low Orders (Growth Zone)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded-full border-2 border-green-600"></div>
              <span>Strong Zone (Normal Delivery Time)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500 rounded-full border-4 border-red-600"></div>
              <span>High Delivery Time Area</span>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t">
            <div className="font-semibold text-gray-700 mb-1">Circle Size = Order Volume</div>
            <div className="text-gray-600">Larger circles = more orders</div>
          </div>
        </div>
        {zones.length > 0 && (
          <div className="bg-blue-50 p-2 rounded">
            <div className="font-semibold text-blue-900 mb-1">Recommendations:</div>
            <ul className="space-y-1 text-blue-800">
              {zones
                .filter((z) => z.orderCount < 5)
                .slice(0, 3)
                .map((z) => (
                  <li key={z.name}>• {z.name} - Consider promotions</li>
                ))}
              {zones
                .filter((z) => z.avgDeliveryTime > 35)
                .slice(0, 2)
                .map((z) => (
                  <li key={z.name}>• {z.name} - Add more drivers</li>
                ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
