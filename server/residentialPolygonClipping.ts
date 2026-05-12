/**
 * Represents a residential polygon from OpenStreetMap
 */
export interface ResidentialPolygon {
  id: string;
  coordinates: Array<[number, number]>; // [lng, lat] pairs
  type: 'residential' | 'building' | 'boundary';
  area?: number;
}

/**
 * Represents a clipped heatmap cell
 */
export interface ClippedHeatmapCell {
  lat: number;
  lng: number;
  intensity: number;
  clipped: boolean; // true if cell is within residential polygon
}

/**
 * Cache for residential polygons to avoid repeated API calls
 */
let residentialPolygonsCache: ResidentialPolygon[] | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Fallback: Actual Fort Erie boundary from OpenStreetMap
 * This is the administrative boundary of Fort Erie, Ontario
 */
function getFortErieBoundary(): ResidentialPolygon {
  // Reconstruct the complete boundary from the OSM relation geometry
  const coordinates: Array<[number, number]> = [
    // Way 109963733
    [-79.1153678, 42.9330481],
    [-79.1153387, 42.9430729],
    [-79.1153172, 42.9594382],
    // Way 171970621 (continuation)
    [-79.1151311, 42.9632393],
    [-79.1201797, 42.9631985],
    [-79.1210917, 42.9631357],
    [-79.1224750, 42.9628501],
    [-79.1225202, 42.9651286],
    [-79.1225511, 42.9674675],
    [-79.1076551, 42.9672683],
    [-79.0919924, 42.9672379],
    [-79.0295079, 42.9680751],
    [-79.0276196, 42.9714036],
    [-79.0286989, 42.9814542],
    [-79.0116642, 42.9852886],
    // Way 368266192
    [-78.9617555, 42.9578503],
    [-78.9750166, 42.9687792],
    [-78.9933380, 42.9770354],
    [-79.0116642, 42.9852886],
    // Way 368261538
    [-78.9059488, 42.9046959],
    [-78.9060611, 42.9237539],
    [-78.9094861, 42.9336997],
    [-78.9192258, 42.9470770],
    [-78.9223535, 42.9491456],
    // Way 1022755274
    [-78.9327428, 42.9560158],
    // Way 368266192 (eastern part)
    [-78.9327428, 42.9560158],
    [-78.9617555, 42.9578503],
    [-78.9750166, 42.9687792],
    [-78.9933380, 42.9770354],
    [-79.0116642, 42.9852886],
    // Way 973610330 (southern boundary)
    [-79.1165947, 42.8566572],
    [-79.1047285, 42.8427075],
    [-79.0984049, 42.8319981],
    [-79.0822946, 42.8409411],
    [-79.0856070, 42.8530839],
    [-79.0749170, 42.8579403],
    [-79.0565483, 42.8555121],
    [-79.0332110, 42.8701901],
    [-79.0058085, 42.8643414],
    [-78.9872892, 42.8738314],
    [-78.9648553, 42.8773622],
    [-78.9485924, 42.8794807],
    [-78.9305447, 42.8835129],
    [-78.9213092, 42.8906181],
    [-78.9129588, 42.9034166],
    [-78.9059488, 42.9046959],
    // Way 109963734
    [-79.1165947, 42.8566572],
    [-79.1162453, 42.8596025],
    [-79.1162521, 42.8617890],
    // Way 66882210
    [-79.1162521, 42.8617890],
    [-79.1162493, 42.8623565],
    [-79.1162416, 42.8639234],
    [-79.1162404, 42.8641664],
    [-79.1162179, 42.8687138],
    [-79.1161628, 42.8739802],
    // Way 66888479
    [-79.1161628, 42.8739802],
    [-79.1161480, 42.8750630],
    // Way 67923569
    [-79.1161480, 42.8750630],
    [-79.1161066, 42.8780942],
    // Way 67947516
    [-79.1161066, 42.8780942],
    [-79.1160845, 42.8797146],
    // Way 67958622
    [-79.1160845, 42.8797146],
    [-79.1160466, 42.8824873],
    // Way 67931788
    [-79.1160466, 42.8824873],
    [-79.1160332, 42.8834693],
    // Way 67928192
    [-79.1160332, 42.8834693],
    [-79.1160228, 42.8840147],
    [-79.1160218, 42.8840660],
    [-79.1160178, 42.8842758],
    [-79.1160055, 42.8849146],
    [-79.1160053, 42.8849276],
    // Way 67951404
    [-79.1160053, 42.8849276],
    [-79.1159855, 42.8859762],
    [-79.1159243, 42.8891584],
    // Way 67941641
    [-79.1159243, 42.8891584],
    [-79.1158705, 42.8919710],
    [-79.1158673, 42.8921383],
    // Way 67956350
    [-79.1158673, 42.8921383],
    [-79.1158641, 42.8922423],
    [-79.1158552, 42.8925368],
    // Way 67946509
    [-79.1158552, 42.8925368],
    [-79.1157104, 42.8972891],
    // Way 67931000
    [-79.1157104, 42.8972891],
    [-79.1156165, 42.9003717],
    // Way 27033903
    [-79.1156165, 42.9003717],
    [-79.1156269, 42.9015594],
    [-79.1155903, 42.9094102],
    // Way 67955299
    [-79.1155903, 42.9094102],
    [-79.1155889, 42.9101136],
    // Way 27033979
    [-79.1155889, 42.9101136],
    [-79.1155624, 42.9111406],
    [-79.1155264, 42.9161937],
    // Way 67924456
    [-79.1155264, 42.9161937],
    [-79.1155266, 42.9165899],
    // Way 67923034
    [-79.1155266, 42.9165899],
    [-79.1155101, 42.9171299],
    // Way 67925787
    [-79.1155101, 42.9171299],
    [-79.1154929, 42.9184984],
    [-79.1155288, 42.9197326],
    [-79.1154879, 42.9210737],
    [-79.1155156, 42.9221727],
    [-79.1155117, 42.9230077],
    // Way 67944396
    [-79.1155117, 42.9230077],
    [-79.1155024, 42.9250180],
    [-79.1154584, 42.9256567],
    // Way 67953363
    [-79.1154584, 42.9256567],
    [-79.1154562, 42.9257287],
    // Way 67925538
    [-79.1154562, 42.9257287],
    [-79.1154311, 42.9261515],
    [-79.1154697, 42.9272957],
    [-79.1154179, 42.9285916],
    // Way 67926592
    [-79.1154179, 42.9285916],
    [-79.1153678, 42.9330481],
    // Close the polygon
    [-79.1153678, 42.9330481],
  ];

  return {
    id: 'fort-erie-boundary',
    type: 'boundary',
    coordinates: coordinates,
  };
}

