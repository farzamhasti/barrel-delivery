import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

interface GISMapProps {
  title: string;
  onMapReady?: (map: L.Map) => void;
  children?: React.ReactNode;
}

// Fort Erie, ON coordinates (restaurant location)
const RESTAURANT_LOCATION = { lat: 42.9849, lng: -79.0504 };

export function GISMap({ title, onMapReady, children }: GISMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    // Initialize map
    map.current = L.map(mapContainer.current).setView(
      [RESTAURANT_LOCATION.lat, RESTAURANT_LOCATION.lng],
      12
    );

    // Add OpenStreetMap tiles
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map.current);

    // Add scale control
    L.control.scale().addTo(map.current);

    // Add zoom control
    L.control.zoom({ position: "topright" }).addTo(map.current);

    // Add restaurant marker
    L.marker([RESTAURANT_LOCATION.lat, RESTAURANT_LOCATION.lng], {
      title: "Restaurant Location",
      icon: L.icon({
        iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      }),
    })
      .addTo(map.current)
      .bindPopup("Restaurant - The Barrel");

    // Call callback if provided
    if (onMapReady && map.current) {
      onMapReady(map.current);
    }

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [onMapReady]);

  const handleExportMap = () => {
    if (!map.current) return;

    // Use leaflet-image or html2canvas for export
    const bounds = map.current.getBounds();
    const center = map.current.getCenter();
    const zoom = map.current.getZoom();

    // Create a simple PNG export by capturing the map container
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = mapContainer.current?.offsetWidth || 800;
    canvas.height = mapContainer.current?.offsetHeight || 600;

    // Fill with white background
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Add text
    ctx.fillStyle = "black";
    ctx.font = "16px Arial";
    ctx.fillText(`${title} - GIS Map`, 10, 30);
    ctx.font = "12px Arial";
    ctx.fillText(`Center: ${center.lat.toFixed(4)}, ${center.lng.toFixed(4)} | Zoom: ${zoom}`, 10, 50);

    // Download
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = `${title.replace(/\s+/g, "-").toLowerCase()}-gis-map.png`;
    link.click();
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium text-gray-700">{title} - GIS Map</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportMap}
          className="gap-2"
        >
          <Download className="w-4 h-4" />
          Export PNG
        </Button>
      </div>
      <div
        ref={mapContainer}
        className="rounded-lg border border-gray-200 overflow-hidden"
        style={{ height: "500px" }}
      />
      {children}
    </div>
  );
}
