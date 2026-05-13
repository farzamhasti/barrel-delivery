import * as h3 from "h3-js";
import { isPointInBoundary } from './geographicBoundaryFilter';
import { getOrdersWithCoordinates } from './geomarketing';

export interface DemandZone {
  hexId: string;
  latitude: number;
  longitude: number;
  previousPeriodOrders: number;
  currentPeriodOrders: number;
  orderDensityChange: number;
  growthPercentage: number;
  classification: "Strong Growth" | "Moderate Growth" | "Stable" | "Weakening" | "Rapid Decline";
  avgWaitingTimePrevious: number;
  avgWaitingTimeCurrent: number;
  waitingTimeTrend: number;
  avgDeliveryTimePrevious: number;
  avgDeliveryTimeCurrent: number;
  deliveryTimeTrend: number;
  orderLocations: Array<{ lat: number; lon: number; orderId: string }>;
}

export interface DemandChangeAnalysisResult {
  zones: DemandZone[];
  periodComparison: {
    previousPeriod: { startDate: Date; endDate: Date; totalOrders: number };
    currentPeriod: { startDate: Date; endDate: Date; totalOrders: number };
  };
  spatialInterpretation: string;
  success: boolean;
}

/**
 * Analyze geographic demand changes over time within Fort Erie boundary
 * Compares two time periods to identify demand evolution patterns
 */
