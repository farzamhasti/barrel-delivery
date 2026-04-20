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

const API_KEY = import.meta.env.VITE_FRONTEND_FORGE_API_KEY || "";
const FORGE_BASE_URL =
  import.meta.env.VITE_FRONTEND_FORGE_API_URL ||
  "https://forge.butterfly-effect.dev";
const MAPS_PROXY_URL = `${FORGE_BASE_URL}/v1/maps/proxy`;

// Log environment for debugging
if (typeof window !== "undefined") {
  console.log("[Map] API_KEY present:", !!API_KEY);
  console.log("[Map] FORGE_BASE_URL:", FORGE_BASE_URL);
  console.log("[Map] MAPS_PROXY_URL:", MAPS_PROXY_URL);
}

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
            console.log("[Map] Google Maps loaded from existing script");
            resolve();
          }
        }, 100);
        // Timeout after 10 seconds
        setTimeout(() => {
          clearInterval(checkInterval);
          console.error("[Map] Google Maps script loading timeout (10s)");
          reject(new Error("Google Maps script loading timeout (10s)"));
        }, 10000);
      }
      return;
    }

    if (!API_KEY) {
      console.error("[Map] API_KEY is not configured. Google Maps will not load.");
      reject(new Error("Google Maps API key not configured (VITE_FRONTEND_FORGE_API_KEY missing)"));
      return;
    }

    const script = document.createElement("script");
    // Load Google Maps API with required libraries
    // Note: 'marker' library is included for future AdvancedMarkerElement support
    // Currently using legacy Marker API which doesn't require mapId
    script.src = `${MAPS_PROXY_URL}/maps/api/js?key=${API_KEY}&v=weekly&libraries=places,geocoding,geometry`;
    script.async = true;
    script.defer = true;
    script.crossOrigin = "anonymous";
    console.log("[Map] Loading Google Maps script from:", script.src);
    console.log("[Map] Note: Using legacy Marker API. For AdvancedMarkerElement, add mapId to map options.");

    script.onload = () => {
      console.log("[Map] Google Maps script loaded successfully");
      resolve();
    };

    script.onerror = () => {
      mapScriptPromise = null; // Reset on error so it can be retried
      console.error("[Map] Failed to load Google Maps script", script.src);
      reject(new Error("Failed to load Google Maps script"));
    };

    console.log("[Map] Appending Google Maps script to DOM");
    document.head.appendChild(script);
  });

  return mapScriptPromise;
}

interface MapViewProps {
  className?: string;
  initialCenter?: { lat: number; lng: number };
  initialZoom?: number;
  onMapReady?: (map: google.maps.Map) => void;
}

export function MapView({
  className,
  initialCenter = { lat: 40.7128, lng: -74.006 },
  initialZoom = 12,
  onMapReady,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const handleMapReady = usePersistFn((map: google.maps.Map) => {
    mapRef.current = map;
    setIsLoading(false);
    onMapReady?.(map);
  });

  useEffect(() => {
    if (!containerRef.current) return;

    let isMounted = true;
    let resizeObserver: ResizeObserver | null = null;
    const timeouts: NodeJS.Timeout[] = [];

    const initializeMap = async () => {
      try {
        setIsLoading(true);
        setMapError(null);

        // Load the Google Maps script
        await loadMapScript();

        if (!isMounted) return;

        if (!window.google?.maps) {
          throw new Error("Google Maps library failed to load");
        }

        if (!containerRef.current) return;

        console.log("[Map] Initializing map...");
        console.log("[Map] Container dimensions:", containerRef.current.offsetWidth, "x", containerRef.current.offsetHeight);

        // Create the map
        // Note: We don't set a mapId here because we're using the legacy Marker API
        // If you want to use AdvancedMarkerElement in the future, you'll need to:
        // 1. Create a Map ID in Google Cloud Console
        // 2. Add mapId property here
        const map = new google.maps.Map(containerRef.current, {
          center: initialCenter,
          zoom: initialZoom,
          mapTypeControl: true,
          fullscreenControl: true,
          streetViewControl: true,
          zoomControl: true,
        });

        console.log("[Map] Map created successfully");
        handleMapReady(map);

        // Trigger resize events for mobile compatibility
        setTimeout(() => {
          if (map) {
            google.maps.event.trigger(map, "resize");
            console.log("[Map] First resize triggered");
          }
        }, 50);

        setTimeout(() => {
          if (map) {
            google.maps.event.trigger(map, "resize");
            console.log("[Map] Second resize triggered");
          }
        }, 150);

        // Use ResizeObserver to handle container resizing
        const resizeObserver = new ResizeObserver(() => {
          if (map && containerRef.current && (containerRef.current.offsetWidth > 0 || containerRef.current.offsetHeight > 0)) {
            google.maps.event.trigger(map, "resize");
            console.log("[Map] Container resized, triggering map resize");
          }
        });

        if (containerRef.current) {
          resizeObserver.observe(containerRef.current);
        }

        return () => {
          resizeObserver.disconnect();
        };
      } catch (error) {
        if (!isMounted) return;

        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("[Map] Error initializing map:", errorMessage);
        setMapError(errorMessage);
        setIsLoading(false);
      }
    };

    initializeMap();

    return () => {
      isMounted = false;
      // Clean up all timeouts
      timeouts.forEach(timeout => clearTimeout(timeout));
      // Clean up ResizeObserver
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [initialCenter, initialZoom, handleMapReady]);

  if (mapError) {
    return (
      <div className={cn("w-full h-full flex items-center justify-center bg-red-50 border border-red-200", className)}>
        <div className="flex flex-col items-center gap-2 text-center px-4">
          <div className="text-red-700 font-medium">Map Error</div>
          <div className="text-xs text-red-600">{mapError}</div>
          {!API_KEY && <div className="text-xs text-red-700 mt-2">API Key not configured</div>}
          <div className="text-xs text-gray-600 mt-2">Try refreshing the page or check browser console for details</div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={cn("w-full h-full flex items-center justify-center bg-gray-50", className)}>
        <div className="flex flex-col items-center gap-2">
          <div className="animate-spin">📍</div>
          <div className="text-xs text-gray-600">Loading map...</div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn("w-full h-full bg-muted", className)}
      style={{ display: "block", minHeight: "200px" }}
    />
  );
}
