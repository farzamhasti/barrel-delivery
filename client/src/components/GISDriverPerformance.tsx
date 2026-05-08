import { useState, useEffect, useRef } from "react";
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
}

const RESTAURANT_LOCATION = { lat: 43.2589, lng: -79.8711 };

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

export function GISDriverPerformance({ drivers = [] }: GISDriverPerformanceProps) {
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

    // Add driver routes
    drivers.forEach((driver, index) => {
      if (!visibleDrivers.has(driver.name)) return;

      const color = driver.color || DRIVER_COLORS[index % DRIVER_COLORS.length];

      // Generate sample delivery points around restaurant
      const deliveryPoints = [];
      for (let i = 0; i < Math.min(driver.deliveries, 5); i++) {
        const angle = (i / driver.deliveries) * Math.PI * 2;
        const distance = 0.01 + Math.random() * 0.02;
        deliveryPoints.push([
          RESTAURANT_LOCATION.lat + Math.cos(angle) * distance,
          RESTAURANT_LOCATION.lng + Math.sin(angle) * distance,
        ]);
      }

      // Draw route lines
      if (deliveryPoints.length > 0) {
        const routePoints = [
          [RESTAURANT_LOCATION.lat, RESTAURANT_LOCATION.lng],
          ...deliveryPoints,
        ];

        L.polyline(routePoints as L.LatLngExpression[], {
          color: color,
          weight: 2,
          opacity: 0.7,
          dashArray: "5, 5",
        })
          .addTo(map.current!)
          .bindPopup(`${driver.name}'s Route`);

        // Add delivery stop markers
        deliveryPoints.forEach((point, idx) => {
          L.circleMarker(point as L.LatLngExpression, {
            radius: 5,
            fillColor: color,
            color: color,
            weight: 2,
            opacity: 0.8,
            fillOpacity: 0.6,
          })
            .addTo(map.current!)
            .bindPopup(`${driver.name} - Stop ${idx + 1}`);
        });
      }
    });

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [drivers, visibleDrivers]);

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
      <div className="space-y-2">
        <div className="text-xs font-semibold text-gray-700">Toggle Drivers:</div>
        <div className="grid grid-cols-2 gap-2">
          {drivers.map((driver, index) => (
            <div key={driver.name} className="flex items-center gap-2">
              <Checkbox
                id={driver.name}
                checked={visibleDrivers.has(driver.name)}
                onCheckedChange={() => toggleDriver(driver.name)}
              />
              <label
                htmlFor={driver.name}
                className="text-xs cursor-pointer flex items-center gap-2"
              >
                <div
                  className="w-3 h-3 rounded"
                  style={{
                    backgroundColor: driver.color || DRIVER_COLORS[index % DRIVER_COLORS.length],
                  }}
                ></div>
                {driver.name}
              </label>
            </div>
          ))}
        </div>
        <div className="bg-gray-50 p-2 rounded">
          <div className="text-xs font-semibold text-gray-700 mb-2">Driver Stats:</div>
          <div className="space-y-1">
            {drivers.map((driver, index) => (
              <div key={driver.name} className="text-xs text-gray-600">
                <strong>{driver.name}:</strong> {driver.deliveries} orders, {driver.avgTime.toFixed(1)} min avg
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
