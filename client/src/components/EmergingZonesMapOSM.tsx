import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface EmergingZone {
  zoneId: string;
  hexId: string;
  centerLat: number;
  centerLng: number;
  emergingScore: number;
  classification: string;
  color: string;
  totalOrders: number;
  orderLocations?: Array<{ lat: number; lng: number; orderId: string }>;
}

interface CompetitorLocation {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  type: 'restaurant' | 'cafe' | 'fast_food' | 'pizza' | 'other';
}

interface EmergingZonesMapOSMProps {
  zones: EmergingZone[];
  competitors: CompetitorLocation[];
  selectedZoneId?: string;
  onZoneClick?: (zoneId: string) => void;
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
 * Create SVG circle icon for zones
 */
function createZoneIcon(color: string, isSelected: boolean): L.DivIcon {
  const size = isSelected ? 20 : 16;
  const borderWidth = isSelected ? 3 : 2;
  
  return L.divIcon({
    html: `
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
        <circle cx="${size/2}" cy="${size/2}" r="${size/2 - borderWidth/2}" fill="${color}" stroke="white" stroke-width="${borderWidth}" opacity="0.8"/>
      </svg>
    `,
    iconSize: [size, size],
    className: 'zone-marker',
  });
}

/**
 * Create SVG circle icon for competitors
 */
function createCompetitorIcon(color: string): L.DivIcon {
  return L.divIcon({
    html: `
      <svg width="12" height="12" viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg">
        <circle cx="6" cy="6" r="5" fill="${color}" stroke="white" stroke-width="1"/>
      </svg>
    `,
    iconSize: [12, 12],
    className: 'competitor-marker',
  });
}

export function EmergingZonesMapOSM({
  zones,
  competitors,
  selectedZoneId,
  onZoneClick,
}: EmergingZonesMapOSMProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layersRef = useRef<{
    zones: L.Marker[];
    competitors: L.Marker[];
    circles: L.Circle[];
    orders: L.CircleMarker[];
  }>({
    zones: [],
    competitors: [],
    circles: [],
    orders: [],
  });

  useEffect(() => {
    if (!mapContainer.current) return;

    // Initialize map
    if (!map.current) {
      map.current = L.map(mapContainer.current).setView([42.90517, -78.92295], 13);

      // Add OpenStreetMap tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map.current);

      // Add scale control
      L.control.scale().addTo(map.current);
    }

    // Clear previous layers
    layersRef.current.zones.forEach(marker => {
      if (map.current) map.current.removeLayer(marker);
    });
    layersRef.current.competitors.forEach(marker => {
      if (map.current) map.current.removeLayer(marker);
    });
    layersRef.current.circles.forEach(circle => {
      if (map.current) map.current.removeLayer(circle);
    });
    layersRef.current.orders.forEach(marker => {
      if (map.current) map.current.removeLayer(marker);
    });
    layersRef.current = { zones: [], competitors: [], circles: [], orders: [] };

    if (!map.current) return;

    const bounds = new L.LatLngBounds([]);

    // Add zone circles and markers
    zones.forEach((zone) => {
      if (!map.current) return;
      const isSelected = zone.zoneId === selectedZoneId;
      const radiusMeters = 500; // 500m radius

      // Draw circle
      const circle = L.circle([zone.centerLat, zone.centerLng], {
        radius: radiusMeters,
        color: zone.color,
        weight: isSelected ? 3 : 2,
        opacity: 1,
        fill: true,
        fillColor: zone.color,
        fillOpacity: isSelected ? 0.6 : 0.3,
      }).addTo(map.current);

      layersRef.current.circles.push(circle);
      bounds.extend([zone.centerLat, zone.centerLng]);

      // Add marker
      const marker = L.marker([zone.centerLat, zone.centerLng], {
        icon: createZoneIcon(zone.color, isSelected),
        title: `Zone: ${zone.classification} (${(zone.emergingScore * 100).toFixed(0)}%)`,
      })
        .bindPopup(
          `<div style="padding: 8px; font-size: 12px;">
            <strong>${zone.classification.replace(/_/g, ' ').toUpperCase()}</strong><br/>
            Score: ${(zone.emergingScore * 100).toFixed(0)}%<br/>
            Orders: ${zone.totalOrders}
          </div>`
        )
        .addTo(map.current);

      marker.on('click', () => {
        onZoneClick?.(zone.zoneId);
      });

      layersRef.current.zones.push(marker);

      // Add order location markers within this zone
      if (zone.orderLocations && zone.orderLocations.length > 0) {
        zone.orderLocations.forEach((order) => {
          const orderMarker = L.circleMarker([order.lat, order.lng], {
            radius: 4,
            fillColor: zone.color,
            color: '#fff',
            weight: 1,
            opacity: 0.8,
            fillOpacity: 0.6,
          })
            .bindPopup(`<div style="padding: 4px; font-size: 11px;">Order: ${order.orderId}</div>`)
            .addTo(map.current!);
          layersRef.current.orders.push(orderMarker);
        });
      }
    });

    // Add competitor markers
    competitors.forEach((competitor) => {
      if (!map.current) return;
      const color = getCompetitorColor(competitor.type);
      const marker = L.marker([competitor.latitude, competitor.longitude], {
        icon: createCompetitorIcon(color),
        title: `${competitor.name} (${competitor.type})`,
      })
        .bindPopup(
          `<div style="padding: 8px; font-size: 12px;">
            <strong>${competitor.name}</strong><br/>
            <small>${competitor.type}</small><br/>
            <small>${competitor.address}</small>
          </div>`
        )
        .addTo(map.current);

      layersRef.current.competitors.push(marker);
      bounds.extend([competitor.latitude, competitor.longitude]);
    });

    // Fit bounds
    if (bounds.isValid()) {
      map.current.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [zones, competitors, selectedZoneId, onZoneClick]);

  return (
    <div className="w-full h-full flex flex-col">
      <div ref={mapContainer} className="flex-1 rounded-lg overflow-hidden" />

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-4 text-sm max-w-xs z-10">
        <h3 className="font-semibold mb-2">Map Legend</h3>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#22C55E' }}></div>
            <span>Rapid Emerging</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#3B82F6' }}></div>
            <span>Early Growth</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#6B7280' }}></div>
            <span>Stable</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#F59E0B' }}></div>
            <span>Saturated</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#EF4444' }}></div>
            <span>Declining</span>
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
          <hr className="my-2" />
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#999' }}></div>
            <span className="text-xs">Order Locations</span>
          </div>
        </div>
      </div>
    </div>
  );
}
