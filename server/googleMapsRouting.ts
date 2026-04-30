/**
 * Google Maps Routing Module
 * 
 * Uses Google Maps Directions API for accurate route calculation
 * Supports both single and multiple orders with waypoint optimization
 * Uses text addresses instead of coordinates for better reliability
 */

import { makeRequest, DirectionsResult } from "./_core/map";

export interface RoutingOrder {
  id: number;
  address: string;
  latitude?: number;
  longitude?: number;
}

export interface RoutingCalculation {
  pickupTime: number; // 60 seconds
  deliveryTime: number; // 2 minutes per order
  travelTime: number; // from Google Maps Directions API
  totalSeconds: number;
  totalMinutes: number;
  breakdown: {
    pickupMinutes: number;
    deliveryMinutes: number;
    travelMinutes: number;
  };
  routeInfo?: {
    distance: number; // meters
    duration: number; // seconds
    waypointOrder?: number[];
  };
}

/**
 * Normalize address by appending city and province if not already present
 * Handles incomplete addresses like "1 Hospitality Dr" → "1 Hospitality Dr, Fort Erie, ON"
 */
export function normalizeAddress(address: string): string {
  if (!address) return address;
  
  const normalized = address.trim();
  
  // If address already contains Fort Erie, assume it's complete
  if (normalized.toLowerCase().includes('fort erie')) {
    return normalized;
  }
  
  // Check if address contains "ON" as a separate word (not part of postal code)
  // Ontario postal codes start with letters, so we check for ", ON" or " ON" patterns
  const hasOntarioProvince = /,\s*ON\b|\s+ON\b/i.test(normalized);
  if (hasOntarioProvince) {
    return normalized;
  }
  
  // Append Fort Erie, ON to incomplete addresses
  return `${normalized}, Fort Erie, ON`;
}

/**
 * Calculate return time using Google Maps Directions API
 * 
 * For single order:
 * - Restaurant → Order location → Restaurant (round trip)
 * 
 * For multiple orders:
 * - Restaurant → [optimized delivery locations] → Restaurant
 * - Uses waypoint optimization to find shortest route
 * 
 * @param orders - Array of orders with address and coordinates
 * @param restaurantAddress - Restaurant address for geocoding
 * @param restaurantLat - Restaurant latitude
 * @param restaurantLng - Restaurant longitude
 * @returns Routing calculation with travel time from Google Maps
 */
export async function calculateReturnTimeWithGoogleMaps(
  orders: RoutingOrder[],
  restaurantAddress: string,
  restaurantLat: number,
  restaurantLng: number
): Promise<RoutingCalculation> {
  // Filter orders with valid addresses
  const validOrders = orders.filter(
    (order) => order.address && order.address.trim().length > 0
  );

  if (validOrders.length === 0) {
    // No valid orders, just return pickup time
    return {
      pickupTime: 60,
      deliveryTime: 0,
      travelTime: 0,
      totalSeconds: 60,
      totalMinutes: 1,
      breakdown: {
        pickupMinutes: 1,
        deliveryMinutes: 0,
        travelMinutes: 0,
      },
    };
  }

  try {
    // Calculate travel time using Google Maps Directions API
    const travelTimeSeconds = await calculateGoogleMapsTravelTime(
      validOrders,
      restaurantAddress,
      restaurantLat,
      restaurantLng
    );

    // Step 1: Pickup time (1 minute = 60 seconds)
    const pickupTimeSeconds = 60;

    // Step 2: Delivery time (2 minutes per order = 120 seconds per order)
    const deliveryTimeSeconds = validOrders.length * 120;

    const totalSeconds = pickupTimeSeconds + deliveryTimeSeconds + travelTimeSeconds;

    return {
      pickupTime: pickupTimeSeconds,
      deliveryTime: deliveryTimeSeconds,
      travelTime: travelTimeSeconds,
      totalSeconds,
      totalMinutes: Math.ceil(totalSeconds / 60),
      breakdown: {
        pickupMinutes: Math.ceil(pickupTimeSeconds / 60),
        deliveryMinutes: Math.ceil(deliveryTimeSeconds / 60),
        travelMinutes: Math.ceil(travelTimeSeconds / 60),
      },
      routeInfo: {
        distance: 0, // Would be populated from directions response
        duration: travelTimeSeconds,
      },
    };
  } catch (error) {
    console.error("[GoogleMapsRouting] Error calculating route:", error);
    // Fallback to basic calculation if Google Maps fails
    return {
      pickupTime: 60,
      deliveryTime: validOrders.length * 120,
      travelTime: 0,
      totalSeconds: 60 + validOrders.length * 120,
      totalMinutes: Math.ceil((60 + validOrders.length * 120) / 60),
      breakdown: {
        pickupMinutes: 1,
        deliveryMinutes: validOrders.length * 2,
        travelMinutes: 0,
      },
    };
  }
}

/**
 * Calculate travel time using Google Maps Directions API
 * 
 * Single order: Direct round trip (Restaurant → Order → Restaurant)
 * Multiple orders: Optimized route with waypoints (Restaurant → Orders → Restaurant)
 * 
 * Uses text addresses instead of coordinates for better reliability
 * 
 * @returns Travel time in seconds
 */
