import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { cellToBoundary } from 'h3-js';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import 'leaflet/dist/leaflet.css';

interface SpatialZone {
  hexId: string;
  latitude: number;
  longitude: number;
  previousDensity: number;
  currentDensity: number;
  densityChange: number;
  growthPercentage: number;
  classification: string;
  clusterStatus: string;
  orderCount: number;
  orderLocations: Array<{ lat: number; lon: number; orderId: string }>;
}

interface ZoneMapVisualizationProps {
  zones: SpatialZone[];
  isLoading?: boolean;
}

// Fort Erie center coordinates
const FORT_ERIE_CENTER = [42.8812, -78.9783];
const DEFAULT_ZOOM = 12;

export function ZoneMapVisualization({ zones, isLoading }: ZoneMapVisualizationProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const [selectedZone, setSelectedZone] = useState<SpatialZone | null>(null);
  const layersRef = useRef<L.Layer[]>([]);

  // Color mapping based on classification
  const getZoneColor = (zone: SpatialZone): string => {
    switch (zone.classification) {
      case 'Strong Growth':
        return '#10b981'; // green
      case 'Moderate Growth':
        return '#84cc16'; // lime
      case 'Stable':
        return '#eab308'; // yellow
      case 'Decline':
        return '#f97316'; // orange
      case 'Rapid Shift':
        return '#ef4444'; // red
      default:
        return '#6b7280'; // gray
    }
  };

  // Get opacity based on density change magnitude
  const getOpacity = (densityChange: number): number => {
    const magnitude = Math.abs(densityChange);
    return Math.min(0.3 + magnitude * 0.1, 0.8);
  };

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = L.map(mapContainer.current).setView(FORT_ERIE_CENTER as L.LatLngExpression, DEFAULT_ZOOM);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map.current);

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Update zones on map
  useEffect(() => {
    if (!map.current || !zones.length) return;

    // Clear existing layers
    layersRef.current.forEach(layer => map.current?.removeLayer(layer));
    layersRef.current = [];

    // Add zone hexagons
    zones.forEach((zone) => {
      try {
        // Get hexagon boundary from H3 cell ID
        const boundary = cellToBoundary(zone.hexId);
        const latLngs = boundary.map(([lat, lon]) => [lat, lon] as L.LatLngExpression);

        const color = getZoneColor(zone);
        const opacity = getOpacity(zone.densityChange);

        // Create polygon for hexagon
        const polygon = L.polygon(latLngs, {
          color: color,
          weight: 2,
          opacity: 0.8,
          fillColor: color,
          fillOpacity: opacity,
        });

        // Add click handler
        polygon.on('click', () => setSelectedZone(zone));

        // Add popup on hover
        polygon.bindPopup(`
          <div class="font-semibold">${zone.hexId}</div>
          <div class="text-sm">Density Change: ${zone.densityChange.toFixed(1)}</div>
          <div class="text-sm">Orders: ${zone.orderCount}</div>
        `);

        polygon.addTo(map.current!);
        layersRef.current.push(polygon);
      } catch (error) {
        console.error('Error rendering zone:', zone.hexId, error);
      }
    });

    // Fit bounds to show all zones
    if (layersRef.current.length > 0) {
      const group = new L.FeatureGroup(layersRef.current);
      map.current.fitBounds(group.getBounds(), { padding: [50, 50] });
    }
  }, [zones]);

  return (
    <>
      <Card className="w-full">
        <div className="p-4">
          <h3 className="text-lg font-semibold mb-4">Spatial Demand Zones Map</h3>
          {isLoading ? (
            <div className="h-96 bg-gray-100 rounded flex items-center justify-center">
              <p className="text-gray-500">Loading map...</p>
            </div>
          ) : zones.length === 0 ? (
            <div className="h-96 bg-gray-100 rounded flex items-center justify-center">
              <p className="text-gray-500">No zones to display</p>
            </div>
          ) : (
            <>
              <div ref={mapContainer} className="h-96 rounded border border-gray-200 mb-4" />
              
              {/* Legend */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: '#10b981' }} />
                  <span>Strong Growth</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: '#84cc16' }} />
                  <span>Moderate Growth</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: '#eab308' }} />
                  <span>Stable</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: '#f97316' }} />
                  <span>Decline</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: '#ef4444' }} />
                  <span>Rapid Shift</span>
                </div>
              </div>
              
              <p className="text-xs text-gray-500 mt-2">Click on zones to view details</p>
            </>
          )}
        </div>
      </Card>

      {/* Zone Details Modal */}
      <Dialog open={!!selectedZone} onOpenChange={(open) => !open && setSelectedZone(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Zone Details</DialogTitle>
          </DialogHeader>
          {selectedZone && (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Zone ID</p>
                <p className="font-mono text-sm">{selectedZone.hexId}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Previous Density</p>
                  <p className="font-semibold">{selectedZone.previousDensity.toFixed(1)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Current Density</p>
                  <p className="font-semibold">{selectedZone.currentDensity.toFixed(1)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Density Change</p>
                  <p className={`font-semibold ${selectedZone.densityChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {selectedZone.densityChange > 0 ? '+' : ''}{selectedZone.densityChange.toFixed(1)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Growth %</p>
                  <p className={`font-semibold ${selectedZone.growthPercentage > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {selectedZone.growthPercentage > 0 ? '+' : ''}{selectedZone.growthPercentage.toFixed(1)}%
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Classification</p>
                  <Badge className="mt-1">{selectedZone.classification}</Badge>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <Badge variant="outline" className="mt-1">{selectedZone.clusterStatus}</Badge>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-500">Order Count</p>
                <p className="font-semibold">{selectedZone.orderCount}</p>
              </div>

              <div>
                <p className="text-sm text-gray-500 mb-2">Zone Center</p>
                <p className="text-sm font-mono">
                  {selectedZone.latitude.toFixed(4)}, {selectedZone.longitude.toFixed(4)}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-500 mb-2">Order Locations ({selectedZone.orderLocations.length})</p>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {selectedZone.orderLocations.slice(0, 5).map((order, idx) => (
                    <p key={idx} className="text-xs font-mono text-gray-600">
                      {order.lat.toFixed(4)}, {order.lon.toFixed(4)}
                    </p>
                  ))}
                  {selectedZone.orderLocations.length > 5 && (
                    <p className="text-xs text-gray-500">
                      +{selectedZone.orderLocations.length - 5} more locations
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
