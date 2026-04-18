import { invokeLLM } from "./_core/llm";

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

    // Use the built-in Maps API through Manus proxy
    // The proxy automatically handles authentication
    const response = await fetch(
      `${process.env.BUILT_IN_FORGE_API_URL}/maps/geocode`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.BUILT_IN_FORGE_API_KEY}`,
        },
        body: JSON.stringify({
          address,
          region: "CA", // Default to Canada
        }),
      }
    );

    if (!response.ok) {
      console.error(`Geocoding failed: ${response.status} ${response.statusText}`);
      return {
        error: `Geocoding service returned ${response.status}`,
        address,
      };
    }

    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      return {
        error: "Address not found",
        address,
      };
    }

    const result = data.results[0];
    const location = result.geometry?.location;

    if (!location) {
      return {
        error: "Could not extract coordinates from geocoding result",
        address,
      };
    }

    return {
      latitude: location.lat,
      longitude: location.lng,
      formattedAddress: result.formatted_address || address,
      placeId: result.place_id,
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

    const response = await fetch(
      `${process.env.BUILT_IN_FORGE_API_URL}/maps/reverse-geocode`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.BUILT_IN_FORGE_API_KEY}`,
        },
        body: JSON.stringify({
          latitude,
          longitude,
        }),
      }
    );

    if (!response.ok) {
      console.error(`Reverse geocoding failed: ${response.status}`);
      return {
        error: `Reverse geocoding service returned ${response.status}`,
        address: `${latitude},${longitude}`,
      };
    }

    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      return {
        error: "No address found for coordinates",
        address: `${latitude},${longitude}`,
      };
    }

    const result = data.results[0];

    return {
      latitude,
      longitude,
      formattedAddress: result.formatted_address || `${latitude},${longitude}`,
      placeId: result.place_id,
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
