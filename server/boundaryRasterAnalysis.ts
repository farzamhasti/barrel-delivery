import { getDb } from "./db";

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
  const cells = generateRasterGrid(); // Uses default 1000x1000m cell size
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
