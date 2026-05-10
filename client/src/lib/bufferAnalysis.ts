/**
 * Buffer Analysis Utility
 * Calculates which orders fall inside/outside competitor buffers
 */

interface Order {
  id: number;
  customerLatitude: number | string;
  customerLongitude: number | string;
  deliveryTime?: number;
  customerAddress?: string;
  createdAt?: string;
}

interface Competitor {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  type: string;
  hasDelivery?: boolean;
}

interface BufferAnalysisResult {
  totalOrders: number;
  ordersInsideBuffer: number;
  ordersOutsideBuffer: number;
  percentageInside: number;
  percentageOutside: number;
  selectedCompetitorsCount: number;
  bufferRadiusKm: number;
  ordersInsideList: Order[];
  ordersOutsideList: Order[];
}

/**
 * Haversine distance calculation (in kilometers)
 */
const haversineDistance = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number => {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Check if an order is inside any competitor's buffer
 */
const isOrderInsideBuffer = (
  order: Order,
  selectedCompetitors: Competitor[],
  bufferRadiusKm: number
): boolean => {
  const orderLat = parseFloat(order.customerLatitude as string);
  const orderLng = parseFloat(order.customerLongitude as string);

  if (!orderLat || !orderLng) return false;

  // Check if order is within buffer of ANY selected competitor
  return selectedCompetitors.some((competitor) => {
    const distance = haversineDistance(
      orderLat,
      orderLng,
      competitor.latitude,
      competitor.longitude
    );
    return distance <= bufferRadiusKm;
  });
};

/**
 * Analyze orders against competitor buffers
 */
export const analyzeCompetitorBuffers = (
  allOrders: Order[],
  selectedCompetitors: Competitor[],
  bufferRadiusKm: number
): BufferAnalysisResult => {
  if (!allOrders || allOrders.length === 0) {
    return {
      totalOrders: 0,
      ordersInsideBuffer: 0,
      ordersOutsideBuffer: 0,
      percentageInside: 0,
      percentageOutside: 0,
      selectedCompetitorsCount: selectedCompetitors.length,
      bufferRadiusKm,
      ordersInsideList: [],
      ordersOutsideList: [],
    };
  }

  if (!selectedCompetitors || selectedCompetitors.length === 0) {
    return {
      totalOrders: allOrders.length,
      ordersInsideBuffer: 0,
      ordersOutsideBuffer: allOrders.length,
      percentageInside: 0,
      percentageOutside: 100,
      selectedCompetitorsCount: 0,
      bufferRadiusKm,
      ordersInsideList: [],
      ordersOutsideList: allOrders,
    };
  }

  const ordersInsideList: Order[] = [];
  const ordersOutsideList: Order[] = [];

  allOrders.forEach((order) => {
    if (isOrderInsideBuffer(order, selectedCompetitors, bufferRadiusKm)) {
      ordersInsideList.push(order);
    } else {
      ordersOutsideList.push(order);
    }
  });

  const ordersInsideBuffer = ordersInsideList.length;
  const ordersOutsideBuffer = ordersOutsideList.length;
  const percentageInside = (ordersInsideBuffer / allOrders.length) * 100;
  const percentageOutside = (ordersOutsideBuffer / allOrders.length) * 100;

  return {
    totalOrders: allOrders.length,
    ordersInsideBuffer,
    ordersOutsideBuffer,
    percentageInside,
    percentageOutside,
    selectedCompetitorsCount: selectedCompetitors.length,
    bufferRadiusKm,
    ordersInsideList,
    ordersOutsideList,
  };
};
