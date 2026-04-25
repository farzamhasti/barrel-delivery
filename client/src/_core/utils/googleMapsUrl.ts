/**
 * Generate a Google Maps URL for navigation with optimized waypoints
 * Opens the native Google Maps app on mobile or web
 */

const RESTAURANT_LAT = 42.905191;
const RESTAURANT_LNG = -78.9225479;

export interface Order {
  id: number;
  customer?: {
    latitude: string | number;
    longitude: string | number;
  };
}

/**
 * Generate Google Maps URL for a single order delivery
 */
export function generateSingleOrderMapUrl(order: Order): string {
  if (!order.customer?.latitude || !order.customer?.longitude) {
    console.error("Order missing customer coordinates");
    return "";
  }

  const lat = parseFloat(String(order.customer.latitude));
  const lng = parseFloat(String(order.customer.longitude));

  return `https://www.google.com/maps/dir/?api=1&origin=${RESTAURANT_LAT},${RESTAURANT_LNG}&destination=${lat},${lng}&travelmode=driving`;
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

  // Build waypoints string (pipe-separated coordinates)
  const waypoints = orders
    .map((order) => {
      const lat = parseFloat(String(order.customer?.latitude || 0));
      const lng = parseFloat(String(order.customer?.longitude || 0));
      return `${lat},${lng}`;
    })
    .join("|");

  // Google Maps URL with optimized waypoints
  return `https://www.google.com/maps/dir/?api=1&origin=${RESTAURANT_LAT},${RESTAURANT_LNG}&destination=${RESTAURANT_LAT},${RESTAURANT_LNG}&waypoints=${waypoints}&waypoints_order=optimized&travelmode=driving`;
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
