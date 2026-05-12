import { useEffect, useRef, useState } from "react";
import { MapView } from "./Map";

// Competitor type definition
interface CompetitorLocation {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  type: 'restaurant' | 'cafe' | 'fast_food' | 'pizza' | 'other';
}

// Fort Erie competitors (hardcoded - matches server data)
const FORT_ERIE_COMPETITORS: CompetitorLocation[] = [
  {
    name: 'Red Swan Pizza',
    address: '315 Garrison Rd Unit 8, Fort Erie, ON L2A 0G2',
    latitude: 42.9179,
    longitude: -78.9128,
    type: 'pizza',
  },
  {
    name: 'Crafted 1885',
    address: '1318 Dominion Rd, Fort Erie, ON L2A 1J3',
    latitude: 42.8854,
    longitude: -78.9372,
    type: 'restaurant',
  },
  {
    name: 'Take 2 Restaurant & Bar',
    address: '1882 Garrison Rd, Fort Erie, ON L2A 5M4',
    latitude: 42.9226,
    longitude: -78.9674,
    type: 'restaurant',
  },
  {
    name: "Rizzo's House of Parm",
    address: '2 Ridgeway Rd, Ridgeway, ON L0S 1N0',
    latitude: 42.8532,
    longitude: -79.0156,
    type: 'restaurant',
  },
  {
    name: "Rina's Place",
    address: '1206 Dominion Rd, Fort Erie, ON L2A 1H5',
    latitude: 42.8869,
    longitude: -78.9365,
    type: 'restaurant',
  },
  {
    name: "Tahini's",
    address: '450 Garrison Rd Unit #103, Fort Erie, ON L2A 1N2',
    latitude: 42.9158,
    longitude: -78.9124,
    type: 'fast_food',
  },
  {
    name: "Osmow's Shawarma",
    address: '385 Garrison Rd, Fort Erie, ON L2A 1N1',
    latitude: 42.9148,
    longitude: -78.9117,
    type: 'fast_food',
  },
  {
    name: 'The Plaice Bar & Grill',
    address: '981 Garrison Rd, Fort Erie, ON L2A 1N8',
    latitude: 42.9186,
    longitude: -78.9135,
    type: 'restaurant',
  },
  {
    name: 'Pizza Hut',
    address: '450 Garrison Rd Unit # 130, Fort Erie, ON L2A 1N2',
    latitude: 42.9158,
    longitude: -78.9124,
    type: 'pizza',
  },
  {
    name: "Arby's",
    address: '199 Garrison Rd, Fort Erie, ON L2A 1M6',
    latitude: 42.9135,
    longitude: -78.9111,
    type: 'fast_food',
  },
  {
    name: 'Little Red Coffee & Catering (Fort Erie)',
    address: '46 Queen St, Fort Erie, ON L2A 1T8',
    latitude: 42.9089,
    longitude: -78.9198,
    type: 'cafe',
  },
  {
    name: 'Southsides Patio Bar & Grill',
    address: '80 Niagara Blvd, Fort Erie, ON L2A 3G3',
    latitude: 42.8868,
    longitude: -78.9288,
    type: 'restaurant',
  },
  {
    name: 'City Thai Restaurant',
    address: '93 Niagara Blvd, Fort Erie, ON L2A 3G4',
    latitude: 42.8876,
    longitude: -78.9295,
    type: 'restaurant',
  },
];

interface EmergingZone {
  zoneId: string;
  hexId: string;
  centerLat: number;
  centerLng: number;
  emergingScore: number;
  classification: string;
  color: string;
  totalOrders: number;
}

interface EmergingZonesMapProps {
  zones: EmergingZone[];
  selectedZoneId?: string;
  onZoneClick?: (zoneId: string) => void;
}

/**
 * Convert hex color to RGBA with opacity
 */
function hexToRgba(hex: string, opacity: number = 0.6): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

/**
 * Get color for competitor type
 */
function getCompetitorColor(type: string): string {
  switch (type) {
    case 'restaurant':
      return '#EF4444'; // Red
    case 'cafe':
      return '#F59E0B'; // Amber
    case 'fast_food':
      return '#3B82F6'; // Blue
    case 'pizza':
      return '#DC2626'; // Dark Red
    default:
      return '#6B7280'; // Gray
  }
}

/**
 * Draw a circle on the map (zone visualization)
 */
function drawZoneCircle(
  map: google.maps.Map,
  centerLat: number,
  centerLng: number,
  radiusKm: number,
  color: string,
  label: string,
  isSelected: boolean
): google.maps.Circle {
  const circle = new google.maps.Circle({
    map,
    center: { lat: centerLat, lng: centerLng },
    radius: radiusKm * 1000, // Convert km to meters
    fillColor: hexToRgba(color, isSelected ? 0.8 : 0.5),
    fillOpacity: isSelected ? 0.8 : 0.5,
    strokeColor: color,
    strokeWeight: isSelected ? 3 : 2,
    strokeOpacity: 1,
  });

  return circle;
}

/**
 * Create a marker with custom content
 */
