/**
 * AI Prediction Map Component
 * Interactive mini geo map with prediction overlays
 * Connects to Geo AI service for real predictions or uses mock data as fallback
 */

import React, { useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { MapPin, Zap, AlertCircle } from 'lucide-react';
import { MapView } from '../Map';
import { trpc } from '@/lib/trpc';

interface AIPredictionMapProps {
  predictions: any;
}

// Fort Erie service area boundary polygon (from your earlier data)
const FORT_ERIE_SERVICE_AREA = [
  { lat: 42.9789, lng: -79.0289 },
  { lat: 42.9850, lng: -79.0150 },
  { lat: 42.9920, lng: -79.0200 },
  { lat: 42.9880, lng: -79.0380 },
  { lat: 42.9789, lng: -79.0289 },
];

// Mock hotspot data for predictions (fallback when service unavailable)
const MOCK_HOTSPOTS = [
  { lat: 42.9820, lng: -79.0280, intensity: 'high', orders: 45, confidence: 0.92 },
  { lat: 42.9750, lng: -79.0350, intensity: 'medium', orders: 28, confidence: 0.85 },
  { lat: 42.9900, lng: -79.0150, intensity: 'low', orders: 12, confidence: 0.78 },
];

export default function AIPredictionMap({ predictions }: AIPredictionMapProps) {
  const [mapReady, setMapReady] = useState(false);
  const mapRef = useRef<any>(null);
  
  // Try to fetch real hotspots from Geo AI service
  const { data: hotspotsData, isLoading: hotspotsLoading, error: hotspotsFetchError } = trpc.geoAI.hotspots.active.useQuery(
    undefined,
    {
      enabled: mapReady,
      retry: false,
    }
  );
  
  // Use real hotspots if available, otherwise fall back to mock data
  const hotspots = hotspotsData?.success && hotspotsData.data?.hotspots 
    ? hotspotsData.data.hotspots 
    : MOCK_HOTSPOTS;
  
  // Show error if Geo AI service is unavailable
  const showServiceWarning = hotspotsFetchError && hotspotsData?.success === false;

  const handleMapReady = (map: any) => {
    mapRef.current = map;
    setMapReady(true);
    
    // Draw service area polygon
    if (window.google?.maps) {
      const polygon = new window.google.maps.Polygon({
        paths: FORT_ERIE_SERVICE_AREA,
        strokeColor: '#9333EA',
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: '#9333EA',
        fillOpacity: 0.15,
        map: map,
      });

      // Add hotspot markers
      hotspots.forEach((hotspot: any) => {
        const markerColor = 
          hotspot.intensity === 'high' ? '#EF4444' :
          hotspot.intensity === 'medium' ? '#F97316' :
          '#FBBF24';

        const marker = new window.google.maps.Marker({
          position: { lat: hotspot.lat, lng: hotspot.lng },
          map: map,
          title: `${hotspot.intensity.toUpperCase()} DEMAND - ${hotspot.orders} orders`,
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 12,
            fillColor: markerColor,
            fillOpacity: 0.7,
            strokeColor: '#fff',
            strokeWeight: 2,
          },
        });

        marker.addListener('click', () => {
          const confidence = hotspot.confidence || 0.85;
          new window.google.maps.InfoWindow({
            content: `
              <div class="p-2 text-sm">
                <p class="font-semibold">${hotspot.intensity.toUpperCase()} Demand Zone</p>
                <p>Predicted Orders: ${hotspot.orders}</p>
                <p>Confidence: ${(confidence * 100).toFixed(0)}%</p>
              </div>
            `,
          }).open(map, marker);
        });
      });
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
      
      {/* Google Map Container */}
      <Card className="p-4 bg-white border-2 border-purple-200 h-96 overflow-hidden">
        <MapView 
          initialCenter={{ lat: 42.9820, lng: -79.0280 }}
          initialZoom={13}
          onMapReady={handleMapReady}
        />
      </Card>

      {/* Prediction Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Hotspot Details */}
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
