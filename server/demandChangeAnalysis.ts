import { isPointInBoundary } from './geographicBoundaryFilter';
import { getOrdersWithCoordinates } from './geomarketing';

export interface DemandZone {
  zoneId: string;
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
  fortErieBoundary: { center: { lat: number; lon: number }; radius: number };
}

/**
 * Create a grid cell ID for a given lat/lon within Fort Erie
 * Uses 0.01 degree cells (~1km) to create a constrained grid
 */
function getGridCellId(lat: number, lon: number): string {
  const cellSize = 0.01; // ~1km at this latitude
  const cellLat = Math.floor(lat / cellSize) * cellSize;
  const cellLon = Math.floor(lon / cellSize) * cellSize;
  return `${cellLat.toFixed(2)}_${cellLon.toFixed(2)}`;
}

/**
 * Get grid cell center coordinates
 */
function getGridCellCenter(cellId: string): { lat: number; lon: number } {
  const [latStr, lonStr] = cellId.split('_');
  return {
    lat: parseFloat(latStr) + 0.005,
    lon: parseFloat(lonStr) + 0.005,
  };
}

/**
 * Analyze geographic demand changes over time within Fort Erie boundary ONLY
 * Compares two time periods to identify demand evolution patterns
 * Uses a constrained grid that respects Fort Erie boundaries
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

    // Filter to Fort Erie boundary ONLY - this is critical
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
        fortErieBoundary: { center: { lat: 42.8812, lon: -78.9485 }, radius: 5 },
      };
    }

    // Aggregate orders into constrained grid cells (within Fort Erie only)
    const previousGridCells = new Map<string, { orders: any[]; totalWaitingTime: number; totalDeliveryTime: number }>();
    const currentGridCells = new Map<string, { orders: any[]; totalWaitingTime: number; totalDeliveryTime: number }>();

    // Process previous period
    for (const order of previousFortErieOrders) {
      const lat = Number(order.customerLatitude);
      const lon = Number(order.customerLongitude);
      const cellId = getGridCellId(lat, lon);

      if (!previousGridCells.has(cellId)) {
        previousGridCells.set(cellId, { orders: [], totalWaitingTime: 0, totalDeliveryTime: 0 });
      }

      const cell = previousGridCells.get(cellId)!;
      cell.orders.push(order);

      // Calculate waiting time (ready time - order creation)
      const waitingTime = order.readyAt && order.createdAt
        ? (new Date(order.readyAt).getTime() - new Date(order.createdAt).getTime()) / (1000 * 60)
        : 0;

      // Calculate total delivery time (delivered - created)
      const totalDeliveryTime = order.deliveredAt && order.createdAt
        ? (new Date(order.deliveredAt).getTime() - new Date(order.createdAt).getTime()) / (1000 * 60)
        : 0;

      cell.totalWaitingTime += waitingTime;
      cell.totalDeliveryTime += totalDeliveryTime;
    }

    // Process current period
    for (const order of currentFortErieOrders) {
      const lat = Number(order.customerLatitude);
      const lon = Number(order.customerLongitude);
      const cellId = getGridCellId(lat, lon);

      if (!currentGridCells.has(cellId)) {
        currentGridCells.set(cellId, { orders: [], totalWaitingTime: 0, totalDeliveryTime: 0 });
      }

      const cell = currentGridCells.get(cellId)!;
      cell.orders.push(order);

      const waitingTime = order.readyAt && order.createdAt
        ? (new Date(order.readyAt).getTime() - new Date(order.createdAt).getTime()) / (1000 * 60)
        : 0;

      const totalDeliveryTime = order.deliveredAt && order.createdAt
        ? (new Date(order.deliveredAt).getTime() - new Date(order.createdAt).getTime()) / (1000 * 60)
        : 0;

      cell.totalWaitingTime += waitingTime;
      cell.totalDeliveryTime += totalDeliveryTime;
    }

    // Analyze demand changes across all grid cells
    const allCellIds = new Set([...previousGridCells.keys(), ...currentGridCells.keys()]);
    const zones: DemandZone[] = [];

    for (const cellId of allCellIds) {
      const prevData = previousGridCells.get(cellId);
      const currData = currentGridCells.get(cellId);

      const previousOrderCount = prevData?.orders.length || 0;
      const currentOrderCount = currData?.orders.length || 0;

      // Skip cells with no activity in either period
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

      // Classify zone based on growth percentage
      let classification: "Strong Growth" | "Moderate Growth" | "Stable" | "Weakening" | "Rapid Decline";
      if (growthPercentage >= 50) {
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

      const cellCenter = getGridCellCenter(cellId);

      // Collect all order locations in this cell
      const orderLocations = [
        ...(prevData?.orders || []),
        ...(currData?.orders || []),
      ].map((o: any) => ({
        lat: Number(o.customerLatitude),
        lon: Number(o.customerLongitude),
        orderId: o.id,
      }));

      zones.push({
        zoneId: cellId,
        latitude: cellCenter.lat,
        longitude: cellCenter.lon,
        previousPeriodOrders: previousOrderCount,
        currentPeriodOrders: currentOrderCount,
        orderDensityChange,
        growthPercentage,
        classification,
        avgWaitingTimePrevious,
        avgWaitingTimeCurrent,
        waitingTimeTrend: avgWaitingTimeCurrent - avgWaitingTimePrevious,
        avgDeliveryTimePrevious,
        avgDeliveryTimeCurrent,
        deliveryTimeTrend: avgDeliveryTimeCurrent - avgDeliveryTimePrevious,
        orderLocations,
      });
    }

    console.log(`[analyzeDemandChange] Total zones analyzed: ${zones.length}`);

    // Generate spatial interpretation
    const strongGrowthZones = zones.filter(z => z.classification === "Strong Growth").length;
    const declineZones = zones.filter(z => z.classification === "Rapid Decline").length;
    const stableZones = zones.filter(z => z.classification === "Stable").length;

    let spatialInterpretation = `Demand analysis comparing ${previousStartDate.toLocaleDateString()} to ${currentStartDate.toLocaleDateString()}: `;
    if (strongGrowthZones > 0) {
      spatialInterpretation += `${strongGrowthZones} zone(s) show strong demand growth. `;
    }
    if (declineZones > 0) {
      spatialInterpretation += `${declineZones} zone(s) show rapid decline. `;
    }
    if (stableZones > 0) {
      spatialInterpretation += `${stableZones} zone(s) remain stable. `;
    }
    // Spatial interpretation complete

    return {
      zones,
      periodComparison: {
        previousPeriod: { startDate: previousStartDate, endDate: previousEndDate, totalOrders: previousFortErieOrders.length },
        currentPeriod: { startDate: currentStartDate, endDate: currentEndDate, totalOrders: currentFortErieOrders.length },
      },
      spatialInterpretation,
      success: true,
      fortErieBoundary: { center: { lat: 42.8812, lon: -78.9485 }, radius: 5 },
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
      fortErieBoundary: { center: { lat: 42.8812, lon: -78.9485 }, radius: 5 },
    };
  }
}