function createMarker(
  map: google.maps.Map,
  lat: number,
  lng: number,
  title: string,
  icon: string,
  color: string
): google.maps.Marker {
  const marker = new google.maps.Marker({
    map,
    position: { lat, lng },
    title,
    icon: {
      path: google.maps.SymbolPath.CIRCLE,
      scale: 8,
      fillColor: color,
      fillOpacity: 1,
      strokeColor: '#FFFFFF',
      strokeWeight: 2,
    },
  });

  // Add info window
  const infoWindow = new google.maps.InfoWindow({
    content: `<div style="padding: 8px; font-size: 12px;"><strong>${title}</strong></div>`,
  });

  marker.addListener('click', () => {
    infoWindow.open(map, marker);
  });

  return marker;
}

export function EmergingZonesMap({
  zones,
  selectedZoneId,
  onZoneClick,
}: EmergingZonesMapProps) {
  const mapRef = useRef<google.maps.Map | null>(null);
  const circlesRef = useRef<google.maps.Circle[]>([]);
  const markersRef = useRef<google.maps.Marker[]>([]);

  const handleMapReady = (map: google.maps.Map) => {
    mapRef.current = map;

    // Clear previous circles and markers
    circlesRef.current.forEach(circle => circle.setMap(null));
    markersRef.current.forEach(marker => marker.setMap(null));
    circlesRef.current = [];
    markersRef.current = [];

    if (zones.length === 0) {
      // Center on Fort Erie if no zones
      map.setCenter({ lat: 42.90517, lng: -78.92295 });
      map.setZoom(13);
      return;
    }

    // Calculate bounds to fit all zones
    const bounds = new google.maps.LatLngBounds();

    // Draw zone circles
    zones.forEach((zone) => {
      const isSelected = zone.zoneId === selectedZoneId;
      const radiusKm = 0.5; // 500m radius for visualization

      const circle = drawZoneCircle(
        map,
        zone.centerLat,
        zone.centerLng,
        radiusKm,
        zone.color,
        `Zone: ${zone.classification} (Score: ${(zone.emergingScore * 100).toFixed(0)}%)`,
        isSelected
      );

      circlesRef.current.push(circle);
      bounds.extend({ lat: zone.centerLat, lng: zone.centerLng });

      // Add zone center marker
      const marker = createMarker(
        map,
        zone.centerLat,
        zone.centerLng,
        `Zone ${zones.indexOf(zone) + 1}: ${zone.totalOrders} orders`,
        'Z',
        zone.color
      );
      markersRef.current.push(marker);

      // Add click listener to zone marker
      marker.addListener('click', () => {
        onZoneClick?.(zone.zoneId);
      });
    });

    // Draw competitor markers
    FORT_ERIE_COMPETITORS.forEach((competitor: CompetitorLocation) => {
      const color = getCompetitorColor(competitor.type);
      const marker = createMarker(
        map,
        competitor.latitude,
        competitor.longitude,
        `${competitor.name} (${competitor.type})`,
        'C',
        color
      );
      markersRef.current.push(marker);
      bounds.extend({ lat: competitor.latitude, lng: competitor.longitude });
    });

    // Fit map to bounds
    if (zones.length > 0 || FORT_ERIE_COMPETITORS.length > 0) {
      map.fitBounds(bounds);
      // Add padding
      const padding = { top: 50, right: 50, bottom: 50, left: 50 };
      map.fitBounds(bounds, padding);
    }
  };

  // Update circles when selected zone changes
  useEffect(() => {
    if (!mapRef.current) return;

    circlesRef.current.forEach((circle, idx) => {
      if (idx < zones.length) {
        const zone = zones[idx];
        const isSelected = zone.zoneId === selectedZoneId;
        const radiusKm = 0.5;

        circle.setOptions({
          fillColor: hexToRgba(zone.color, isSelected ? 0.8 : 0.5),
          fillOpacity: isSelected ? 0.8 : 0.5,
          strokeWeight: isSelected ? 3 : 2,
        });
      }
    });
  }, [selectedZoneId, zones]);

  return (
    <div className="w-full h-full rounded-lg overflow-hidden">
      <MapView
        initialCenter={{ lat: 42.90517, lng: -78.92295 }}
        initialZoom={13}
        onMapReady={handleMapReady}
        className="w-full h-full"
      />
      
      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-4 text-sm max-w-xs">
        <h3 className="font-semibold mb-2">Map Legend</h3>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#22C55E' }}></div>
            <span>Rapid Emerging Zone</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#3B82F6' }}></div>
            <span>Early Growth Zone</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#6B7280' }}></div>
            <span>Stable Zone</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#F59E0B' }}></div>
            <span>Saturated Zone</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#EF4444' }}></div>
            <span>Declining Zone</span>
          </div>
          <hr className="my-2" />
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#EF4444' }}></div>
            <span className="text-xs">Restaurant</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#F59E0B' }}></div>
            <span className="text-xs">Cafe</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#3B82F6' }}></div>
            <span className="text-xs">Fast Food</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#DC2626' }}></div>
            <span className="text-xs">Pizza</span>
          </div>
        </div>
      </div>
    </div>
  );
}
