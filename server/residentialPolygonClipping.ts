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
 * Fallback: Specific residential area boundary
 * This is a residential polygon provided by the user for heatmap analysis
 */
function getResidentialAreaBoundary(): ResidentialPolygon {
  // Coordinates from the provided GeoJSON residential polygon
  const coordinates: Array<[number, number]> = [
    [-78.9783667, 42.8812164],
    [-78.9818933, 42.9547033],
    [-78.9767637, 42.9566977],
    [-78.9658634, 42.9497756],
    [-78.9504748, 42.9482503],
    [-78.9411775, 42.9494236],
    [-78.935567, 42.948485],
    [-78.9269109, 42.9428527],
    [-78.9187357, 42.9369852],
    [-78.9163312, 42.9348728],
    [-78.9148885, 42.9315867],
    [-78.9128046, 42.9245444],
    [-78.9115222, 42.9191447],
    [-78.9084766, 42.913275],
    [-78.9091178, 42.9092832],
    [-78.9086369, 42.9076395],
    [-78.909759, 42.9061131],
    [-78.914087, 42.9042345],
    [-78.9168121, 42.9016512],
    [-78.9193769, 42.8977762],
    [-78.921621, 42.8940183],
    [-78.9222622, 42.8914346],
    [-78.9229034, 42.8897904],
    [-78.9269109, 42.8882636],
    [-78.9273918, 42.887324],
    [-78.9286742, 42.886267],
    [-78.9309184, 42.8855623],
    [-78.931239, 42.8850925],
    [-78.9354067, 42.8838005],
    [-78.9390936, 42.8833306],
    [-78.9443834, 42.8832132],
    [-78.9488718, 42.8818037],
    [-78.9523984, 42.8803941],
    [-78.9597721, 42.8835655],
    [-78.9637795, 42.8840354],
    [-78.9684282, 42.8833306],
    [-78.9711533, 42.8809814],
    [-78.9713136, 42.8801592],
    [-78.9713136, 42.8798068],
    [-78.9738783, 42.879337],
    [-78.9758019, 42.8801592],
    [-78.9778858, 42.880864],
    [-78.9783667, 42.8812164],
  ];

  return {
    id: 'residential-area-boundary',
    type: 'residential',
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

    // Fallback: Use residential area boundary
    console.log('[ResidentialPolygonClipping] Using residential area boundary');
    const residentialAreaBoundary = getResidentialAreaBoundary();
    const fallbackPolygons = [residentialAreaBoundary];
    residentialPolygonsCache = fallbackPolygons;
    cacheTimestamp = now;
    return fallbackPolygons;
  } catch (error) {
    console.error('[ResidentialPolygonClipping] Error in fetchResidentialPolygons:', error);

    // Return residential area boundary even on error
    const residentialAreaBoundary = getResidentialAreaBoundary();
    const fallbackPolygons = [residentialAreaBoundary];
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
    // Default to residential area
    return {
      minLat: 42.88,
      maxLat: 42.96,
      minLng: -78.99,
      maxLng: -78.91,
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

/**
 * Get the fallback residential area boundary
 */
export function getFallbackBoundary(): ResidentialPolygon {
  return getResidentialAreaBoundary();
}
