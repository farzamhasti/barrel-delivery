import { getDb } from "./db";
import { orders } from "../drizzle/schema";
import { and, gte, lt, isNotNull } from "drizzle-orm";

/**
 * Fort Erie boundary polygon (accurate GeoJSON coordinates)
 * This defines the precise boundary of Fort Erie, Ontario from official GIS data
 * Coordinates are in [longitude, latitude] format (GeoJSON standard)
 * Source: Official Fort Erie city boundary polygon (51 coordinate points)
 */
const FORT_ERIE_BOUNDARY: [number, number][] = [
  [-78.999892, 42.8765244],
  [-78.9996819, 42.8919223],
  [-79.0009428, 42.9036221],
  [-79.0055659, 42.9042378],
  [-79.0089282, 42.9287076],
  [-79.0097688, 42.9557824],
  [-79.0154427, 42.9667012],
  [-79.0166213, 42.9755716],
  [-79.0087238, 42.9741848],
  [-79.0005104, 42.9723357],
  [-78.9858657, 42.9690161],
  [-78.9793129, 42.9652306],
  [-78.9768987, 42.9569016],
  [-78.9718979, 42.9518533],
  [-78.9610341, 42.9490765],
  [-78.9513773, 42.947688],
  [-78.9482734, 42.9493289],
  [-78.9401686, 42.9497076],
  [-78.9341331, 42.9478143],
  [-78.9243039, 42.9407454],
  [-78.9175787, 42.9360744],
  [-78.913785, 42.9307718],
  [-78.9124055, 42.9286254],
  [-78.9125779, 42.9247111],
  [-78.9082669, 42.9149875],
  [-78.9084393, 42.9086727],
  [-78.9099913, 42.9061465],
  [-78.9155094, 42.9041256],
  [-78.9172338, 42.9013466],
  [-78.9203378, 42.896041],
  [-78.9218898, 42.8925037],
  [-78.9218898, 42.891114],
  [-78.9244764, 42.8889662],
  [-78.9256835, 42.8873237],
  [-78.9296496, 42.8849231],
  [-78.9339607, 42.884165],
  [-78.9365473, 42.8836595],
  [-78.9405135, 42.8829014],
  [-78.9486183, 42.8820169],
  [-78.95086, 42.8808797],
  [-78.9603443, 42.8837859],
  [-78.9681042, 42.8834068],
  [-78.9703459, 42.8807533],
  [-78.9701735, 42.8794897],
  [-78.9720703, 42.8788579],
  [-78.974657, 42.8793633],
  [-78.9781058, 42.8801215],
  [-78.9829342, 42.8791106],
  [-78.9907284, 42.879296],
  [-78.9955568, 42.8781587],
  [-78.999892, 42.8765244], // closed polygon
];

/**
 * Check if a point is inside the Fort Erie boundary polygon using ray casting algorithm
 */
function isPointInPolygon(lat: number, lon: number, polygon: readonly [number, number][]): boolean {
  let inside = false;
  let p1lon = polygon[0][0];
  let p1lat = polygon[0][1];

  for (let i = 1; i < polygon.length; i++) {
    const p2lon = polygon[i][0];
    const p2lat = polygon[i][1];

    if (lat > Math.min(p1lat, p2lat)) {
      if (lat <= Math.max(p1lat, p2lat)) {
        if (lon <= Math.max(p1lon, p2lon)) {
          if (p1lat !== p2lat) {
            const xinters = ((lat - p1lat) * (p2lon - p1lon)) / (p2lat - p1lat) + p1lon;
            if (p1lon === p2lon || lon <= xinters) {
              inside = !inside;
            }
          }
        }
      }
    }
    p1lon = p2lon;
    p1lat = p2lat;
  }

  return inside;
}

/**
 * Convert meters to degrees (approximate)
 * At Fort Erie latitude (~42.9°), 1 degree ≈ 74.7 km
 */
function metersToDegreesLon(meters: number, latitude: number): number {
  const latRad = (latitude * Math.PI) / 180;
  return meters / (111320 * Math.cos(latRad));
}

function metersToDegreesLat(meters: number): number {
  return meters / 111320;
}

/**
 * Generate 1000x1000m raster grid cells clipped to Fort Erie boundary
 */
function generateRasterGrid(
  cellSizeMeters: number = 1000
): Array<{ lat: number; lon: number; id: string }> {
  const latStep = metersToDegreesLat(cellSizeMeters);
  const lonStep = metersToDegreesLon(cellSizeMeters, 42.9);

  const cells: Array<{ lat: number; lon: number; id: string }> = [];
  let cellId = 0;

  // Get bounding box
  const minLon = Math.min(...FORT_ERIE_BOUNDARY.map((p) => p[0]));
  const maxLon = Math.max(...FORT_ERIE_BOUNDARY.map((p) => p[0]));
  const minLat = Math.min(...FORT_ERIE_BOUNDARY.map((p) => p[1]));
  const maxLat = Math.max(...FORT_ERIE_BOUNDARY.map((p) => p[1]));

  // Generate grid cells
  for (let lat = minLat; lat < maxLat; lat += latStep) {
    for (let lon = minLon; lon < maxLon; lon += lonStep) {
      // Check if cell center is inside boundary
      if (isPointInPolygon(lat + latStep / 2, lon + lonStep / 2, FORT_ERIE_BOUNDARY)) {
        cells.push({
          lat: lat + latStep / 2,
          lon: lon + lonStep / 2,
          id: `cell_${cellId++}`,
        });
      }
    }
  }

  return cells;
}

/**
 * Calculate relative demand for each grid cell based on actual delivery data
 */