async function calculateGoogleMapsTravelTime(
  orders: RoutingOrder[],
  restaurantAddress: string,
  restaurantLat: number,
  restaurantLng: number
): Promise<number> {
  console.log('[GoogleMapsRouting] calculateGoogleMapsTravelTime called with:', {
    ordersCount: orders.length,
    orders: orders.map(o => ({ id: o.id, address: o.address, normalized: normalizeAddress(o.address) })),
    restaurantAddress,
  });

  if (orders.length === 1) {
    // Single order: direct round trip
    const order = orders[0];

    try {
      const normalizedOrderAddress = normalizeAddress(order.address);
      
      console.log('[GoogleMapsRouting] Single order routing:', {
        origin: restaurantAddress,
        destination: order.address,
        normalizedDestination: normalizedOrderAddress,
      });

      // Get directions from restaurant to order location
      const directionsResult = await makeRequest<DirectionsResult>(
        "/maps/api/directions/json",
        {
          origin: restaurantAddress,
          destination: normalizedOrderAddress,
          mode: "driving",
        }
      );

      console.log('[GoogleMapsRouting] Outbound response status:', directionsResult.status);

      if (
        directionsResult.status === "OK" &&
        directionsResult.routes.length > 0
      ) {
        const route = directionsResult.routes[0];
        let outboundDuration = 0;

        // Sum up all leg durations for outbound trip
        for (const leg of route.legs) {
          outboundDuration += leg.duration.value; // duration.value is in seconds
        }

        console.log('[GoogleMapsRouting] Outbound duration:', outboundDuration, 'seconds');

        // Now get return trip from order location back to restaurant
        const normalizedOrderAddressForReturn = normalizeAddress(order.address);
        
        console.log('[GoogleMapsRouting] Requesting return trip:', {
          origin: order.address,
          normalizedOrigin: normalizedOrderAddressForReturn,
          destination: restaurantAddress,
        });

        const returnResult = await makeRequest<DirectionsResult>(
          "/maps/api/directions/json",
          {
            origin: normalizedOrderAddressForReturn,
            destination: restaurantAddress,
            mode: "driving",
          }
        );

        console.log('[GoogleMapsRouting] Return response status:', returnResult.status);

        if (
          returnResult.status === "OK" &&
          returnResult.routes.length > 0
        ) {
          const returnRoute = returnResult.routes[0];
          let returnDuration = 0;

          // Sum up all leg durations for return trip
          for (const leg of returnRoute.legs) {
            returnDuration += leg.duration.value;
          }

          console.log('[GoogleMapsRouting] Return duration:', returnDuration, 'seconds');
          console.log('[GoogleMapsRouting] Total travel time:', outboundDuration + returnDuration, 'seconds');

          return outboundDuration + returnDuration;
        } else {
          console.warn(
            `[GoogleMapsRouting] Return trip API returned status: ${returnResult.status}`
          );
          return outboundDuration * 2; // Estimate return as same as outbound
        }
      } else {
        console.warn(
          `[GoogleMapsRouting] Directions API returned status: ${directionsResult.status}`,
          { status: directionsResult.status, error_message: (directionsResult as any).error_message }
        );
        return 0;
      }
    } catch (error) {
      console.error("[GoogleMapsRouting] Single order routing error:", error);
      return 0;
    }
  } else {
    // Multiple orders: optimized route with all addresses as waypoints
    const normalizedWaypoints = orders
      .map((order) => normalizeAddress(order.address))
      .join("|");

    console.log('[GoogleMapsRouting] Multiple orders routing:', {
      origin: restaurantAddress,
      destination: restaurantAddress,
      waypointsCount: orders.length,
      waypoints: normalizedWaypoints.substring(0, 100) + (normalizedWaypoints.length > 100 ? '...' : ''),
    });

    try {
      const directionsResult = await makeRequest<DirectionsResult>(
        "/maps/api/directions/json",
        {
          origin: restaurantAddress,
          destination: restaurantAddress, // Return to restaurant
          waypoints: normalizedWaypoints,
          mode: "driving",
          optimize: "true", // Enable waypoint optimization
        }
      );

      console.log('[GoogleMapsRouting] Multiple orders response status:', directionsResult.status);

      if (
        directionsResult.status === "OK" &&
        directionsResult.routes.length > 0
      ) {
        const route = directionsResult.routes[0];
        let totalDuration = 0;

        // Sum up all leg durations
        for (const leg of route.legs) {
          totalDuration += leg.duration.value; // duration.value is in seconds
        }

        console.log('[GoogleMapsRouting] Total travel time (multiple orders):', totalDuration, 'seconds');

        return totalDuration;
      } else {
        console.warn(
          `[GoogleMapsRouting] Directions API returned status: ${directionsResult.status}`,
          { status: directionsResult.status, error_message: (directionsResult as any).error_message }
        );
        return 0;
      }
    } catch (error) {
      console.error("[GoogleMapsRouting] Multiple orders routing error:", error);
      return 0;
    }
  }
}
