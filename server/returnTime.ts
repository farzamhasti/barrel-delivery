import { calculateDistance } from "./geocoding";

/**
 * Return Time Calculation Algorithm
 * 
 * Formula:
 * - 1 minute for pickup at restaurant
 * - 2 minutes per order for delivery
 * - Travel time from restaurant to all delivery points and back
 * 
 * Route optimization: Calculate shortest path visiting all delivery points
 */

export interface ReturnTimeCalculation {
  pickupTime: number; // 60 seconds
  deliveryTime: number; // 2 minutes per order
  travelTime: number; // calculated from distances
  totalSeconds: number;
  totalMinutes: number;
  breakdown: {
    pickupMinutes: number;
    deliveryMinutes: number;
    travelMinutes: number;
  };
}

/**
 * Calculate return time for a driver with assigned orders
 * @param orders - Array of orders with customer location data
 * @param restaurantLat - Restaurant latitude
 * @param restaurantLng - Restaurant longitude
 * @returns Return time calculation breakdown
 */
export function calculateReturnTime(
  orders: Array<{
    id: number;
    customerLatitude: number | null;
    customerLongitude: number | null;
  }>,
  restaurantLat: number,
  restaurantLng: number
): ReturnTimeCalculation {
  // Filter orders with valid coordinates
  const validOrders = orders.filter(
    (order) => order.customerLatitude && order.customerLongitude
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

  // Step 1: Pickup time (1 minute = 60 seconds)
  const pickupTimeSeconds = 60;

  // Step 2: Delivery time (2 minutes per order = 120 seconds per order)
  const deliveryTimeSeconds = validOrders.length * 120;

  // Step 3: Calculate optimal route distance
  // Using nearest neighbor algorithm for route optimization
  const travelTimeSeconds = calculateOptimalRouteTravelTime(
    validOrders,
    restaurantLat,
    restaurantLng
  );

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
  };
}

/**
 * Calculate travel time using nearest neighbor algorithm
 * Assumes average speed of 40 km/h (11.11 m/s)
 * 
 * Route: Restaurant → Nearest Order → Next Nearest → ... → Restaurant
 */
function calculateOptimalRouteTravelTime(
  orders: Array<{
    customerLatitude: number | null;
    customerLongitude: number | null;
  }>,
  restaurantLat: number,
  restaurantLng: number
): number {
  if (orders.length === 0) return 0;

  const AVERAGE_SPEED_KMH = 40; // km/h
  const AVERAGE_SPEED_MS = AVERAGE_SPEED_KMH / 3.6; // convert to m/s

  let totalDistance = 0;
  let currentLat = restaurantLat;
  let currentLng = restaurantLng;
  const visitedIndices = new Set<number>();

  // Nearest neighbor algorithm
  for (let i = 0; i < orders.length; i++) {
    let nearestIndex = -1;
    let nearestDistance = Infinity;

    // Find nearest unvisited order
    for (let j = 0; j < orders.length; j++) {
      if (visitedIndices.has(j)) continue;

      const order = orders[j];
      if (!order.customerLatitude || !order.customerLongitude) continue;

      const distance = calculateDistance(
        currentLat,
        currentLng,
        order.customerLatitude,
        order.customerLongitude
      );

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = j;
      }
    }

    if (nearestIndex === -1) break;

    visitedIndices.add(nearestIndex);
    const order = orders[nearestIndex];
    totalDistance += nearestDistance;

    currentLat = order.customerLatitude!;
    currentLng = order.customerLongitude!;
  }

  // Return to restaurant
  const returnDistance = calculateDistance(
    currentLat,
    currentLng,
    restaurantLat,
    restaurantLng
  );
  totalDistance += returnDistance;

  // Convert distance (meters) to time (seconds)
  const travelTimeSeconds = totalDistance / AVERAGE_SPEED_MS;

  return Math.ceil(travelTimeSeconds);
}