export async function analyzeDemandChange(
  previousStartDate: Date,
  previousEndDate: Date,
  currentStartDate: Date,
  currentEndDate: Date
): Promise<DemandChangeAnalysisResult> {
  try {
    console.log(`[analyzeDemandChange] Analyzing demand from ${previousStartDate.toISOString()} to ${currentStartDate.toISOString()}`);

    // Fetch orders for both periods
    const previousOrders = await getOrdersWithCoordinates(previousStartDate, previousEndDate);
    const currentOrders = await getOrdersWithCoordinates(currentStartDate, currentEndDate);

    console.log(`[analyzeDemandChange] Previous period orders: ${previousOrders.length}, Current period orders: ${currentOrders.length}`);

    // Filter to Fort Erie boundary
    const previousFortErieOrders = previousOrders.filter((o: any) => {
      if (!o.customerLatitude || !o.customerLongitude) return false;
      const result = isPointInBoundary(Number(o.customerLongitude), Number(o.customerLatitude));
      return result.isInside;
    });

    const currentFortErieOrders = currentOrders.filter((o: any) => {
      if (!o.customerLatitude || !o.customerLongitude) return false;
      const result = isPointInBoundary(Number(o.customerLongitude), Number(o.customerLatitude));
      return result.isInside;
    });

    console.log(`[analyzeDemandChange] Fort Erie orders - Previous: ${previousFortErieOrders.length}, Current: ${currentFortErieOrders.length}`);

    if (previousFortErieOrders.length === 0 && currentFortErieOrders.length === 0) {
      return {
        zones: [],
        periodComparison: {
          previousPeriod: { startDate: previousStartDate, endDate: previousEndDate, totalOrders: 0 },
          currentPeriod: { startDate: currentStartDate, endDate: currentEndDate, totalOrders: 0 },
        },
        spatialInterpretation: "No delivery data available within Fort Erie for the selected periods.",
        success: false,
      };
    }

    // Aggregate orders into H3 hexagons (resolution 5 for ~1km cells)
    const hexResolution = 5;
    const previousHexagons = new Map<string, { orders: any[]; totalWaitingTime: number; totalDeliveryTime: number }>();
    const currentHexagons = new Map<string, { orders: any[]; totalWaitingTime: number; totalDeliveryTime: number }>();

    // Process previous period
    for (const order of previousFortErieOrders) {
      const lat = Number(order.customerLatitude);
      const lon = Number(order.customerLongitude);
      const hexId = h3.latLngToCell(lat, lon, hexResolution);

      if (!previousHexagons.has(hexId)) {
        previousHexagons.set(hexId, { orders: [], totalWaitingTime: 0, totalDeliveryTime: 0 });
      }

      const hex = previousHexagons.get(hexId)!;
      hex.orders.push(order);

      // Calculate waiting time (ready time - order creation)
      const waitingTime = order.readyAt && order.createdAt
        ? (new Date(order.readyAt).getTime() - new Date(order.createdAt).getTime()) / (1000 * 60)
        : 0;

      // Calculate total delivery time (delivered - created)
      const totalDeliveryTime = order.deliveredAt && order.createdAt
        ? (new Date(order.deliveredAt).getTime() - new Date(order.createdAt).getTime()) / (1000 * 60)
        : 0;

      hex.totalWaitingTime += waitingTime;
      hex.totalDeliveryTime += totalDeliveryTime;
    }

    // Process current period
    for (const order of currentFortErieOrders) {
      const lat = Number(order.customerLatitude);
      const lon = Number(order.customerLongitude);
      const hexId = h3.latLngToCell(lat, lon, hexResolution);

      if (!currentHexagons.has(hexId)) {
        currentHexagons.set(hexId, { orders: [], totalWaitingTime: 0, totalDeliveryTime: 0 });
      }

      const hex = currentHexagons.get(hexId)!;
      hex.orders.push(order);

      const waitingTime = order.readyAt && order.createdAt
        ? (new Date(order.readyAt).getTime() - new Date(order.createdAt).getTime()) / (1000 * 60)
        : 0;

      const totalDeliveryTime = order.deliveredAt && order.createdAt
        ? (new Date(order.deliveredAt).getTime() - new Date(order.createdAt).getTime()) / (1000 * 60)
        : 0;

      hex.totalWaitingTime += waitingTime;
      hex.totalDeliveryTime += totalDeliveryTime;
    }

    // Analyze demand changes across all zones
    const allHexIds = new Set([...previousHexagons.keys(), ...currentHexagons.keys()]);
    const zones: DemandZone[] = [];

    for (const hexId of allHexIds) {
      const prevData = previousHexagons.get(hexId);
      const currData = currentHexagons.get(hexId);

      const previousOrderCount = prevData?.orders.length || 0;
      const currentOrderCount = currData?.orders.length || 0;

      // Skip zones with no activity in either period
      if (previousOrderCount === 0 && currentOrderCount === 0) continue;

      const orderDensityChange = currentOrderCount - previousOrderCount;
      const growthPercentage = previousOrderCount > 0
        ? ((currentOrderCount - previousOrderCount) / previousOrderCount) * 100
        : (currentOrderCount > 0 ? 100 : 0);

      // Calculate average times
      const avgWaitingTimePrevious = previousOrderCount > 0
        ? (prevData?.totalWaitingTime || 0) / previousOrderCount
        : 0;

      const avgWaitingTimeCurrent = currentOrderCount > 0
        ? (currData?.totalWaitingTime || 0) / currentOrderCount
        : 0;

      const avgDeliveryTimePrevious = previousOrderCount > 0
        ? (prevData?.totalDeliveryTime || 0) / previousOrderCount
        : 0;

      const avgDeliveryTimeCurrent = currentOrderCount > 0
        ? (currData?.totalDeliveryTime || 0) / currentOrderCount
        : 0;

      const waitingTimeTrend = avgWaitingTimeCurrent - avgWaitingTimePrevious;
      const deliveryTimeTrend = avgDeliveryTimeCurrent - avgDeliveryTimePrevious;

      // Classify zone based on demand change
      let classification: DemandZone["classification"];

      if (previousOrderCount === 0 && currentOrderCount > 0) {
        classification = "Strong Growth"; // New demand area
      } else if (growthPercentage >= 50) {
        classification = "Strong Growth";
      } else if (growthPercentage >= 10) {
        classification = "Moderate Growth";
      } else if (growthPercentage >= -10) {
        classification = "Stable";
      } else if (growthPercentage >= -50) {
        classification = "Weakening";
      } else {
        classification = "Rapid Decline";
      }

      // Get zone center coordinates
      const [lat, lon] = h3.cellToLatLng(hexId);

      // Collect all order locations
      const orderLocations = [
        ...(prevData?.orders || []),
        ...(currData?.orders || []),
      ].map((o: any) => ({
        lat: Number(o.customerLatitude || 0),
        lon: Number(o.customerLongitude || 0),
        orderId: o.id,
      }));

      zones.push({
        hexId,
        latitude: lat,
        longitude: lon,
        previousPeriodOrders: previousOrderCount,
        currentPeriodOrders: currentOrderCount,
        orderDensityChange,
        growthPercentage,
        classification,
        avgWaitingTimePrevious,
        avgWaitingTimeCurrent,
        waitingTimeTrend,
        avgDeliveryTimePrevious,
        avgDeliveryTimeCurrent,
        deliveryTimeTrend,
        orderLocations,
      });
    }

    // Sort by density change (most significant shifts first)
    zones.sort((a, b) => Math.abs(b.orderDensityChange) - Math.abs(a.orderDensityChange));

    console.log(`[analyzeDemandChange] Total zones analyzed: ${zones.length}`);

    // Generate spatial interpretation
    const spatialInterpretation = generateDemandInterpretation(zones, previousStartDate, previousEndDate, currentStartDate, currentEndDate);

    return {
      zones: zones.slice(0, 15), // Return top 15 zones
      periodComparison: {
        previousPeriod: { startDate: previousStartDate, endDate: previousEndDate, totalOrders: previousFortErieOrders.length },
        currentPeriod: { startDate: currentStartDate, endDate: currentEndDate, totalOrders: currentFortErieOrders.length },
      },
      spatialInterpretation,
      success: true,
    };
  } catch (error) {
    console.error("[analyzeDemandChange] Error:", error);
    return {
      zones: [],
      periodComparison: {
        previousPeriod: { startDate: previousStartDate, endDate: previousEndDate, totalOrders: 0 },
        currentPeriod: { startDate: currentStartDate, endDate: currentEndDate, totalOrders: 0 },
      },
      spatialInterpretation: "Error analyzing demand changes.",
      success: false,
    };
  }
}

