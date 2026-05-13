import * as h3 from "h3-js";
import { filterZonesByBoundary } from './geographicBoundaryFilter';
import { getOrdersWithCoordinates } from './geomarketing';

export interface SpatialZone {
  hexId: string;
  latitude: number;
  longitude: number;
  previousDensity: number;
  currentDensity: number;
  densityChange: number;
  growthPercentage: number;
  classification: "Strong Growth" | "Moderate Growth" | "Stable" | "Decline" | "Rapid Shift";
  hotspotMovementDirection?: string;
  clusterStatus: "new" | "growing" | "stable" | "shrinking" | "disappearing";
  orderCount: number;
  orderLocations: Array<{ lat: number; lon: number; orderId: string }>;
}

export interface SpatialAnalysisResult {
  zones: SpatialZone[];
  temporalSnapshots: Array<{
    period: string;
    density: number;
    hotspotCount: number;
  }>;
  spatialInterpretation: string;
  success: boolean;
}

/**
 * Analyze geographic demand shifts over time
 * Focuses ONLY on spatial patterns, not customer behavior or business metrics
 */
export async function analyzeSpatialDemandShift(
  startDate: Date,
  endDate: Date,
  areaFilter?: string
): Promise<SpatialAnalysisResult> {
  try {
    // Get all completed orders within date range with geocoding
    let ordersData = await getOrdersWithCoordinates(startDate, endDate);
    
    // Apply area filter if specified
    if (areaFilter && areaFilter !== "All") {
      ordersData = ordersData.filter((o: any) => o.area === areaFilter);
    }
    
    // Log for debugging
    console.log(`[analyzeSpatialDemandShift] Total orders fetched: ${ordersData.length}`);
    const ordersWithCoords = ordersData.filter((o: any) => o.customerLatitude && o.customerLongitude);
    console.log(`[analyzeSpatialDemandShift] Orders with coordinates: ${ordersWithCoords.length}`);

    if (ordersWithCoords.length === 0) {
      return {
        zones: [],
        temporalSnapshots: [],
        spatialInterpretation: "No delivery data available with valid coordinates for the selected period.",
        success: false,
      };
    }

    // Split data into two equal time periods for comparison
    const midpoint = new Date((startDate.getTime() + endDate.getTime()) / 2);
    const previousPeriodOrders = ordersWithCoords.filter(
      (o: any) => o.createdAt.getTime() < midpoint.getTime()
    );
    const currentPeriodOrders = ordersWithCoords.filter(
      (o: any) => o.createdAt.getTime() >= midpoint.getTime()
    );
    
    console.log(`[analyzeSpatialDemandShift] Previous period orders: ${previousPeriodOrders.length}, Current period orders: ${currentPeriodOrders.length}`);

    // Aggregate orders into H3 hexagons (resolution 5 for ~1km cells)
    const hexResolution = 5;
    const previousHexagons = new Map<string, { orders: any[]; density: number }>();
    const currentHexagons = new Map<string, { orders: any[]; density: number }>();

    // Process previous period
    for (const order of previousPeriodOrders) {
      if (order.customerLatitude && order.customerLongitude) {
        const lat = Number(order.customerLatitude);
        const lon = Number(order.customerLongitude);
        const hexId = h3.latLngToCell(lat, lon, hexResolution);

        if (!previousHexagons.has(hexId)) {
          previousHexagons.set(hexId, { orders: [], density: 0 });
        }
        const hex = previousHexagons.get(hexId)!;
        hex.orders.push(order);
        hex.density = hex.orders.length;
      }
    }

    // Process current period
    for (const order of currentPeriodOrders) {
      if (order.customerLatitude && order.customerLongitude) {
        const lat = Number(order.customerLatitude);
        const lon = Number(order.customerLongitude);
        const hexId = h3.latLngToCell(lat, lon, hexResolution);

        if (!currentHexagons.has(hexId)) {
          currentHexagons.set(hexId, { orders: [], density: 0 });
        }
        const hex = currentHexagons.get(hexId)!;
        hex.orders.push(order);
        hex.density = hex.orders.length;
      }
    }

    // Analyze spatial changes
    const allHexIds = new Set([...previousHexagons.keys(), ...currentHexagons.keys()]);
    const zones: SpatialZone[] = [];

    for (const hexId of allHexIds) {
      const prevData = previousHexagons.get(hexId);
      const currData = currentHexagons.get(hexId);

      const previousDensity = prevData?.density || 0;
      const currentDensity = currData?.density || 0;
      const densityChange = currentDensity - previousDensity;
      const growthPercentage =
        previousDensity > 0 ? ((currentDensity - previousDensity) / previousDensity) * 100 : 0;

      // Classify zone based on spatial changes
      let classification: SpatialZone["classification"];
      let clusterStatus: SpatialZone["clusterStatus"];

      if (previousDensity === 0 && currentDensity > 0) {
        // New cluster formation
        classification = "Strong Growth";
        clusterStatus = "new";
      } else if (growthPercentage > 50) {
        classification = "Strong Growth";
        clusterStatus = "growing";
      } else if (growthPercentage > 10) {
        classification = "Moderate Growth";
        clusterStatus = "growing";
      } else if (growthPercentage >= -10) {
        classification = "Stable";
        clusterStatus = "stable";
      } else if (growthPercentage > -50) {
        classification = "Decline";
        clusterStatus = "shrinking";
      } else {
        classification = "Rapid Shift";
        clusterStatus = "disappearing";
      }

      // Get center coordinates of hexagon
      const [lat, lon] = h3.cellToLatLng(hexId);

      // Collect order locations within this zone
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
        previousDensity,
        currentDensity,
        densityChange,
        growthPercentage,
        classification,
        clusterStatus,
        orderCount: orderLocations.length,
        orderLocations,
      });
    }

    // Sort by density change (most significant shifts first)
    zones.sort((a, b) => Math.abs(b.densityChange) - Math.abs(a.densityChange));

    // Generate temporal snapshots (weekly breakdown)
    const temporalSnapshots = generateTemporalSnapshots(ordersWithCoords, startDate, endDate);

    // Filter zones by Fort Erie boundary
    const boundaryFilteredZones = filterZonesByBoundary(zones);

    // Generate AI-based spatial interpretation
    const spatialInterpretation = generateSpatialInterpretation(boundaryFilteredZones, startDate, endDate);

    return {
      zones: boundaryFilteredZones.slice(0, 10), // Return top 10 zones within boundary
      temporalSnapshots,
      spatialInterpretation,
      success: true,
    };
  } catch (error) {
    console.error("Error analyzing spatial demand shift:", error);
    return {
      zones: [],
      temporalSnapshots: [],
      spatialInterpretation: "Error analyzing spatial demand patterns.",
      success: false,
    };
  }
}

