import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface GISDeliveryPerformanceProps {
  data?: {
    downtown?: { avgTime: number };
    centralPark?: { avgTime: number };
    both?: { avgTime: number };
    areaMetrics?: Record<string, { avgPrepTime: number; avgDeliveryTime: number; avgTotalTime: number; rating: string }>;
    orders?: Array<{ id: number; area?: string; customerLatitude?: any; customerLongitude?: any; readyAt?: any; pickedUpAt?: any; deliveredAt?: any; createdAt?: any }>;
  };
}

const RESTAURANT_LOCATION = { lat: 42.90517, lng: -78.92295 };

const getPerformanceColor = (avgTime: number) => {
  if (avgTime < 20) return "#16a34a"; // Green - fast
  if (avgTime < 35) return "#eab308"; // Yellow - average
  return "#dc2626"; // Red - slow
};

export function GISDeliveryPerformance({ data }: GISDeliveryPerformanceProps) {
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

    // Add order markers color-coded by delivery performance
    if (data?.orders && data.orders.length > 0) {
      data.orders.forEach((order) => {
        if (!order.customerLatitude || !order.customerLongitude) return;
        if (!order.deliveredAt || !order.createdAt) return;

        // Calculate total delivery time
        const totalTime = (order.deliveredAt.getTime() - order.createdAt.getTime()) / (1000 * 60); // minutes
        const color = getPerformanceColor(totalTime);

        L.circleMarker(
          [parseFloat(order.customerLatitude), parseFloat(order.customerLongitude)],
          {
            radius: 6,
            fillColor: color,
            color: color,
            weight: 2,
            opacity: 0.8,
            fillOpacity: 0.6,
          }
        )
          .addTo(map.current!)
          .bindPopup(
            `<strong>${order.area || "Unknown"}</strong><br/>Order #${order.id}<br/>Total Time: ${totalTime.toFixed(1)}m`
          );
      });
    }

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [data]);

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium text-gray-700">Delivery Performance - GIS Map</h3>
      </div>
      <div
        ref={mapContainer}
        className="rounded-lg border border-gray-200 overflow-hidden"
        style={{ height: "500px" }}
      />
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="bg-green-50 p-2 rounded">
          <div className="font-semibold text-green-900">Fast</div>
          <div className="text-green-700">&lt; 20 min</div>
        </div>
        <div className="bg-yellow-50 p-2 rounded">
          <div className="font-semibold text-yellow-900">Average</div>
          <div className="text-yellow-700">20-35 min</div>
        </div>
        <div className="bg-red-50 p-2 rounded">
          <div className="font-semibold text-red-900">Slow</div>
          <div className="text-red-700">&gt; 35 min</div>
        </div>
      </div>
    </div>
  );
}
