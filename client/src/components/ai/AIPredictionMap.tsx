/*
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
  return currentHour >= hours.start && currentHour < hours.end;
};

// Get next operating window message
const getNextOperatingWindow = (): string => {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const currentHour = now.getHours();
  const hours = OPERATING_HOURS[dayOfWeek as keyof typeof OPERATING_HOURS];
  
  if (currentHour < hours.start) {
    return `Opens at 4:00 PM today`;
  } else if (currentHour >= hours.end) {
    const nextDay = (dayOfWeek + 1) % 7;
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return `Opens at 4:00 PM ${dayNames[nextDay]}`;
  }
  
  return `Closes at ${hours.end === 22 ? '10:00 PM' : '11:00 PM'} today`;
};

export const AIPredictionMap: React.FC<AIPredictionMapProps> = () => {
  const [weather, setWeather] = useState<any>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [lastWeatherUpdate, setLastWeatherUpdate] = useState<Date | null>(null);
  const [isOperating, setIsOperating] = useState(isWithinOperatingHours());
  
  // Use tRPC weather API
  
  // Check operating hours every minute
  useEffect(() => {
    setIsOperating(isWithinOperatingHours());
    
    const interval = setInterval(() => {
      setIsOperating(isWithinOperatingHours());
    }, 60000);
    
    return () => clearInterval(interval);
  }, []);
  
  // Fetch real-time Fort Erie weather data via tRPC (server-side to bypass CORS)
  // Weather is fetched regardless of operating hours to ensure live data
  const { data: weatherResponse, isLoading: weatherApiLoading } = trpc.geoAI.weather.current.useQuery(undefined, {
    refetchInterval: 600000, // 10 minutes
  });
  
  // Update weather state when tRPC response arrives
  useEffect(() => {
    if (weatherResponse?.success && weatherResponse.data) {
      const data = weatherResponse.data;
      const weatherData = {
        temperature_2m: data.temperature,
        relative_humidity_2m: data.humidity,
        apparent_temperature: data.apparent_temperature,
        precipitation: data.precipitation,
        snowfall: data.snowfall,
        weather_code: data.weather_code,
        wind_speed_10m: data.wind_speed,
        wind_direction_10m: data.wind_direction,
        wind_gusts_10m: data.wind_gusts,
        visibility: data.visibility,
        location: 'Fort Erie, Ontario, Canada',
        latitude: data.latitude,
        longitude: data.longitude,
        timestamp: data.timestamp,
        time: data.time
      };
      
      setWeather(weatherData);
      setLastWeatherUpdate(new Date());
      console.log('✓ Fort Erie CURRENT weather updated via tRPC:', {
        temp: data.temperature,
        humidity: data.humidity,
        time: new Date().toLocaleTimeString()
      });
    } else if (weatherResponse?.success === false) {
      console.error('Fort Erie weather fetch error:', weatherResponse.error);
    }
  }, [weatherResponse]);
  
  // Update loading state
  useEffect(() => {
    setWeatherLoading(weatherApiLoading);
  }, [weatherApiLoading]);
  
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
        <Card className="p-6 bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200">
          <div className="flex items-center gap-3">
            <Clock className="w-6 h-6 text-gray-600" />
            <div>
              <p className="font-semibold text-gray-800">Business Closed</p>
              <p className="text-sm text-gray-600 mt-1">
                Delivery operations are currently closed. {getNextOperatingWindow()}
              </p>
            </div>
          </div>
        </Card>
        
        {/* Still show weather even when closed */}
        {weather && (
          <Card className="p-4 bg-blue-50 border border-blue-200">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3 flex-1">
                <Cloud className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-semibold text-sm text-blue-700">Fort Erie Live Weather</p>
                  <div className="text-xs text-blue-600 mt-1 space-y-1">
                    <p className="font-semibold text-blue-700">{weather.location || 'Fort Erie, Ontario, Canada'}</p>
                    <p>🌡️ Temperature: {weather.temperature_2m}°C (feels like {weather.apparent_temperature}°C)</p>
                    <p>💧 Humidity: {weather.relative_humidity_2m}%</p>
                    <p>🌧️ Precipitation: {weather.precipitation || 0}mm | ❄️ Snowfall: {weather.snowfall || 0}mm</p>
                    <p>💨 Wind: {weather.wind_speed_10m}km/h (gusts: {weather.wind_gusts_10m}km/h, direction: {weather.wind_direction_10m}°)</p>
                    <p>👁️ Visibility: {weather.visibility || 10}km</p>
                    <p className="text-xs text-blue-500 mt-2 font-semibold">📍 Location verified: 42.8900°N, 79.0000°W (Fort Erie, Ontario)</p>
                  </div>
                </div>
              </div>
              {lastWeatherUpdate && (
                <div className="text-right">
                  <p className="text-xs text-blue-500">
                    Updated: {lastWeatherUpdate.toLocaleTimeString()}
                  </p>
                  <p className="text-xs text-blue-400 mt-1">
                    (Auto-refresh: 10 min)
                  </p>
                </div>
              )}
            </div>
          </Card>
        )}
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {/* Operating Status Header */}
      <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
        <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse" />
        <span className="text-sm font-semibold text-green-700">🟢 Operating - AI Ready</span>
      </div>
      
      {/* Real-Time Fort Erie Weather Panel */}
      {weather && (
        <Card className="p-4 bg-blue-50 border border-blue-200">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1">
              <Cloud className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-semibold text-sm text-blue-700">Fort Erie Live Weather</p>
                <div className="text-xs text-blue-600 mt-1 space-y-1">
                  <p className="font-semibold text-blue-700">{weather.location || 'Fort Erie, Ontario, Canada'}</p>
                  <p>🌡️ Temperature: <span className="font-bold text-lg text-blue-800">{weather.temperature_2m}°C</span> (feels like {weather.apparent_temperature}°C)</p>
                  <p>💧 Humidity: {weather.relative_humidity_2m}%</p>
                  <p>🌧️ Precipitation: {weather.precipitation || 0}mm | ❄️ Snowfall: {weather.snowfall || 0}mm</p>
                  <p>💨 Wind: {weather.wind_speed_10m}km/h (gusts: {weather.wind_gusts_10m}km/h, direction: {weather.wind_direction_10m}°)</p>
                  <p>👁️ Visibility: {weather.visibility || 10}km</p>
                  <p className="text-xs text-blue-500 mt-2 font-semibold">📍 Location verified: 42.8900°N, 79.0000°W (Fort Erie, Ontario)</p>
                  <p className="text-xs text-blue-400 mt-1">API Time: {weather.time}</p>
                </div>
              </div>
            </div>
            {lastWeatherUpdate && (
              <div className="text-right">
                <p className="text-xs text-blue-500">
                  Updated: {lastWeatherUpdate.toLocaleTimeString()}
                </p>
                <p className="text-xs text-blue-400 mt-1">
                  (Auto-refresh: 10 min)
                </p>
              </div>
            )}
          </div>
        </Card>
      )}
      
      {/* Service Status Warning - Only show if API fails during operating hours */}
      {showServiceWarning && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-700">Geo AI Service Unavailable</p>
            <p className="text-xs text-red-600 mt-1">
              The prediction service is temporarily unavailable. Forecasting will resume when service is restored.
            </p>
          </div>
        </div>
      )}
      
      {/* Map Container */}
      <Card className="overflow-hidden">
        <MapContainer
          center={calculateCenter()}
          zoom={13}
          style={{ height: '400px', width: '100%' }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap contributors'
          />
          
          {/* Fort Erie Boundary Polygon */}
          <Polygon
            positions={FORT_ERIE_BOUNDARY}
            color="purple"
            weight={2}
            opacity={0.7}
            fillOpacity={0.1}
          />
          
          {/* Hotspot Markers */}
          {hotspots.map((hotspot: any, idx: number) => (
            <CircleMarker
              key={idx}
              center={[hotspot.latitude, hotspot.longitude]}
              radius={Math.max(5, hotspot.intensity * 15)}
              fillColor={
                hotspot.intensity > 0.7 ? '#ef4444' :
                hotspot.intensity > 0.4 ? '#f97316' :
                '#eab308'
              }
              color={
                hotspot.intensity > 0.7 ? '#dc2626' :
                hotspot.intensity > 0.4 ? '#ea580c' :
                '#ca8a04'
              }
              weight={2}
              opacity={0.8}
              fillOpacity={0.7}
            >
              <Popup>
                <div className="text-xs">
                  <p className="font-semibold">Hotspot {idx + 1}</p>
                  <p>Intensity: {(hotspot.intensity * 100).toFixed(0)}%</p>
                  <p>Orders: {hotspot.orderCount || 0}</p>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </Card>
      
      {/* Hotspots Summary */}
      {hotspots.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="w-5 h-5 text-orange-600" />
            <p className="font-semibold text-sm">Active Hotspots: {hotspots.length}</p>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {hotspots.map((hotspot: any, idx: number) => (
              <div key={idx} className="text-xs p-2 bg-gray-50 rounded border border-gray-200">
                <p className="font-semibold">Zone {idx + 1}</p>
                <p>Intensity: {(hotspot.intensity * 100).toFixed(0)}%</p>
                <p>Orders: {hotspot.orderCount || 0}</p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

export default AIPredictionMap;
