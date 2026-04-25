/**
 * Generate a Google Maps URL for navigation with optimized waypoints
 * Opens the native Google Maps app on mobile or web
 * Uses text addresses instead of coordinates for better reliability
 */

const RESTAURANT_ADDRESS = "Atlas Tech & Tools, 224 Garrison Rd unit 7, Fort Erie, ON L2A 1M8";

export interface Order {
  id: number;
  customerAddress?: string;
  customerLatitude?: string | number | null;
  customerLongitude?: string | number | null;
}

/**
 * Generate Google Maps URL for a single order delivery
 */
export function generateSingleOrderMapUrl(order: Order): string {
  if (!order.customerAddress) {
    console.error("Order missing customer address");
    return "";
  }

  const origin = encodeURIComponent(RESTAURANT_ADDRESS);
  const destination = encodeURIComponent(order.customerAddress);

  return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`;
}

/**
 * Generate Google Maps URL for multiple order deliveries with optimized route
 * Route: Restaurant → optimized delivery stops → Restaurant
 */
export function generateMultiOrderMapUrl(orders: Order[]): string {
  if (orders.length === 0) {
    return "";
  }

  if (orders.length === 1) {
    return generateSingleOrderMapUrl(orders[0]);
  }

  // Build waypoints string (pipe-separated addresses)
  const waypoints = orders
    .map((order) => {
      if (!order.customerAddress) {
        console.warn("Order missing customer address, skipping");
        return null;
      }
      return encodeURIComponent(order.customerAddress);
    })
    .filter((wp) => wp !== null)
    .join("|");

  if (!waypoints) {
    console.error("No valid waypoints found");
    return "";
  }

  const origin = encodeURIComponent(RESTAURANT_ADDRESS);
  const destination = encodeURIComponent(RESTAURANT_ADDRESS);

  // Google Maps URL with optimized waypoints
  return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${waypoints}&travelmode=driving`;
}

/**
 * Open Google Maps with the delivery route
 */
export function openDeliveryMap(orders: Order[]): void {
  if (orders.length === 0) {
    console.warn("No orders to navigate");
    return;
  }

  const url = generateMultiOrderMapUrl(orders);
  if (url) {
    window.open(url, "_blank");
  }
}
