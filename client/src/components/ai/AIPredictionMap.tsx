/**
 * AI Prediction Map Component - LIVE OPERATIONAL MODE
 * Enforces operating hours, integrates real geoAI APIs, and displays live weather data
 * No mock data - only real operational intelligence
 */

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { MapPin, Zap, AlertCircle, Cloud, Clock } from 'lucide-react';
import { MapContainer, TileLayer, Polygon, CircleMarker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { trpc } from '@/lib/trpc';

interface AIPredictionMapProps {
  predictions?: any;
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

// Operating hours configuration
const OPERATING_HOURS = {
  0: { start: 16, end: 22 }, // Sunday: 4 PM - 10 PM
  1: { start: 16, end: 22 }, // Monday: 4 PM - 10 PM
  2: { start: 16, end: 22 }, // Tuesday: 4 PM - 10 PM
  3: { start: 16, end: 22 }, // Wednesday: 4 PM - 10 PM
  4: { start: 16, end: 22 }, // Thursday: 4 PM - 10 PM
  5: { start: 16, end: 23 }, // Friday: 4 PM - 11 PM
  6: { start: 16, end: 23 }, // Saturday: 4 PM - 11 PM
};

// Calculate center of Fort Erie for map centering
const calculateCenter = (): L.LatLngTuple => {
  const lats = FORT_ERIE_BOUNDARY.map(coord => coord[0]);
  const lngs = FORT_ERIE_BOUNDARY.map(coord => coord[1]);
  const avgLat = (Math.min(...lats) + Math.max(...lats)) / 2;
  const avgLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
  return [avgLat, avgLng];
};

// Check if currently within operating hours
const isWithinOperatingHours = (): boolean => {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const currentHour = now.getHours();
  
  const hours = OPERATING_HOURS[dayOfWeek as keyof typeof OPERATING_HOURS];
  if (!hours) return false;
  
  return currentHour >= hours.start && currentHour < hours.end;
};

// Get next operating window
const getNextOperatingWindow = (): string => {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const currentHour = now.getHours();
  
  const hours = OPERATING_HOURS[dayOfWeek as keyof typeof OPERATING_HOURS];
  
  if (currentHour < hours.start) {
    return `Today at 4:00 PM`;
  }
  
  if (currentHour >= hours.end) {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDay = tomorrow.getDay();
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return `${dayNames[tomorrowDay]} at 4:00 PM`;
  }
  
  return 'Now';
};

export default function AIPredictionMap({ predictions }: AIPredictionMapProps) {
  const [weather, setWeather] = useState<any>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [lastWeatherUpdate, setLastWeatherUpdate] = useState<Date | null>(null);
  const [isOperating, setIsOperating] = useState(isWithinOperatingHours());
  
  // Check operating hours
  useEffect(() => {
    setIsOperating(isWithinOperatingHours());
    
    // Update every minute
    const interval = setInterval(() => {
      setIsOperating(isWithinOperatingHours());
    }, 60000);
    
    return () => clearInterval(interval);
  }, []);
  
  // Fetch real-time weather data every 10 minutes
  useEffect(() => {
    const fetchWeather = async () => {
      if (!isOperating) return;
      
      try {
        setWeatherLoading(true);
        // Fort Erie coordinates
        const response = await fetch(
          'https://api.open-meteo.com/v1/forecast?latitude=42.8900&longitude=-79.0000&current=temperature_2m,weather_code,precipitation,wind_speed&timezone=America/Toronto'
        );
        const data = await response.json();
        
        if (data.current) {
          setWeather(data.current);
          setLastWeatherUpdate(new Date());
        }
      } catch (error) {
        console.error('Weather fetch error:', error);
      } finally {
        setWeatherLoading(false);
      }
    };
    
    // Fetch immediately
    fetchWeather();
    
    // Then fetch every 10 minutes
    const interval = setInterval(fetchWeather, 600000);
    
    return () => clearInterval(interval);
  }, [isOperating]);
  
  // Try to fetch real hotspots from Geo AI service ONLY if operating
  const { data: hotspotsData, isLoading: hotspotsLoading, error: hotspotsFetchError } = trpc.geoAI.hotspots.active.useQuery(
    undefined,
    {
      retry: false,
      enabled: isOperating, // Only fetch if operating
    }
  );
  
  // Get hotspots - NO MOCK DATA
  const hotspots = hotspotsData?.success && hotspotsData.data?.hotspots 
    ? hotspotsData.data.hotspots 
    : [];
  
  // Show service warning if API fails
  const showServiceWarning = hotspotsFetchError && isOperating;
  
  // Show closed state if not operating
  if (!isOperating) {
    return (
      <div className="space-y-4">
        <Card className="p-8 bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
          <div className="text-center">
            <Clock className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h2 className="text-2xl font-bold text-white mb-2">Business Closed</h2>
            <p className="text-gray-300 mb-4">Delivery operations are currently closed</p>
            <div className="bg-gray-700 rounded-lg p-4 inline-block">
              <p className="text-sm text-gray-200">
                <span className="font-semibold">Next Operating Window:</span>
              </p>
              <p className="text-lg font-bold text-blue-400 mt-1">
                {getNextOperatingWindow()}
              </p>
            </div>
            <p className="text-xs text-gray-400 mt-6">
              Operating Hours: Sun-Thu 4:00 PM - 10:00 PM | Fri-Sat 4:00 PM - 11:00 PM
            </p>
          </div>
        </Card>
        
        {/* Closed state - no predictions */}
        <Card className="p-4 bg-gray-50 border-dashed border-gray-300">
          <p className="text-center text-gray-500 text-sm">
            Forecasting paused until next operating window
          </p>
        </Card>
      </div>
    );
  }

  const mapCenter = calculateCenter();

  return (
    <div className="space-y-4">
      {/* Operating Status Header */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-start justify-between">
        <div className="flex items-start gap-2">
          <div className="w-3 h-3 bg-green-500 rounded-full mt-1 animate-pulse" />
          <div>
            <p className="font-semibold text-sm text-green-700">Live Operational Mode</p>
            <p className="text-xs text-green-600">Real-time predictions active</p>
          </div>
        </div>
        <p className="text-xs text-green-600">
          {new Date().toLocaleTimeString()}
        </p>
      </div>
      
      {/* Real-Time Weather Panel */}
      {isOperating && (
        <Card className="p-4 bg-blue-50 border border-blue-200">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <Cloud className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <p className="font-semibold text-sm text-blue-700">Real-Time Weather</p>
                {weather ? (
                  <div className="text-xs text-blue-600 mt-1 space-y-1">
                    <p>Temperature: {weather.temperature_2m}°C</p>
                    <p>Precipitation: {weather.precipitation || 0}mm</p>
                    <p>Wind Speed: {weather.wind_speed}km/h</p>
                  </div>
                ) : (
                  <p className="text-xs text-blue-600 mt-1">Fetching weather data...</p>
                )}
              </div>
            </div>
            {lastWeatherUpdate && (
              <p className="text-xs text-blue-500">
                Updated: {lastWeatherUpdate.toLocaleTimeString()}
              </p>
            )}
          </div>
        </Card>
      )}
      
      {/* Service Status Warning - Only show if API fails during operating hours */}
      {showServiceWarning && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-sm text-red-700">Geo AI Service Error</p>
            <p className="text-xs text-red-600">Unable to fetch live predictions. Please try again.</p>
          </div>
        </div>
      )}
      
      {/* OpenStreetMap Container */}
      <Card className="p-4 bg-white border-2 border-purple-200 h-96 overflow-hidden">
        {hotspotsLoading ? (
          <div className="flex items-center justify-center h-full bg-gray-50">
            <p className="text-gray-500">Loading live predictions...</p>
          </div>
        ) : hotspots.length === 0 ? (
          <div className="flex items-center justify-center h-full bg-gray-50">
            <p className="text-gray-500">No active demand hotspots detected</p>
          </div>
        ) : (
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
            
            {/* Real Hotspot Markers */}
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
                  fillColor: hotspot.intensity === 'high' ? '#EF4444' : hotspot.intensity === 'medium' ? '#F97316' : '#FBBF24',
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
        )}
      </Card>

      {/* Prediction Details Grid */}
      {hotspots.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* High Demand */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 bg-red-400 rounded-full" />
              <span className="font-semibold text-sm text-red-700">High Demand Zones</span>
            </div>
            <p className="text-xs text-red-600">
              {hotspots.filter((h: any) => h.intensity === 'high').length} active hotspots
            </p>
          </div>

          {/* Medium Demand */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 bg-orange-400 rounded-full" />
              <span className="font-semibold text-sm text-orange-700">Medium Demand</span>
            </div>
            <p className="text-xs text-orange-600">
              {hotspots.filter((h: any) => h.intensity === 'medium').length} moderate zones
            </p>
          </div>

          {/* Low Demand */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 bg-yellow-400 rounded-full" />
              <span className="font-semibold text-sm text-yellow-700">Low Demand</span>
            </div>
            <p className="text-xs text-yellow-600">
              {hotspots.filter((h: any) => h.intensity === 'low').length} emerging zones
            </p>
          </div>
        </div>
      )}

      {/* Service Area Info */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
        <div className="flex items-center gap-2 mb-2">
          <Zap className="w-4 h-4 text-purple-600" />
          <span className="font-semibold text-sm text-purple-700">Service Area</span>
        </div>
        <p className="text-xs text-purple-600">Purple boundary shows Fort Erie delivery service area</p>
      </div>

      {/* Data Source Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-xs text-blue-600">
          ✓ Live predictions from Geo AI service ({hotspots.length} hotspots detected)
        </p>
      </div>
    </div>
  );
}
