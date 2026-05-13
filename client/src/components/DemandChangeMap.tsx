import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import * as h3 from 'h3-js';

interface DemandZone {
  hexId: string;
  latitude: number;
  longitude: number;
  previousPeriodOrders: number;
  currentPeriodOrders: number;
  orderDensityChange: number;
  growthPercentage: number;
  classification: 'Strong Growth' | 'Moderate Growth' | 'Stable' | 'Weakening' | 'Rapid Decline';
  avgWaitingTimePrevious: number;
  avgWaitingTimeCurrent: number;
  waitingTimeTrend: number;
  avgDeliveryTimePrevious: number;
  avgDeliveryTimeCurrent: number;
  deliveryTimeTrend: number;
  orderLocations: Array<{ lat: number; lon: number; orderId: string }>;
}

interface DemandChangeMapProps {
  zones: DemandZone[];
  onZoneClick: (zone: DemandZone) => void;
}

export function DemandChangeMap({ zones, onZoneClick }: DemandChangeMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const getClassificationColor = (classification: string): string => {
    switch (classification) {
      case 'Strong Growth':
        return '#15803d'; // Dark green
      case 'Moderate Growth':
        return '#4ade80'; // Light green
      case 'Stable':
        return '#eab308'; // Yellow
      case 'Weakening':
        return '#f97316'; // Orange
      case 'Rapid Decline':
        return '#dc2626'; // Red
      default:
        return '#9ca3af'; // Gray
    }
  };

  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize map
    if (!mapRef.current) {
      mapRef.current = L.map(containerRef.current).setView([42.90, -78.95], 12);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(mapRef.current);
    }

    const map = mapRef.current;

    // Clear existing layers (except tile layer)
    map.eachLayer((layer) => {
      if (layer instanceof L.Polygon || layer instanceof L.Popup) {
        map.removeLayer(layer);
      }
    });

    // Add zone hexagons
    zones.forEach((zone) => {
      try {
        // Get hexagon boundary
        const boundary = h3.cellToBoundary(zone.hexId);
        const latlngs = boundary.map(([lat, lon]) => [lat, lon] as [number, number]);

        const polygon = L.polygon(latlngs, {
          color: getClassificationColor(zone.classification),
          weight: 2,
          opacity: 0.8,
          fillOpacity: 0.6,
          fillColor: getClassificationColor(zone.classification),
        });

        // Add popup
        const popupContent = `
          <div class="p-2">
            <p class="font-semibold">${zone.classification}</p>
            <p class="text-sm">Orders: ${zone.previousPeriodOrders} → ${zone.currentPeriodOrders}</p>
            <p class="text-sm">Growth: ${zone.growthPercentage > 0 ? '+' : ''}${zone.growthPercentage.toFixed(1)}%</p>
          </div>
        `;

        polygon.bindPopup(popupContent);

        // Click handler
        polygon.on('click', () => {
          onZoneClick(zone);
        });

        polygon.addTo(map);
      } catch (error) {
        console.error('Error rendering hexagon:', error);
      }
    });

    // Fit bounds to zones
    if (zones.length > 0) {
      const bounds = L.latLngBounds(
        zones.map((z) => [z.latitude, z.longitude])
      );
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [zones, onZoneClick]);

  return (
    <div className="space-y-4">
      <div ref={containerRef} className="w-full h-96 rounded-lg bg-gray-100" />

      {/* Legend */}
      <div className="bg-white border rounded-lg p-4">
        <p className="font-semibold text-sm mb-3">Classification Legend</p>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded"
              style={{ backgroundColor: getClassificationColor('Strong Growth') }}
            />
            <span>Strong Growth</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded"
              style={{ backgroundColor: getClassificationColor('Moderate Growth') }}
            />
            <span>Moderate Growth</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded"
              style={{ backgroundColor: getClassificationColor('Stable') }}
            />
            <span>Stable</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded"
              style={{ backgroundColor: getClassificationColor('Weakening') }}
            />
            <span>Weakening</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded"
              style={{ backgroundColor: getClassificationColor('Rapid Decline') }}
            />
            <span>Rapid Decline</span>
          </div>
        </div>
      </div>
    </div>
  );
}
