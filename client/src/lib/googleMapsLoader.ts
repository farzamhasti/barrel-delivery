// Utility to load Google Maps with Places library through Manus proxy
// This ensures consistent API key handling and Places library availability

const API_KEY = import.meta.env.VITE_FRONTEND_FORGE_API_KEY || "";
const FORGE_BASE_URL =
  import.meta.env.VITE_FRONTEND_FORGE_API_URL ||
  "https://forge.butterfly-effect.dev";
const MAPS_PROXY_URL = `${FORGE_BASE_URL}/v1/maps/proxy`;

let mapScriptPromise: Promise<void> | null = null;

export function loadGoogleMapsWithPlaces(): Promise<void> {
  // Return existing promise if already loading or loaded
  if (mapScriptPromise) {
    return mapScriptPromise;
  }

  // Check if Google Maps is already loaded
  if (window.google?.maps?.places?.Autocomplete) {
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
      if (window.google?.maps?.places?.Autocomplete) {
        resolve();
      } else {
        // Wait for the existing script to load
        const checkInterval = setInterval(() => {
          if (window.google?.maps?.places?.Autocomplete) {
            clearInterval(checkInterval);
            console.log("[GoogleMapsLoader] Places API loaded from existing script");
            resolve();
          }
        }, 100);
        // Timeout after 10 seconds
        setTimeout(() => {
          clearInterval(checkInterval);
          console.error("[GoogleMapsLoader] Places API loading timeout (10s)");
          reject(new Error("Places API loading timeout (10s)"));
        }, 10000);
      }
      return;
    }

    if (!API_KEY) {
      console.error("[GoogleMapsLoader] API_KEY is not configured");
      reject(new Error("API_KEY not configured"));
      return;
    }

    const script = document.createElement("script");
    // Load Google Maps API with Places library through Manus proxy
    script.src = `${MAPS_PROXY_URL}/maps/api/js?key=${API_KEY}&v=weekly&libraries=places,geocoding,geometry`;
    script.async = true;
    script.defer = true;
    script.crossOrigin = "anonymous";
    console.log("[GoogleMapsLoader] Loading Google Maps script from:", script.src);

    script.onload = () => {
      console.log("[GoogleMapsLoader] Google Maps script loaded successfully");
      resolve();
    };

    script.onerror = () => {
      mapScriptPromise = null; // Reset on error so it can be retried
      console.error("[GoogleMapsLoader] Failed to load Google Maps script", script.src);
      reject(new Error("Failed to load Google Maps script"));
    };

    console.log("[GoogleMapsLoader] Appending Google Maps script to DOM");
    document.head.appendChild(script);
  });

  return mapScriptPromise;
}
