import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Checkbox } from "@/components/ui/checkbox";

interface Order {
  id: number;
  customerLatitude?: string | number;
  customerLongitude?: string | number;
  area?: string;
}

interface DriverMetrics {
  totalDeliveries: number;
  avgDeliveryTime: number;
  onTimeRate: number;
  mostFrequentArea: string;
  efficiencyScore: number;
  locations?: Order[];
  driverId?: string;
  driverName?: string;
}

interface GISDriverPerformanceProps {
  driverMetrics?: Record<string | number, DriverMetrics>;
}

const RESTAURANT_LOCATION = { lat: 42.90517, lng: -78.92295 };

const DRIVER_COLORS = [
  "#FF6B6B",
  "#4ECDC4",
  "#45B7D1",
  "#FFA07A",
  "#98D8C8",
  "#F7DC6F",
  "#BB8FCE",
  "#85C1E2",
];

export function GISDriverPerformance({ driverMetrics = {} }: GISDriverPerformanceProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.CircleMarker[]>>(new Map());
  const [visibleDrivers, setVisibleDrivers] = useState<Set<string>>(new Set());

  // Sync visible drivers when driverMetrics loads
  useEffect(() => {
    setVisibleDrivers(new Set(Object.keys(driverMetrics)));
  }, [driverMetrics]);

  // Build driver list with names and colors
  const driverList = Object.entries(driverMetrics).map(([driverId, metrics], index) => ({
    id: driverId,
    name: metrics.driverName ?? metrics.driverId ?? `Driver ${driverId}`,
    color: DRIVER_COLORS[index % DRIVER_COLORS.length],
    deliveries: metrics.totalDeliveries || 0,
    avgTime: metrics.avgDeliveryTime || 0,
    metrics,
  }));

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

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Update driver markers based on visibility
  useEffect(() => {
    if (!map.current) return;

    // Clear all existing driver markers
    markersRef.current.forEach((markers) => {
      markers.forEach((marker) => map.current!.removeLayer(marker));
    });
    markersRef.current.clear();

    // Add driver delivery locations
    driverList.forEach((driver) => {
      if (!visibleDrivers.has(driver.id)) return;

      const driverMarkers: L.CircleMarker[] = [];

      if (driver.metrics.locations && driver.metrics.locations.length > 0) {
        driver.metrics.locations.forEach((order) => {
          const lat = parseFloat(String(order.customerLatitude || 0));
          const lng = parseFloat(String(order.customerLongitude || 0));

          if (lat === 0 && lng === 0) return;

          const marker = L.circleMarker([lat, lng], {
            radius: 7,
            fillColor: driver.color,
            color: "#333",
            weight: 2,
            opacity: 1,
            fillOpacity: 0.8,
          })
            .addTo(map.current!)
            .bindPopup(
              `<strong>${driver.name}</strong><br/>Order #${order.id}<br/>${order.area || "Unknown Area"}`
            );

          driverMarkers.push(marker);
        });
      }

      markersRef.current.set(driver.id, driverMarkers);
    });
  }, [visibleDrivers, driverList]);

  const toggleDriver = (driverId: string) => {
    const newVisible = new Set(visibleDrivers);
    if (newVisible.has(driverId)) {
      newVisible.delete(driverId);
    } else {
      newVisible.add(driverId);
    }
    setVisibleDrivers(newVisible);
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium text-gray-700">Driver Performance - GIS Map</h3>
      </div>
      <div
        ref={mapContainer}
        className="rounded-lg border border-gray-200 overflow-hidden"
        style={{ height: "500px" }}
      />
      <div className="bg-gray-50 p-3 rounded space-y-2 max-h-48 overflow-y-auto">
        <div className="font-semibold text-sm text-gray-700">Drivers</div>
        {driverList.length === 0 ? (
          <p className="text-xs text-gray-500">No driver data available</p>
        ) : (
          driverList.map((driver) => (
            <div key={driver.id} className="flex items-center gap-2">
              <Checkbox
                checked={visibleDrivers.has(driver.id)}
                onCheckedChange={() => toggleDriver(driver.id)}
              />
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: driver.color }}
              ></div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-gray-700 truncate">{driver.name}</div>
                <div className="text-xs text-gray-500">
                  {driver.deliveries} deliveries • {driver.avgTime.toFixed(1)}m avg • {driver.metrics.onTimeRate.toFixed(0)}% on-time
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
