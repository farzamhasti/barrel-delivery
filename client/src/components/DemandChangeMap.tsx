import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface DemandZone {
  zoneId: string;
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

// Fort Erie boundary polygon coordinates
const FORT_ERIE_BOUNDARY = [
  [42.8812164, -78.9783667],
  [42.8812164, -78.9187357],
  [42.9566977, -78.9187357],
  [42.9566977, -78.9783667],
  [42.8812164, -78.9783667],
] as [number, number][];

const FORT_ERIE_CENTER = [42.9189, -78.9485] as [number, number];

export function DemandChangeMap({ zones, onZoneClick }: DemandChangeMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedZone, setSelectedZone] = useState<DemandZone | null>(null);

  const getClassificationColor = (classification: string): string => {
    switch (classification) {
      case 'Strong Growth':
        return '#15803d'; // Dark green
      case 'Moderate Growth':
        return '#65a30d'; // Light green
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
      mapRef.current = L.map(containerRef.current).setView(FORT_ERIE_CENTER, 13);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(mapRef.current);
    }

    const map = mapRef.current;

    // Clear existing layers (except tile layer)
    map.eachLayer((layer) => {
      if (layer instanceof L.Polygon || layer instanceof L.Circle || layer instanceof L.Popup) {
        map.removeLayer(layer);
      }
    });

    // Draw Fort Erie boundary polygon with enhanced styling
    const boundaryPolygon = L.polygon(FORT_ERIE_BOUNDARY, {
      color: '#1e40af',
      weight: 3,
      opacity: 0.9,
      fillColor: '#93c5fd',
      fillOpacity: 0.08,
      dashArray: '5, 5',
    }).addTo(map);
    
    boundaryPolygon.bindPopup('<div class="text-sm font-semibold">Fort Erie Service Area</div>');
    
    // Add boundary label at center
    const boundaryCenter = L.latLngBounds(FORT_ERIE_BOUNDARY).getCenter();
    L.marker(boundaryCenter, {
      icon: L.divIcon({
        className: 'boundary-label-icon',
        html: '<div style="background: rgba(255,255,255,0.9); padding: 6px 12px; border-radius: 6px; font-size: 11px; font-weight: 600; color: #1e40af; box-shadow: 0 2px 8px rgba(0,0,0,0.15); border: 2px solid #1e40af; white-space: nowrap;">Fort Erie</div>',
        iconSize: [100, 30],
      }),
    }).addTo(map);

    // Add demand zones as circles within Fort Erie
    zones.forEach((zone) => {
      const color = getClassificationColor(zone.classification);
      // Scale radius by order count (min 150m, max 500m)
      const radius = Math.max(150, Math.min(500, zone.currentPeriodOrders * 60));

      const circle = L.circle([zone.latitude, zone.longitude], {
        color: color,
        weight: 2,
        opacity: 0.85,
        fillColor: color,
        fillOpacity: 0.55,
        radius: radius,
        className: 'demand-zone-circle',
      }).addTo(map);

      // Add popup with zone info
      const popupContent = `
        <div class="p-2 text-sm">
          <p class="font-semibold">${zone.classification}</p>
          <p>Orders: ${zone.previousPeriodOrders} → ${zone.currentPeriodOrders}</p>
          <p>Growth: ${zone.growthPercentage > 0 ? '+' : ''}${zone.growthPercentage.toFixed(1)}%</p>
        </div>
      `;

      circle.bindPopup(popupContent);

      // Click handler
      circle.on('click', () => {
        setSelectedZone(zone);
        onZoneClick(zone);
      });
    });

    // Fit map to Fort Erie boundary
    const bounds = L.latLngBounds(FORT_ERIE_BOUNDARY);
    map.fitBounds(bounds, { padding: [50, 50] });

    return () => {
      // Cleanup handled by React
    };
  }, [zones, onZoneClick]);

  return (
    <div className="space-y-4">
      <div ref={containerRef} className="w-full h-96 rounded-lg bg-gray-100 border border-border shadow-sm" />

      {/* Legend */}
      <div className="bg-white border rounded-lg p-4 shadow-sm">
        <p className="font-semibold text-sm mb-3">Classification Legend</p>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs md:text-sm">
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: getClassificationColor('Strong Growth') }}
            />
            <span>Strong Growth</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: getClassificationColor('Moderate Growth') }}
            />
            <span>Moderate Growth</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: getClassificationColor('Stable') }}
            />
            <span>Stable</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: getClassificationColor('Weakening') }}
            />
            <span>Weakening</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: getClassificationColor('Rapid Decline') }}
            />
            <span>Rapid Decline</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          <strong>Blue dashed boundary:</strong> Fort Erie service area<br />
          <strong>Circle size:</strong> Proportional to order volume<br />
          <strong>Circle color:</strong> Demand classification<br />
          Click any circle to view detailed zone metrics
        </p>
      </div>
    </div>
  );
}
