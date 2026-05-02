// Utility to load Google Maps with Places library using direct API key
// Works on both Manus hosting and external deployments (Railway, etc.)

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

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
      console.error("[GoogleMapsLoader] VITE_GOOGLE_MAPS_API_KEY is not configured");
      reject(new Error("Google Maps API key not configured"));
      return;
    }

    const script = document.createElement("script");
    // Load Google Maps API with Places library using direct API key
    // This works on both Manus hosting and external deployments
    script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&v=weekly&libraries=places,geocoding,geometry`;
    script.async = true;
    script.defer = true;
    script.crossOrigin = "anonymous";
    console.log("[GoogleMapsLoader] Loading Google Maps script with direct API key");

    script.onload = () => {
      console.log("[GoogleMapsLoader] Google Maps script loaded successfully");
      resolve();
    };

    script.onerror = () => {
      mapScriptPromise = null; // Reset on error so it can be retried
      console.error("[GoogleMapsLoader] Failed to load Google Maps script");
      reject(new Error("Failed to load Google Maps script"));
    };

    console.log("[GoogleMapsLoader] Appending Google Maps script to DOM");
    document.head.appendChild(script);
  });

  return mapScriptPromise;
}