/**
 * Fetch residential polygons from OpenStreetMap using Overpass API
 * Falls back to Fort Erie boundary if API is unavailable
 */
export async function fetchResidentialPolygons(
  bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number }
): Promise<ResidentialPolygon[]> {
  // Check cache first
  const now = Date.now();
  if (residentialPolygonsCache && now - cacheTimestamp < CACHE_DURATION) {
    console.log('[ResidentialPolygonClipping] Using cached residential polygons');
    return residentialPolygonsCache;
  }

  try {
    // Try to fetch from Overpass API
    const query = `[out:json][timeout:60];
(
way["landuse"="residential"](${bounds.minLat},${bounds.minLng},${bounds.maxLat},${bounds.maxLng});
relation["landuse"="residential"](${bounds.minLat},${bounds.minLng},${bounds.maxLat},${bounds.maxLng});
);
out geom;`;

    try {
      const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: query,
        headers: {
          'Content-Type': 'text/plain',
        },
      });

      if (response.ok) {
        const data = await response.json();

        if (data.elements && data.elements.length > 0) {
          // Convert OSM elements to residential polygons
          const polygons: ResidentialPolygon[] = [];

          for (const element of data.elements) {
            if (element.type === 'way' && element.geometry) {
              const coordinates = element.geometry.map((point: any) => [point.lon, point.lat]);

              if (
                coordinates.length > 2 &&
                coordinates[0][0] === coordinates[coordinates.length - 1][0] &&
                coordinates[0][1] === coordinates[coordinates.length - 1][1]
              ) {
                polygons.push({
                  id: `way-${element.id}`,
                  coordinates,
                  type: element.tags?.building ? 'building' : 'residential',
                });
              }
            } else if (element.type === 'relation' && element.members) {
              const outerWays = element.members.filter((m: any) => m.role === 'outer' || m.role === '');

              for (const way of outerWays) {
                if (way.geometry) {
                  const coordinates = way.geometry.map((point: any) => [point.lon, point.lat]);

                  if (coordinates.length > 2) {
                    polygons.push({
                      id: `relation-${element.id}-${way.ref}`,
                      coordinates,
                      type: 'residential',
                    });
                  }
                }
              }
            }
          }

          if (polygons.length > 0) {
            residentialPolygonsCache = polygons;
            cacheTimestamp = now;
            console.log(`[ResidentialPolygonClipping] Fetched ${polygons.length} residential polygons from Overpass API`);
            return polygons;
          }
        }
      }
    } catch (apiError) {
      console.warn('[ResidentialPolygonClipping] Overpass API fetch failed, using fallback:', apiError);
    }

    // Fallback: Use Fort Erie administrative boundary
    console.log('[ResidentialPolygonClipping] Using Fort Erie administrative boundary');
    const fortErieBoundary = getFortErieBoundary();
    const fallbackPolygons = [fortErieBoundary];
    residentialPolygonsCache = fallbackPolygons;
    cacheTimestamp = now;
    return fallbackPolygons;
  } catch (error) {
    console.error('[ResidentialPolygonClipping] Error in fetchResidentialPolygons:', error);

    // Return Fort Erie boundary even on error
    const fortErieBoundary = getFortErieBoundary();
    const fallbackPolygons = [fortErieBoundary];
    residentialPolygonsCache = fallbackPolygons;
    cacheTimestamp = now;
    return fallbackPolygons;
  }
}

