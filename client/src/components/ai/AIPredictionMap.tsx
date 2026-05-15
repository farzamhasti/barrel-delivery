/**
 * AI Prediction Map Component
 * Interactive map with prediction overlays using OpenStreetMap/Leaflet
 * Displays Fort Erie boundary and demand hotspots
 */

import React, { useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { MapPin, Zap, AlertCircle } from 'lucide-react';
import { MapContainer, TileLayer, Polygon, CircleMarker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { trpc } from '@/lib/trpc';

interface AIPredictionMapProps {
  predictions: any;
}

// Fort Erie boundary polygon (accurate coordinates from GeoJSON)
const FORT_ERIE_BOUNDARY: [number, number][] = [
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
];

// Hotspots positioned within Fort Erie boundary
const MOCK_HOTSPOTS = [
  { lat: 42.9200, lng: -79.0050, intensity: 'high', orders: 45, confidence: 0.92 },
  { lat: 42.9400, lng: -78.9900, intensity: 'medium', orders: 28, confidence: 0.85 },
  { lat: 42.8950, lng: -78.9800, intensity: 'low', orders: 12, confidence: 0.78 },
];

// Calculate center of Fort Erie for map centering
const calculateCenter = (): L.LatLngTuple => {
  const lats = FORT_ERIE_BOUNDARY.map(coord => coord[0]);
  const lngs = FORT_ERIE_BOUNDARY.map(coord => coord[1]);
  const avgLat = (Math.min(...lats) + Math.max(...lats)) / 2;
  const avgLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
  return [avgLat, avgLng];
};

export default function AIPredictionMap({ predictions }: AIPredictionMapProps) {
  const [hotspotsError, setHotspotsError] = useState<string | null>(null);
  
  // Try to fetch real hotspots from Geo AI service
  const { data: hotspotsData, isLoading: hotspotsLoading, error: hotspotsFetchError } = trpc.geoAI.hotspots.active.useQuery(
    undefined,
    {
      retry: false,
    }
  );
  
  // Use real hotspots if available, otherwise fall back to mock data
  const hotspots = hotspotsData?.success && hotspotsData.data?.hotspots 
    ? hotspotsData.data.hotspots 
    : MOCK_HOTSPOTS;
  
  // Show error if Geo AI service is unavailable
  const showServiceWarning = hotspotsFetchError && hotspotsData?.success === false;

  const getMarkerColor = (intensity: string) => {
    switch (intensity) {
      case 'high':
        return '#EF4444';
      case 'medium':
        return '#F97316';
      case 'low':
        return '#FBBF24';
      default:
        return '#9333EA';
    }
  };

  if (!predictions && !hotspotsLoading) {
    return (
      <Card className="p-8 bg-gray-50 border-dashed">
        <div className="text-center text-gray-500">
          <MapPin className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Loading prediction map...</p>
        </div>
      </Card>
    );
  }

  const mapCenter = calculateCenter();

  return (
    <div className="space-y-4">
      {/* Service Status Warning */}
      {showServiceWarning && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-sm text-yellow-700">Geo AI Service Unavailable</p>
            <p className="text-xs text-yellow-600">Using mock predictions. Connect to Geo AI service for real data.</p>
          </div>
        </div>
      )}
      
      {/* OpenStreetMap Container */}
      <Card className="p-4 bg-white border-2 border-purple-200 h-96 overflow-hidden">
        <MapContainer 
          center={mapCenter} 
          zoom={13} 
          style={{ height: '100%', width: '100%' }}
          className="rounded-lg"
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          
          {/* Fort Erie Boundary Polygon */}
          <Polygon 
            positions={FORT_ERIE_BOUNDARY}
            pathOptions={{
              color: '#9333EA',
              weight: 2,
              opacity: 0.8,
              fillColor: '#9333EA',
              fillOpacity: 0.15,
            }}
          />
          
          {/* Hotspot Markers */}
          {hotspots.map((hotspot: any, idx: number) => (
            <CircleMarker
              key={idx}
              center={[hotspot.lat, hotspot.lng]}
              radius={12}
              pathOptions={{
                color: '#fff',
                weight: 2,
                opacity: 1,
                fill: true,
                fillColor: getMarkerColor(hotspot.intensity),
                fillOpacity: 0.7,
              }}
            >
              <Popup>
                <div className="text-sm">
                  <p className="font-semibold">{hotspot.intensity.toUpperCase()} Demand Zone</p>
                  <p>Predicted Orders: {hotspot.orders}</p>
                  <p>Confidence: {((hotspot.confidence || 0.85) * 100).toFixed(0)}%</p>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </Card>

      {/* Prediction Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* High Demand */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 bg-red-400 rounded-full" />
            <span className="font-semibold text-sm text-red-700">High Demand Zones</span>
          </div>
          <p className="text-xs text-red-600">
            {hotspots.filter((h: any) => h.intensity === 'high').length} active hotspots detected
          </p>
        </div>

        {/* Medium Demand */}
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 bg-orange-400 rounded-full" />
            <span className="font-semibold text-sm text-orange-700">Medium Demand</span>
          </div>
          <p className="text-xs text-orange-600">
            {hotspots.filter((h: any) => h.intensity === 'medium').length} moderate activity zones
          </p>
        </div>

        {/* Low Demand */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 bg-yellow-400 rounded-full" />
            <span className="font-semibold text-sm text-yellow-700">Low Demand</span>
          </div>
          <p className="text-xs text-yellow-600">
            {hotspots.filter((h: any) => h.intensity === 'low').length} emerging opportunity areas
          </p>
        </div>
      </div>

      {/* Service Area Info */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
        <div className="flex items-center gap-2 mb-2">
          <Zap className="w-4 h-4 text-purple-600" />
          <span className="font-semibold text-sm text-purple-700">Service Area</span>
        </div>
        <p className="text-xs text-purple-600">Purple boundary shows your delivery service area in Fort Erie</p>
      </div>

      {/* Data Source Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-xs text-blue-600">
          {hotspotsLoading ? '⏳ Loading predictions from Geo AI service...' : '✓ Predictions loaded'}
          {' '}({hotspots.length} hotspots)
        </p>
      </div>
    </div>
  );
}
