import { getDb } from "./db";

/**
 * Fort Erie boundary polygon (simplified coordinates)
 * This defines the approximate boundary of Fort Erie, Ontario
 * Coordinates are in [longitude, latitude] format
 */
const FORT_ERIE_BOUNDARY: [number, number][] = [
  [-79.0200, 42.8800], // NE corner
  [-79.0300, 42.8700], // SE corner
  [-79.0400, 42.8600], // S corner
  [-79.0500, 42.8500], // SW corner
  [-79.0600, 42.8400], // W corner
  [-79.0700, 42.8500], // NW corner
  [-79.0600, 42.8700], // N corner
  [-79.0200, 42.8800], // back to start
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
 * Generate 30x30m raster grid cells clipped to Fort Erie boundary
 */
function generateRasterGrid(
  cellSizeMeters: number = 30
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
 * Calculate relative demand for each grid cell
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

  // For now, return mock data since we don't have actual order data
  // In production, this would query the database
  const cells = generateRasterGrid(30);
  const totalOrders = 0;
  const avgDeliveryTime = 0;
  const avgWaitingTime = 0;

  // Assign random relative demand to cells for visualization
  const cellsWithDemand = cells.map((cell) => {
    const relativeDemand = Math.random() * 25; // 0-25% for visualization

    // Classify based on relative demand thresholds
    let classification = "Underperforming";
    let color = "#cccccc"; // Gray

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
      orderCount: Math.floor(relativeDemand),
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
}

export { calculateRelativeDemand, generateRasterGrid, isPointInPolygon, FORT_ERIE_BOUNDARY };