/**
 * Generate weekly temporal snapshots of spatial density
 */
function generateTemporalSnapshots(
  orders: any[],
  startDate: Date,
  endDate: Date
): Array<{ period: string; density: number; hotspotCount: number }> {
  const snapshots: Array<{ period: string; density: number; hotspotCount: number }> = [];
  const weekMs = 7 * 24 * 60 * 60 * 1000;

  let currentWeekStart = new Date(startDate);

  while (currentWeekStart < endDate) {
    const weekEnd = new Date(currentWeekStart.getTime() + weekMs);
    const weekOrders = orders.filter(
      (o: any) => o.createdAt.getTime() >= currentWeekStart.getTime() && o.createdAt.getTime() < weekEnd.getTime()
    );

    // Calculate spatial density for this week
    const hexagons = new Set<string>();
    for (const order of weekOrders) {
      if (order.customerLatitude && order.customerLongitude) {
        const lat = Number(order.customerLatitude);
        const lon = Number(order.customerLongitude);
        const hexId = h3.latLngToCell(lat, lon, 5);
        hexagons.add(hexId);
      }
    }

    snapshots.push({
      period: `Week of ${currentWeekStart.toLocaleDateString()}`,
      density: weekOrders.length,
      hotspotCount: hexagons.size,
    });

    currentWeekStart = weekEnd;
  }

  return snapshots;
}

/**
 * Generate AI-based spatial interpretation of demand shifts
 */
function generateSpatialInterpretation(zones: SpatialZone[], startDate: Date, endDate: Date): string {
  if (zones.length === 0) {
    return "No significant spatial demand patterns detected in the selected period.";
  }

  const growingZones = zones.filter((z) => z.classification === "Strong Growth");
  const decliningZones = zones.filter((z) => z.classification === "Decline");
  const rapidShifts = zones.filter((z) => z.classification === "Rapid Shift");

  let interpretation = `Spatial demand analysis from ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}: `;

  if (growingZones.length > 0) {
    interpretation += `${growingZones.length} geographic areas show strong spatial growth with increasing delivery concentration. `;
  }

  if (decliningZones.length > 0) {
    interpretation += `${decliningZones.length} areas display spatial decline with decreasing demand density. `;
  }

  if (rapidShifts.length > 0) {
    interpretation += `${rapidShifts.length} zones show rapid geographic shifts in demand patterns. `;
  }

  const newClusters = zones.filter((z) => z.clusterStatus === "new");
  if (newClusters.length > 0) {
    interpretation += `${newClusters.length} new geographic hotspots have emerged. `;
  }

  const disappearingClusters = zones.filter((z) => z.clusterStatus === "disappearing");
  if (disappearingClusters.length > 0) {
    interpretation += `${disappearingClusters.length} previously active delivery zones are diminishing. `;
  }

  return interpretation;
}
