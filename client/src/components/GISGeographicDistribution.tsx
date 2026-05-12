import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

interface GISGeographicDistributionProps {
  data?: {
    downtown?: number;
    centralPark?: number;
    both?: number;
    clusters?: Array<{
      lat: number;
      lng: number;
      orders: Array<{ id: number; area?: string; customerLatitude?: any; customerLongitude?: any }>;
      radius: number;
    }>;
    areaMetrics?: Record<string, { total: number; percentage: number; avgPerDay: number }>;
  };
}

const RESTAURANT_LOCATION = { lat: 42.90517, lng: -78.92295 };

// Approximate area boundaries for Fort Erie
const AREA_BOUNDARIES: Record<string, L.LatLngTuple[]> = {
  downtown: [
    [42.98, -79.06],
    [42.99, -79.06],
    [42.99, -79.04],
    [42.98, -79.04],
  ] as L.LatLngTuple[],
  centralPark: [
    [42.97, -79.06],
    [42.98, -79.06],
    [42.98, -79.04],
    [42.97, -79.04],
  ] as L.LatLngTuple[],
  both: [
    [42.99, -79.06],
    [43.0, -79.06],
    [43.0, -79.04],
    [42.99, -79.04],
  ] as L.LatLngTuple[],
};

export function GISGeographicDistribution({ data }: GISGeographicDistributionProps) {
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

    // Add order clusters as circle markers
    if (data?.clusters && data.clusters.length > 0) {
      data.clusters.forEach((cluster) => {
        const clusterSize = cluster.orders.length;
        const areaColors: Record<string, string> = {
          "Downtown": "#1e40af",
          "Central Park": "#16a34a",
          "Both": "#ea580c",
        };
        
        const dominantArea = cluster.orders[0]?.area || "Unknown";
        const color = areaColors[dominantArea] || "#6b7280";
        
        L.circleMarker([cluster.lat, cluster.lng], {
          radius: Math.min(5 + Math.sqrt(clusterSize) * 2, 20),
          fillColor: color,
          color: color,
          weight: 2,
          opacity: 0.8,
          fillOpacity: 0.6,
        })
          .addTo(map.current!)
          .bindPopup(`<strong>${dominantArea}</strong><br/>Orders in cluster: ${clusterSize}`);
      });
    }

    // Add area polygons with choropleth coloring (semi-transparent background)
    const totalOrders = (data?.downtown || 0) + (data?.centralPark || 0) + (data?.both || 0) || 1;

    // Downtown polygon
    L.polygon(AREA_BOUNDARIES.downtown, {
      color: "#1e40af",
      weight: 1,
      opacity: 0.3,
      fillOpacity: Math.min(0.1 + (data?.downtown || 0) / (totalOrders * 4), 0.2),
      fillColor: "#1e40af",
    })
      .addTo(map.current!)
      .bindPopup(
        `<strong>Downtown</strong><br/>Orders: ${data?.downtown || 0}<br/>Percentage: ${((data?.downtown || 0) / totalOrders * 100).toFixed(1)}%`
      );

    // Central Park polygon
    L.polygon(AREA_BOUNDARIES.centralPark, {
      color: "#16a34a",
      weight: 1,
      opacity: 0.3,
      fillOpacity: Math.min(0.1 + (data?.centralPark || 0) / (totalOrders * 4), 0.2),
      fillColor: "#16a34a",
    })
      .addTo(map.current!)
      .bindPopup(
        `<strong>Central Park</strong><br/>Orders: ${data?.centralPark || 0}<br/>Percentage: ${((data?.centralPark || 0) / totalOrders * 100).toFixed(1)}%`
      );

    // Both polygon
    L.polygon(AREA_BOUNDARIES.both, {
      color: "#ea580c",
      weight: 1,
      opacity: 0.3,
      fillOpacity: Math.min(0.1 + (data?.both || 0) / (totalOrders * 4), 0.2),
      fillColor: "#ea580c",
    })
      .addTo(map.current!)
      .bindPopup(
        `<strong>Both</strong><br/>Orders: ${data?.both || 0}<br/>Percentage: ${((data?.both || 0) / totalOrders * 100).toFixed(1)}%`
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
        <h3 className="text-sm font-medium text-gray-700">Geographic Distribution - GIS Map</h3>
      </div>
      <div
        ref={mapContainer}
        className="rounded-lg border border-gray-200 overflow-hidden"
        style={{ height: "500px" }}
      />
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="bg-blue-50 p-2 rounded">
          <div className="font-semibold text-blue-900">Downtown</div>
          <div className="text-blue-700">{data?.downtown || 0} orders</div>
        </div>
        <div className="bg-green-50 p-2 rounded">
          <div className="font-semibold text-green-900">Central Park</div>
          <div className="text-green-700">{data?.centralPark || 0} orders</div>
        </div>
        <div className="bg-orange-50 p-2 rounded">
          <div className="font-semibold text-orange-900">Both</div>
          <div className="text-orange-700">{data?.both || 0} orders</div>
        </div>
      </div>
    </div>
  );
}
