import { useState, useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw } from "lucide-react";

interface GISTimeAnalysisProps {
  data?: {
    hourlyData?: Array<{
      hour: number;
      downtown: number;
      centralPark: number;
      both: number;
    }>;
  };
}

const RESTAURANT_LOCATION = { lat: 42.90517, lng: -78.92295 };

const TIME_SLOTS = {
  morning: { label: "Morning (6-12)", color: "#fbbf24", range: [6, 12] },
  afternoon: { label: "Afternoon (12-18)", color: "#f97316", range: [12, 18] },
  evening: { label: "Evening (18-24)", color: "#8b5cf6", range: [18, 24] },
  night: { label: "Night (0-6)", color: "#1e3a8a", range: [0, 6] },
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

    // Generate sample delivery points for current hour
    const hourData = data?.hourlyData?.find((d) => d.hour === currentHour);
    const totalOrders = (hourData?.downtown || 0) + (hourData?.centralPark || 0) + (hourData?.both || 0) || 1;

    // Downtown deliveries
    for (let i = 0; i < (hourData?.downtown || 0); i++) {
      const angle = (Math.random() * Math.PI * 2);
      const distance = 0.005 + Math.random() * 0.01;
      const marker = L.circleMarker(
        [
          RESTAURANT_LOCATION.lat + Math.cos(angle) * distance,
          RESTAURANT_LOCATION.lng + Math.sin(angle) * distance,
        ],
        {
          radius: 4,
          fillColor: "#1e40af",
          color: "#1e40af",
          weight: 1,
          opacity: 0.7,
          fillOpacity: 0.5,
        }
      )
        .addTo(map.current!)
        .bindPopup(`Downtown - Hour ${currentHour}`);
      markersRef.current.push(marker);
    }

    // Central Park deliveries
    for (let i = 0; i < (hourData?.centralPark || 0); i++) {
      const angle = (Math.random() * Math.PI * 2);
      const distance = 0.005 + Math.random() * 0.01;
      const marker = L.circleMarker(
        [
          RESTAURANT_LOCATION.lat + Math.cos(angle) * distance,
          RESTAURANT_LOCATION.lng + Math.sin(angle) * distance,
        ],
        {
          radius: 4,
          fillColor: "#16a34a",
          color: "#16a34a",
          weight: 1,
          opacity: 0.7,
          fillOpacity: 0.5,
        }
      )
        .addTo(map.current!)
        .bindPopup(`Central Park - Hour ${currentHour}`);
      markersRef.current.push(marker);
    }

    // Both area deliveries
    for (let i = 0; i < (hourData?.both || 0); i++) {
      const angle = (Math.random() * Math.PI * 2);
      const distance = 0.005 + Math.random() * 0.01;
      const marker = L.circleMarker(
        [
          RESTAURANT_LOCATION.lat + Math.cos(angle) * distance,
          RESTAURANT_LOCATION.lng + Math.sin(angle) * distance,
        ],
        {
          radius: 4,
          fillColor: "#ea580c",
          color: "#ea580c",
          weight: 1,
          opacity: 0.7,
          fillOpacity: 0.5,
        }
      )
        .addTo(map.current!)
        .bindPopup(`Both - Hour ${currentHour}`);
      markersRef.current.push(marker);
    }
  }, [currentHour, data]);

  // Animation loop
  useEffect(() => {
    if (!isAnimating) return;

    const interval = setInterval(() => {
      setCurrentHour((prev) => (prev + 1) % 24);
    }, 1000);

    return () => clearInterval(interval);
  }, [isAnimating]);

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
          className="gap-2"
        >
          {isAnimating ? (
            <>
              <Pause className="w-4 h-4" />
              Pause
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              Play
            </>
          )}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setIsAnimating(false);
            setCurrentHour(0);
          }}
          className="gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          Reset
        </Button>
        <div className="text-sm font-semibold text-gray-700 ml-auto">
          Hour: {currentHour}:00 - {TIME_SLOTS[getTimeSlot(currentHour) as keyof typeof TIME_SLOTS].label}
        </div>
      </div>

      <div
        ref={mapContainer}
        className="rounded-lg border border-gray-200 overflow-hidden"
        style={{ height: "500px" }}
      />

      <div className="space-y-2 text-xs">
        <div className="bg-gray-50 p-2 rounded">
          <div className="font-semibold text-gray-700 mb-2">Time Slots Legend:</div>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(TIME_SLOTS).map(([key, slot]) => (
              <div key={key} className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: slot.color }}
                ></div>
                <span>{slot.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