async function calculateRelativeDemand(
  startDate: Date,
  endDate: Date
): Promise<{
  cells: Array<{
    id: string;
    lat: number;
    lon: number;
    orderCount: number;
    relativeDemand: number; // 0-100 percentage of total demand
    classification: string;
    color: string;
  }>;
  totalOrders: number;
  avgDeliveryTime: number;
  avgWaitingTime: number;
}> {
  const db = await getDb();

  // Generate grid cells for Fort Erie
  const cells = generateRasterGrid(); // Uses default 1000x1000m cell size

  try {
    if (!db) {
      throw new Error("Database not available");
    }

    // Query all orders within the date range that have valid coordinates
    const ordersResult = await db
      .select({
        customerLatitude: orders.customerLatitude,
        customerLongitude: orders.customerLongitude,
        pickedUpAt: orders.pickedUpAt,
        deliveredAt: orders.deliveredAt,
        createdAt: orders.createdAt,
        readyAt: orders.readyAt,
      })
      .from(orders)
      .where(
        and(
          isNotNull(orders.customerLatitude),
          isNotNull(orders.customerLongitude),
          isNotNull(orders.deliveredAt),
          gte(orders.createdAt, startDate),
          lt(orders.createdAt, endDate)
        )
      );

    const totalOrders = ordersResult.length;

    // Initialize cell demand counts
    const cellDemandMap = new Map<string, number>();
    let totalDeliveryTime = 0;
    let totalWaitTime = 0;
    let validDeliveryCount = 0;
    let validWaitCount = 0;

    // Aggregate orders into grid cells
    for (const order of ordersResult) {
      const lat = typeof order.customerLatitude === 'string' 
        ? parseFloat(order.customerLatitude) 
        : (order.customerLatitude as unknown as number);
      const lon = typeof order.customerLongitude === 'string' 
        ? parseFloat(order.customerLongitude) 
        : (order.customerLongitude as unknown as number);

      if (!isNaN(lat) && !isNaN(lon)) {
        // Find which cell this order belongs to
        for (const cell of cells) {
          // Check if order is within this cell's 1000m bounds
          const latDiff = Math.abs(lat - cell.lat);
          const lonDiff = Math.abs(lon - cell.lon);
          const latThreshold = metersToDegreesLat(500); // Half cell size
          const lonThreshold = metersToDegreesLon(500, cell.lat);

          if (latDiff <= latThreshold && lonDiff <= lonThreshold) {
            cellDemandMap.set(cell.id, (cellDemandMap.get(cell.id) || 0) + 1);
            break;
          }
        }
      }

      // Accumulate delivery and wait times
      if (order.pickedUpAt && order.deliveredAt) {
        const pickedUpTime = order.pickedUpAt instanceof Date ? order.pickedUpAt.getTime() : new Date(order.pickedUpAt).getTime();
        const deliveredTime = order.deliveredAt instanceof Date ? order.deliveredAt.getTime() : new Date(order.deliveredAt).getTime();
        const deliveryTime = (deliveredTime - pickedUpTime) / 1000;
        if (!isNaN(deliveryTime)) {
          totalDeliveryTime += deliveryTime;
          validDeliveryCount++;
        }
      }
      
      if (order.createdAt && order.readyAt) {
        const createdTime = order.createdAt instanceof Date ? order.createdAt.getTime() : new Date(order.createdAt).getTime();
        const readyTime = order.readyAt instanceof Date ? order.readyAt.getTime() : new Date(order.readyAt).getTime();
        const waitTime = (readyTime - createdTime) / 1000;
        if (!isNaN(waitTime)) {
          totalWaitTime += waitTime;
          validWaitCount++;
        }
      }
    }

    const avgDeliveryTime = validDeliveryCount > 0 ? totalDeliveryTime / validDeliveryCount : 0;
    const avgWaitingTime = validWaitCount > 0 ? totalWaitTime / validWaitCount : 0;

    // Calculate relative demand for each cell
    const cellsWithDemand = cells.map((cell) => {
      const orderCount = cellDemandMap.get(cell.id) || 0;
      const relativeDemand = totalOrders > 0 ? (orderCount / totalOrders) * 100 : 0;

      // Classify based on relative demand thresholds
      let classification = "Underperforming";
      let color = "#ADD8E6"; // Light Blue

      if (relativeDemand >= 20) {
        classification = "Very High";
        color = "#8b0000"; // Dark Red
      } else if (relativeDemand >= 15) {
        classification = "High";
        color = "#ff4500"; // Orange Red
      } else if (relativeDemand >= 10) {
        classification = "Average";
        color = "#ffff00"; // Yellow
      } else if (relativeDemand >= 5) {
        classification = "Weak";
        color = "#90ee90"; // Light Green
      }

      return {
        id: cell.id,
        lat: cell.lat,
        lon: cell.lon,
        orderCount,
        relativeDemand: Math.round(relativeDemand * 100) / 100,
        classification,
        color,
      };
    });

    return {
      cells: cellsWithDemand,
      totalOrders,
      avgDeliveryTime: Math.round(avgDeliveryTime),
      avgWaitingTime: Math.round(avgWaitingTime),
    };
  } catch (error) {
    console.error("[boundaryRasterAnalysis] Error calculating demand:", error);
    
    // Return empty cells on error
    const emptyCells = cells.map((cell) => ({
      id: cell.id,
      lat: cell.lat,
      lon: cell.lon,
      orderCount: 0,
      relativeDemand: 0,
      classification: "Underperforming",
      color: "#cccccc",
    }));

    return {
      cells: emptyCells,
      totalOrders: 0,
      avgDeliveryTime: 0,
      avgWaitingTime: 0,
    };
  }
}

export { calculateRelativeDemand, generateRasterGrid, isPointInPolygon, FORT_ERIE_BOUNDARY };
