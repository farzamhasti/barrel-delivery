/**
 * GOOGLE MAPS FRONTEND INTEGRATION - ESSENTIAL GUIDE
 *
 * USAGE FROM PARENT COMPONENT:
 * ======
 *
 * const mapRef = useRef<google.maps.Map | null>(null);
 *
 * <MapView
 *   initialCenter={{ lat: 40.7128, lng: -74.0060 }}
 *   initialZoom={15}
 *   onMapReady={(map) => {
 *     mapRef.current = map; // Store to control map from parent anytime, google map itself is in charge of the re-rendering, not react state.
 * </MapView>
 *
 * ======
 * Available Libraries and Core Features:
 * -------------------------------
 * 📍 MARKER (from `marker` library)
 * - Attaches to map using { map, position }
 * new google.maps.marker.AdvancedMarkerElement({
 *   map,
 *   position: { lat: 37.7749, lng: -122.4194 },
 *   title: "San Francisco",
 * });
 *
 * -------------------------------
 * 🏢 PLACES (from `places` library)
 * - Does not attach directly to map; use data with your map manually.
 * const place = new google.maps.places.Place({ id: PLACE_ID });
 * await place.fetchFields({ fields: ["displayName", "location"] });
 * map.setCenter(place.location);
 * new google.maps.marker.AdvancedMarkerElement({ map, position: place.location });
 *
 * -------------------------------
 * 🧭 GEOCODER (from `geocoding` library)
 * - Standalone service; manually apply results to map.
 * const geocoder = new google.maps.Geocoder();
 * geocoder.geocode({ address: "New York" }, (results, status) => {
 *   if (status === "OK" && results[0]) {
 *     map.setCenter(results[0].geometry.location);
 *     new google.maps.marker.AdvancedMarkerElement({
 *       map,
 *       position: results[0].geometry.location,
 *     });
 *   }
 * });
 *
 * -------------------------------
 * 📐 GEOMETRY (from `geometry` library)
 * - Standalone utilities; no direct map attachment.
 * const distance = google.maps.geometry.spherical.computeDistanceBetween(
 *   new google.maps.LatLng(37.7749, -122.4194),
 *   new google.maps.LatLng(40.7128, -74.0060)
 * );
 * console.log(distance / 1000, "km");
 *
 * ✅ SUMMARY
 * - "map-attached" → AdvancedMarkerElement, DirectionsRenderer, Layers.
 * - "standalone" → Geocoder, DirectionsService, DistanceMatrixService, ElevationService.
 * - "data-only" → Place, Geometry utilities.
 */

/// <reference types="@types/google.maps" />

import { useEffect, useRef, useState } from "react";
import { usePersistFn } from "@/hooks/usePersistFn";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    google?: typeof google;
  }
}

const API_KEY = import.meta.env.VITE_FRONTEND_FORGE_API_KEY;
const FORGE_BASE_URL =
  import.meta.env.VITE_FRONTEND_FORGE_API_URL ||
  "https://forge.butterfly-effect.dev";
const MAPS_PROXY_URL = `${FORGE_BASE_URL}/v1/maps/proxy`;

// Track if the script is already loaded or loading
let mapScriptPromise: Promise<void> | null = null;

