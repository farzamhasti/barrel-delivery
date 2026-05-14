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

// Fort Erie boundary polygon coordinates (actual city boundary)
const FORT_ERIE_BOUNDARY = [
  [42.8765244, -78.999892],
  [42.8919223, -78.9996819],
  [42.9036221, -79.0009428],
  [42.9042378, -79.0055659],
  [42.9287076, -79.0089282],
  [42.9557824, -79.0097688],
  [42.9667012, -79.0154427],
  [42.9755716, -79.0166213],
  [42.9741848, -79.0087238],
  [42.9723357, -79.0005104],
  [42.9690161, -78.9858657],
  [42.9652306, -78.9793129],
  [42.9569016, -78.9768987],
  [42.9518533, -78.9718979],
  [42.9490765, -78.9610341],
  [42.947688, -78.9513773],
  [42.9493289, -78.9482734],
  [42.9497076, -78.9401686],
  [42.9478143, -78.9341331],
  [42.9407454, -78.9243039],
  [42.9360744, -78.9175787],
  [42.9307718, -78.913785],
  [42.9286254, -78.9124055],
  [42.9247111, -78.9125779],
  [42.9149875, -78.9082669],
  [42.9086727, -78.9084393],
  [42.9061465, -78.9099913],
  [42.9041256, -78.9155094],
  [42.9013466, -78.9172338],
  [42.896041, -78.9203378],
  [42.8925037, -78.9218898],
  [42.891114, -78.9218898],
  [42.8889662, -78.9244764],
  [42.8873237, -78.9256835],
  [42.8849231, -78.9296496],
  [42.884165, -78.9339607],
  [42.8836595, -78.9365473],
  [42.8829014, -78.9405135],
  [42.8820169, -78.9486183],
  [42.8808797, -78.95086],
  [42.8837859, -78.9603443],
  [42.8834068, -78.9681042],
  [42.8807533, -78.9703459],
  [42.8794897, -78.9701735],
  [42.8788579, -78.9720703],
  [42.8793633, -78.974657],
  [42.8801215, -78.9781058],
  [42.8791106, -78.9829342],
  [42.879296, -78.9907284],
  [42.8781587, -78.9955568],
  [42.8765244, -78.999892],
] as [number, number][];

// Calculate Fort Erie center from boundary
const FORT_ERIE_CENTER = [42.9155, -78.9580] as [number, number];

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
      mapRef.current = L.map(containerRef.current).setView(FORT_ERIE_CENTER, 12);

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
      weight: 2.5,
      opacity: 0.85,
      fillColor: '#93c5fd',
      fillOpacity: 0.05,
    }).addTo(map);
    
    boundaryPolygon.bindPopup('<div class="text-sm font-semibold">Service Area</div>');
    
    // Boundary label removed per user request

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

    // Fit map to Fort Erie boundary with padding
    const bounds = L.latLngBounds(FORT_ERIE_BOUNDARY);
    map.fitBounds(bounds, { padding: [80, 80] });

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
          <strong>Blue boundary:</strong> Service area<br />
          <strong>Circle size:</strong> Proportional to order volume<br />
          <strong>Circle color:</strong> Demand classification<br />
          Click any circle to view detailed zone metrics
        </p>
      </div>
    </div>
  );
}