/**
 * Point-in-polygon test using ray casting algorithm
 */
function isPointInPolygon(point: [number, number], polygon: [number, number][]): boolean {
  const [x, y] = point;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];

    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }

  return inside;
}

/**
 * Check if a heatmap cell (point) is within any residential polygon
 */
export function isCellInResidentialArea(
  cellLat: number,
  cellLng: number,
  residentialPolygons: ResidentialPolygon[]
): boolean {
  const point: [number, number] = [cellLng, cellLat];

  for (const polygon of residentialPolygons) {
    if (isPointInPolygon(point, polygon.coordinates)) {
      return true;
    }
  }

  return false;
}

/**
 * Clip heatmap cells to residential polygons
 * Returns only cells that are within residential areas
 */
export function clipHeatmapToResidentialAreas(
  heatmapCells: Array<{ lat: number; lng: number; intensity: number }>,
  residentialPolygons: ResidentialPolygon[]
): ClippedHeatmapCell[] {
  if (residentialPolygons.length === 0) {
    console.warn('[ResidentialPolygonClipping] No residential polygons available for clipping');
    return heatmapCells.map((cell) => ({
      ...cell,
      clipped: false,
    }));
  }

  return heatmapCells
    .filter((cell) => isCellInResidentialArea(cell.lat, cell.lng, residentialPolygons))
    .map((cell) => ({
      ...cell,
      clipped: true,
    }));
}

/**
 * Calculate bounding box from residential polygons
 */
export function calculateBoundingBox(
  residentialPolygons: ResidentialPolygon[]
): { minLat: number; maxLat: number; minLng: number; maxLng: number } {
  if (residentialPolygons.length === 0) {
    // Default to Fort Erie area
    return {
      minLat: 42.83,
      maxLat: 42.99,
      minLng: -79.13,
      maxLng: -78.90,
    };
  }

  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;

  for (const polygon of residentialPolygons) {
    for (const [lng, lat] of polygon.coordinates) {
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
      minLng = Math.min(minLng, lng);
      maxLng = Math.max(maxLng, lng);
    }
  }

  return { minLat, maxLat, minLng, maxLng };
}

/**
 * Clear the polygon cache (useful for testing or manual refresh)
 */
export function clearPolygonCache(): void {
  residentialPolygonsCache = null;
  cacheTimestamp = 0;
  console.log('[ResidentialPolygonClipping] Polygon cache cleared');
}