function loadMapScript(): Promise<void> {
  // Return existing promise if already loading or loaded
  if (mapScriptPromise) {
    return mapScriptPromise;
  }

  // Check if Google Maps is already loaded
  if (window.google?.maps) {
    mapScriptPromise = Promise.resolve();
    return mapScriptPromise;
  }

  mapScriptPromise = new Promise((resolve, reject) => {
    // Check if script already exists in DOM
    const existingScript = document.querySelector(
      'script[src*="maps/api/js"]'
    );

    if (existingScript) {
      // Script already in DOM, wait for it to load
      if (window.google?.maps) {
        resolve();
      } else {
        // Wait for the existing script to load
        const checkInterval = setInterval(() => {
          if (window.google?.maps) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 100);
        // Timeout after 10 seconds
        setTimeout(() => {
          clearInterval(checkInterval);
          reject(new Error("Google Maps script loading timeout"));
        }, 10000);
      }
      return;
    }

    const script = document.createElement("script");
    script.src = `${MAPS_PROXY_URL}/maps/api/js?key=${API_KEY}&v=weekly&libraries=marker,places,geocoding,geometry`;
    script.async = true;
    script.defer = true;
    script.crossOrigin = "anonymous";

    script.onload = () => {
      resolve();
    };

    script.onerror = () => {
      mapScriptPromise = null; // Reset on error so it can be retried
      reject(new Error("Failed to load Google Maps script"));
    };

    document.head.appendChild(script);
  });

  return mapScriptPromise;
}

interface MapViewProps {
  className?: string;
  initialCenter?: google.maps.LatLngLiteral;
  initialZoom?: number;
  onMapReady?: (map: google.maps.Map) => void;
}

export function MapView({
  className,
  initialCenter = { lat: 37.7749, lng: -122.4194 },
  initialZoom = 12,
  onMapReady,
}: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<google.maps.Map | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const [error, setError] = useState<string | null>(null);

  const init = usePersistFn(async () => {
    try {
      console.log('Initializing map...');
      await loadMapScript();
      if (!mapContainer.current) {
        console.error("Map container not found");
        return;
      }
      
      // Ensure container has proper dimensions
      const containerRect = mapContainer.current.getBoundingClientRect();
      console.log('Map container dimensions:', containerRect.width, 'x', containerRect.height);
      
      // Wait for container to have dimensions
      if (containerRect.width === 0 || containerRect.height === 0) {
        console.warn('Container has zero dimensions, waiting...');
        setTimeout(init, 100);
        return;
      }
      
      map.current = new window.google!.maps.Map(mapContainer.current, {
        zoom: initialZoom,
        center: initialCenter,
        mapTypeControl: true,
        fullscreenControl: true,
        zoomControl: true,
        streetViewControl: true,
        mapId: "DEMO_MAP_ID",
      });
      console.log('Map created successfully');
      
      // Trigger multiple resizes for mobile compatibility
      setTimeout(() => {
        if (map.current) {
          google.maps.event.trigger(map.current, 'resize');
          console.log('Map resize triggered (1st)');
        }
      }, 50);
      
      setTimeout(() => {
        if (map.current) {
          google.maps.event.trigger(map.current, 'resize');
          console.log('Map resize triggered (2nd)');
        }
      }, 150);
      
      if (onMapReady) {
        console.log('Calling onMapReady callback');
        onMapReady(map.current);
      }
      
      // Set up ResizeObserver to handle container size changes
      if (typeof ResizeObserver !== 'undefined' && mapContainer.current) {
        resizeObserverRef.current = new ResizeObserver(() => {
          if (map.current) {
            console.log('Container resized, triggering map resize');
            google.maps.event.trigger(map.current, 'resize');
          }
        });
        resizeObserverRef.current.observe(mapContainer.current);
      }
    } catch (error) {
      console.error("Map initialization error:", error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load map';
      setError(errorMessage);
    }
  });

  useEffect(() => {
    init();
    
    // Cleanup on unmount
    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
    };
  }, [init]);

  if (error) {
    return (
      <div 
        className={cn("w-full h-full min-h-[300px] bg-red-50 flex items-center justify-center", className)}
        style={{ 
          display: 'flex',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div className="text-center">
          <div className="text-red-600 text-sm font-semibold mb-2">Map Error</div>
          <div className="text-gray-600 text-xs">{error}</div>
          {!API_KEY && <div className="text-gray-600 text-xs mt-2">API Key not configured</div>}
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={mapContainer} 
      className={cn("w-full h-full min-h-[300px] bg-gray-100", className)}
      style={{ 
        display: 'block',
        position: 'relative',
        overflow: 'hidden'
      }}
    />
  );
}
