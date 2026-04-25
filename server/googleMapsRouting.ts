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
 * Single order: Direct round trip
 * Multiple orders: Optimized route with waypoints
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
  if (orders.length === 1) {
    // Single order: direct round trip
    const order = orders[0];

    try {
      // Get directions from restaurant to order location using text addresses
      const directionsResult = await makeRequest<DirectionsResult>(
        "/maps/api/directions/json",
        {
          origin: restaurantAddress,
          destination: restaurantAddress, // Return to restaurant
          waypoints: order.address, // Single waypoint using text address
          mode: "driving",
          optimize: "true", // Optimize the route
        }
      );

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

        return totalDuration;
      } else {
        console.warn(
          `[GoogleMapsRouting] Directions API returned status: ${directionsResult.status}`
        );
        return 0;
      }
    } catch (error) {
      console.error("[GoogleMapsRouting] Single order routing error:", error);
      return 0;
    }
  } else {
    // Multiple orders: optimized route with all addresses as waypoints
    const waypoints = orders
      .map((order) => order.address)
      .join("|");

    try {
      const directionsResult = await makeRequest<DirectionsResult>(
        "/maps/api/directions/json",
        {
          origin: restaurantAddress,
          destination: restaurantAddress, // Return to restaurant
          waypoints: waypoints,
          mode: "driving",
          optimize: "true", // Enable waypoint optimization
        }
      );

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

        return totalDuration;
      } else {
        console.warn(
          `[GoogleMapsRouting] Directions API returned status: ${directionsResult.status}`
        );
        return 0;
      }
    } catch (error) {
      console.error("[GoogleMapsRouting] Multiple orders routing error:", error);
      return 0;
    }
  }
}
