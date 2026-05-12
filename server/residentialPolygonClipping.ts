/**
 * Represents a residential polygon from OpenStreetMap
 */
export interface ResidentialPolygon {
  id: string;
  coordinates: Array<[number, number]>; // [lng, lat] pairs
  type: 'residential' | 'building';
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
 * Fallback residential polygons for Fort Erie
 * These are approximate boundaries of residential areas in Fort Erie
 * Fort Erie coordinates: approximately 43.0°N, 79.05°W
 */
function getFortErieFallbackPolygons(): ResidentialPolygon[] {
  return [
    {
      id: 'fort-erie-downtown-residential',
      type: 'residential',
      // Downtown Fort Erie residential area (around Queen St / Garrison Rd)
      coordinates: [
        [-79.0620, 43.0050],
        [-79.0450, 43.0050],
        [-79.0450, 42.9900],
        [-79.0620, 42.9900],
        [-79.0620, 43.0050],
      ],
    },
    {
      id: 'fort-erie-central-residential',
      type: 'residential',
      // Central Fort Erie residential area (around Dominion Rd)
      coordinates: [
        [-79.0750, 43.0150],
        [-79.0500, 43.0150],
        [-79.0500, 42.9950],
        [-79.0750, 42.9950],
        [-79.0750, 43.0150],
      ],
    },
    {
      id: 'fort-erie-north-residential',
      type: 'residential',
      // North Fort Erie residential area (around Ridgeway Rd)
      coordinates: [
        [-79.0800, 43.0300],
        [-79.0500, 43.0300],
        [-79.0500, 43.0100],
        [-79.0800, 43.0100],
        [-79.0800, 43.0300],
      ],
    },
  ];
}

/**
 * Fetch residential polygons from OpenStreetMap using Overpass API
 * Falls back to predefined polygons if API is unavailable
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

    // Fallback: Use pre-defined residential polygons for Fort Erie
    console.log('[ResidentialPolygonClipping] Using fallback residential polygons for Fort Erie');
    const fallbackPolygons = getFortErieFallbackPolygons();
    residentialPolygonsCache = fallbackPolygons;
    cacheTimestamp = now;
    return fallbackPolygons;
  } catch (error) {
    console.error('[ResidentialPolygonClipping] Error in fetchResidentialPolygons:', error);

    // Return fallback polygons even on error
    const fallbackPolygons = getFortErieFallbackPolygons();
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
      minLat: 42.98,
      maxLat: 43.04,
      minLng: -79.09,
      maxLng: -79.03,
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
