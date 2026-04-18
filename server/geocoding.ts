import { makeRequest, GeocodingResult } from "./_core/map";

/**
 * Geocoding service for converting addresses to coordinates using Google Maps API
 * via the Manus proxy (no manual API key setup required)
 */

export interface GeocodeResult {
  latitude: number;
  longitude: number;
  formattedAddress: string;
  placeId?: string;
}

export interface GeocodeError {
  error: string;
  address: string;
}

/**
 * Geocode an address to get latitude and longitude coordinates
 * Uses the Manus built-in Maps API through the proxy
 */
export async function geocodeAddress(address: string): Promise<GeocodeResult | GeocodeError> {
  try {
    if (!address || address.trim().length === 0) {
      return {
        error: "Address is required",
        address,
      };
    }

    // Use the Google Maps Geocoding API through Manus proxy
    // The makeRequest helper handles authentication automatically
    const result = await makeRequest<GeocodingResult>(
      "/maps/api/geocode/json",
      {
        address,
        region: "CA", // Default to Canada
      }
    );

    if (result.status !== "OK" || !result.results || result.results.length === 0) {
      return {
        error: `Geocoding failed: ${result.status}`,
        address,
      };
    }

    const geocodeResult = result.results[0];
    const location = geocodeResult.geometry?.location;

    if (!location) {
      return {
        error: "Could not extract coordinates from geocoding result",
        address,
      };
    }

    return {
      latitude: location.lat,
      longitude: location.lng,
      formattedAddress: geocodeResult.formatted_address || address,
      placeId: geocodeResult.place_id,
    };
  } catch (error) {
    console.error("Geocoding error:", error);
    return {
      error: error instanceof Error ? error.message : "Unknown geocoding error",
      address,
    };
  }
}

/**
 * Batch geocode multiple addresses
 * Returns array with results and errors for each address
 */
export async function geocodeAddresses(
  addresses: string[]
): Promise<(GeocodeResult | GeocodeError)[]> {
  const results = await Promise.all(
    addresses.map(address => geocodeAddress(address))
  );
  return results;
}

/**
 * Reverse geocode coordinates to get address
 * Converts latitude/longitude to human-readable address
 */
export async function reverseGeocodeCoordinates(
  latitude: number,
  longitude: number
): Promise<GeocodeResult | GeocodeError> {
  try {
    if (
      typeof latitude !== "number" ||
      typeof longitude !== "number" ||
      isNaN(latitude) ||
      isNaN(longitude)
    ) {
      return {
        error: "Invalid coordinates",
        address: `${latitude},${longitude}`,
      };
    }

    // Use the Google Maps Reverse Geocoding API through Manus proxy
    const result = await makeRequest<GeocodingResult>(
      "/maps/api/geocode/json",
      {
        latlng: `${latitude},${longitude}`,
      }
    );

    if (result.status !== "OK" || !result.results || result.results.length === 0) {
      return {
        error: `Reverse geocoding failed: ${result.status}`,
        address: `${latitude},${longitude}`,
      };
    }

    const geocodeResult = result.results[0];

    return {
      latitude,
      longitude,
      formattedAddress: geocodeResult.formatted_address || `${latitude},${longitude}`,
      placeId: geocodeResult.place_id,
    };
  } catch (error) {
    console.error("Reverse geocoding error:", error);
    return {
      error: error instanceof Error ? error.message : "Unknown reverse geocoding error",
      address: `${latitude},${longitude}`,
    };
  }
}

/**
 * Calculate distance between two coordinates in kilometers
 * Uses Haversine formula for great-circle distance
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Validate if coordinates are within reasonable bounds
 */
export function isValidCoordinates(latitude: number, longitude: number): boolean {
  return (
    typeof latitude === "number" &&
    typeof longitude === "number" &&
    !isNaN(latitude) &&
    !isNaN(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}