/**
 * Generate human-readable spatial interpretation
 */
function generateDemandInterpretation(
  zones: DemandZone[],
  prevStart: Date,
  prevEnd: Date,
  currStart: Date,
  currEnd: Date
): string {
  if (zones.length === 0) {
    return "No significant demand changes detected in Fort Erie during this period.";
  }

  const strongGrowth = zones.filter((z) => z.classification === "Strong Growth");
  const moderateGrowth = zones.filter((z) => z.classification === "Moderate Growth");
  const weakening = zones.filter((z) => z.classification === "Weakening");
  const rapidDecline = zones.filter((z) => z.classification === "Rapid Decline");

  let interpretation = `Demand analysis comparing ${prevStart.toLocaleDateString()} to ${currStart.toLocaleDateString()}: `;

  if (strongGrowth.length > 0) {
    interpretation += `${strongGrowth.length} zones show strong demand growth. `;
  }

  if (moderateGrowth.length > 0) {
    interpretation += `${moderateGrowth.length} zones show moderate growth. `;
  }

  if (weakening.length > 0) {
    interpretation += `${weakening.length} zones show weakening demand. `;
  }

  if (rapidDecline.length > 0) {
    interpretation += `${rapidDecline.length} zones show rapid demand decline. `;
  }

  // Check for operational pressure
  const highWaitingTimeZones = zones.filter((z) => z.waitingTimeTrend > 5);
  if (highWaitingTimeZones.length > 0) {
    interpretation += `Preparation times are increasing in ${highWaitingTimeZones.length} regions, indicating rising operational pressure. `;
  }

  // Check for delivery time changes
  const improvedDeliveryZones = zones.filter((z) => z.deliveryTimeTrend < -5);
  if (improvedDeliveryZones.length > 0) {
    interpretation += `Delivery efficiency is improving in ${improvedDeliveryZones.length} zones. `;
  }

  return interpretation;
}
