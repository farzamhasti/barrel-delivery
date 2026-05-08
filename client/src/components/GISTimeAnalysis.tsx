import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw } from "lucide-react";

interface GISTimeAnalysisProps {
  data?: {
    hourlyData?: Array<{
      hour: number;
      total: number;
      areaBreakdown?: Record<string, number>;
    }>;
    orders?: Array<{ id: number; createdAt: any; customerLatitude?: any; customerLongitude?: any; area?: string }>;
    peakHour?: number;
  };
}

const RESTAURANT_LOCATION = { lat: 42.90517, lng: -78.92295 };

const TIME_SLOTS = {
  morning: { label: "Morning (6-12)", color: "#fbbf24", range: [6, 12] },
  afternoon: { label: "Afternoon (12-18)", color: "#f97316", range: [12, 18] },
  evening: { label: "Evening (18-24)", color: "#8b5cf6", range: [18, 24] },
  night: { label: "Night (0-6)", color: "#1e3a8a", range: [0, 6] },
};

const AREA_COLORS: Record<string, string> = {
  "Downtown": "#1e40af",
  "Central Park": "#16a34a",
  "Both": "#ea580c",
};

const getTimeSlot = (hour: number) => {
  if (hour >= 6 && hour < 12) return "morning";
  if (hour >= 12 && hour < 18) return "afternoon";
  if (hour >= 18) return "evening";
  return "night";
};

const getTimeSlotColor = (hour: number) => {
  const slot = getTimeSlot(hour);
  return TIME_SLOTS[slot as keyof typeof TIME_SLOTS].color;
};

const getHourFromDate = (dateValue: any): number => {
  try {
    if (dateValue instanceof Date) {
      return dateValue.getHours();
    }
    if (typeof dateValue === "string") {
      return new Date(dateValue).getHours();
    }
    return 0;
  } catch {
    return 0;
  }
};

export function GISTimeAnalysis({ data }: GISTimeAnalysisProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const [currentHour, setCurrentHour] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const markersRef = useRef<L.CircleMarker[]>([]);

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

  // Update markers based on current hour
  useEffect(() => {
    if (!map.current) return;

    // Clear existing markers
    markersRef.current.forEach((marker) => map.current!.removeLayer(marker));
    markersRef.current = [];

    // Filter orders by current hour
    const hourOrders = data?.orders?.filter((order) => {
      const hour = getHourFromDate(order.createdAt);
      return hour === currentHour;
    }) || [];

    // Add actual order locations
    hourOrders.forEach((order) => {
      const lat = parseFloat(String(order.customerLatitude || 0));
      const lng = parseFloat(String(order.customerLongitude || 0));
      
      if (lat === 0 && lng === 0) return;
      
      const area = order.area || "Unknown";
      const color = AREA_COLORS[area] || "#6b7280";
      
      const marker = L.circleMarker(
        [lat, lng],
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
        .bindPopup(`<strong>${area}</strong><br/>Order #${order.id}<br/>Hour: ${currentHour}:00`);
      markersRef.current.push(marker);
    });
  }, [currentHour, data]);

  // Animation loop
  useEffect(() => {
    if (!isAnimating) return;

    const interval = setInterval(() => {
      setCurrentHour((prev) => (prev + 1) % 24);
    }, 1000);

    return () => clearInterval(interval);
  }, [isAnimating]);

  const hourData = data?.hourlyData?.find((d) => d.hour === currentHour);
  const totalOrdersThisHour = hourData?.total || 0;

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium text-gray-700">Time Analysis - GIS Map</h3>
      </div>

      {/* Animation Controls */}
      <div className="flex gap-2 items-center bg-gray-50 p-2 rounded">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsAnimating(!isAnimating)}
          className="gap-1"
        >
          {isAnimating ? (
            <>
              <Pause className="w-4 h-4" /> Pause
            </>
          ) : (
            <>
              <Play className="w-4 h-4" /> Play
            </>
          )}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentHour(0)}
          className="gap-1"
        >
          <RotateCcw className="w-4 h-4" /> Reset
        </Button>
        <span className="text-xs font-medium text-gray-700 ml-auto">
          Hour: {currentHour}:00 - {getTimeSlot(currentHour).charAt(0).toUpperCase() + getTimeSlot(currentHour).slice(1)} ({totalOrdersThisHour} orders)
        </span>
      </div>

      {/* Map */}
      <div
        ref={mapContainer}
        className="rounded-lg border border-gray-200 overflow-hidden"
        style={{ height: "500px" }}
      />

      {/* Legend */}
      <div className="bg-gray-50 p-2 rounded text-xs space-y-1">
        <div className="font-semibold text-gray-700">Time Slots</div>
        <div className="grid grid-cols-2 gap-1">
          {Object.entries(TIME_SLOTS).map(([key, slot]) => (
            <div key={key} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: slot.color }}
              ></div>
              <span className="text-gray-600">{slot.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
