import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Checkbox } from "@/components/ui/checkbox";

interface Driver {
  name: string;
  color: string;
  deliveries: number;
  avgTime: number;
}

interface GISDriverPerformanceProps {
  drivers?: Driver[];
  driverMetrics?: Record<number, { locations?: Array<{ id: number; customerLatitude?: any; customerLongitude?: any; area?: string }>; totalDeliveries: number; avgDeliveryTime: number }>;
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

export function GISDriverPerformance({ drivers = [], driverMetrics = {} }: GISDriverPerformanceProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const [visibleDrivers, setVisibleDrivers] = useState<Set<string>>(
    new Set(drivers.map((d) => d.name))
  );

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

    // Clear all markers except restaurant
    map.current.eachLayer((layer) => {
      if (layer instanceof L.CircleMarker || (layer instanceof L.Marker && layer.getPopup()?.getContent() !== "Restaurant - The Barrel")) {
        map.current!.removeLayer(layer);
      }
    });

    // Add driver delivery locations
    drivers.forEach((driver) => {
      if (!visibleDrivers.has(driver.name)) return;

      const driverId = Object.keys(driverMetrics).find(
        (id) => driverMetrics[parseInt(id)]?.locations?.some(() => true)
      );

      if (driverId) {
        const metrics = driverMetrics[parseInt(driverId)];
        if (metrics?.locations) {
          metrics.locations.forEach((order) => {
            if (!order.customerLatitude || !order.customerLongitude) return;

            L.circleMarker(
              [parseFloat(order.customerLatitude), parseFloat(order.customerLongitude)],
              {
                radius: 6,
                fillColor: driver.color,
                color: driver.color,
                weight: 2,
                opacity: 0.8,
                fillOpacity: 0.6,
              }
            )
              .addTo(map.current!)
              .bindPopup(
                `<strong>${driver.name}</strong><br/>${order.area || "Unknown"}<br/>Order #${order.id}`
              );
          });
        }
      }
    });
  }, [visibleDrivers, drivers, driverMetrics]);

  const toggleDriver = (driverName: string) => {
    const newVisible = new Set(visibleDrivers);
    if (newVisible.has(driverName)) {
      newVisible.delete(driverName);
    } else {
      newVisible.add(driverName);
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
      <div className="bg-gray-50 p-2 rounded space-y-2 max-h-40 overflow-y-auto">
        <div className="font-semibold text-sm text-gray-700">Drivers</div>
        {drivers.map((driver) => (
          <div key={driver.name} className="flex items-center gap-2">
            <Checkbox
              checked={visibleDrivers.has(driver.name)}
              onCheckedChange={() => toggleDriver(driver.name)}
            />
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: driver.color }}
            ></div>
            <span className="text-xs">
              {driver.name} ({driver.deliveries} deliveries, {driver.avgTime.toFixed(1)}m avg)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
