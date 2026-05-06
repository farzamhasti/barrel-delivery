import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface GISDeliveryPerformanceProps {
  data?: {
    downtown: { avgTime: number };
    centralPark: { avgTime: number };
    both: { avgTime: number };
  };
}

const RESTAURANT_LOCATION = { lat: 42.9849, lng: -79.0504 };

const AREA_BOUNDARIES = {
  downtown: [
    [42.98, -79.06],
    [42.99, -79.06],
    [42.99, -79.04],
    [42.98, -79.04],
  ],
  centralPark: [
    [42.97, -79.06],
    [42.98, -79.06],
    [42.98, -79.04],
    [42.97, -79.04],
  ],
  both: [
    [42.99, -79.06],
    [43.0, -79.06],
    [43.0, -79.04],
    [42.99, -79.04],
  ],
};

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

    const downtownTime = data?.downtown?.avgTime || 0;
    const cpTime = data?.centralPark?.avgTime || 0;
    const bothTime = data?.both?.avgTime || 0;

    // Downtown polygon
    L.polygon(AREA_BOUNDARIES.downtown, {
      color: getPerformanceColor(downtownTime),
      weight: 2,
      opacity: 0.8,
      fillOpacity: 0.6,
      fillColor: getPerformanceColor(downtownTime),
    })
      .addTo(map.current!)
      .bindPopup(
        `<strong>Downtown</strong><br/>Avg Delivery Time: ${downtownTime.toFixed(1)} min<br/>${downtownTime < 20 ? "✓ Fast" : downtownTime < 35 ? "~ Average" : "⚠ Slow"}`
      );

    // Central Park polygon
    L.polygon(AREA_BOUNDARIES.centralPark, {
      color: getPerformanceColor(cpTime),
      weight: 2,
      opacity: 0.8,
      fillOpacity: 0.6,
      fillColor: getPerformanceColor(cpTime),
    })
      .addTo(map.current!)
      .bindPopup(
        `<strong>Central Park</strong><br/>Avg Delivery Time: ${cpTime.toFixed(1)} min<br/>${cpTime < 20 ? "✓ Fast" : cpTime < 35 ? "~ Average" : "⚠ Slow"}`
      );

    // Both polygon
    L.polygon(AREA_BOUNDARIES.both, {
      color: getPerformanceColor(bothTime),
      weight: 2,
      opacity: 0.8,
      fillOpacity: 0.6,
      fillColor: getPerformanceColor(bothTime),
    })
      .addTo(map.current!)
      .bindPopup(
        `<strong>Both</strong><br/>Avg Delivery Time: ${bothTime.toFixed(1)} min<br/>${bothTime < 20 ? "✓ Fast" : bothTime < 35 ? "~ Average" : "⚠ Slow"}`
      );

    // Add restaurant marker
    L.marker([RESTAURANT_LOCATION.lat, RESTAURANT_LOCATION.lng], {
      title: "Restaurant Location",
    })
      .addTo(map.current!)
      .bindPopup("Restaurant - The Barrel");

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
      <div className="space-y-2 text-xs">
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-green-50 p-2 rounded">
            <div className="font-semibold text-green-900">Downtown</div>
            <div className="text-green-700">{(data?.downtown?.avgTime || 0).toFixed(1)} min</div>
          </div>
          <div className="bg-yellow-50 p-2 rounded">
            <div className="font-semibold text-yellow-900">Central Park</div>
            <div className="text-yellow-700">{(data?.centralPark?.avgTime || 0).toFixed(1)} min</div>
          </div>
          <div className="bg-red-50 p-2 rounded">
            <div className="font-semibold text-red-900">Both</div>
            <div className="text-red-700">{(data?.both?.avgTime || 0).toFixed(1)} min</div>
          </div>
        </div>
        <div className="bg-gray-50 p-2 rounded">
          <div className="font-semibold text-gray-700 mb-1">Performance Legend:</div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded"></div>
              <span>Fast (under 20 min)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-500 rounded"></div>
              <span>Average (20-35 min)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500 rounded"></div>
              <span>Slow (over 35 min)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
