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
 * Fetch residential polygons from OpenStreetMap using Overpass API
 * Queries for landuse=residential and building=residential areas
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
    // Construct Overpass API query for residential areas and buildings
    // bbox format: (south, west, north, east)
    const bbox = `${bounds.minLat},${bounds.minLng},${bounds.maxLat},${bounds.maxLng}`;
    
    const query = `
      [out:json][timeout:60];
      (
        way["landuse"="residential"](${bbox});
        relation["landuse"="residential"](${bbox});
        way["building"="residential"](${bbox});
        way["building"="apartments"](${bbox});
        way["building"="house"](${bbox});
        way["building"="detached"](${bbox});
      );
      out geom;
    `;

    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: query,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (!response.ok) {
      throw new Error(`Overpass API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.elements) {
      console.warn('[ResidentialPolygonClipping] No elements returned from Overpass API');
      return [];
    }

    // Convert OSM elements to residential polygons
    const polygons: ResidentialPolygon[] = [];

    for (const element of data.elements) {
      if (element.type === 'way' && element.geometry) {
        // Convert geometry to [lng, lat] format
        const coordinates = element.geometry.map((point: any) => [point.lon, point.lat]);
        
        // Only add closed polygons (first and last point are the same)
        if (coordinates.length > 2 && 
            coordinates[0][0] === coordinates[coordinates.length - 1][0] &&
            coordinates[0][1] === coordinates[coordinates.length - 1][1]) {
          
          polygons.push({
            id: `way-${element.id}`,
            coordinates,
            type: element.tags?.building ? 'building' : 'residential',
          });
        }
      } else if (element.type === 'relation' && element.members) {
        // Handle multipolygon relations
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

    // Cache the results
    residentialPolygonsCache = polygons;
    cacheTimestamp = now;

    console.log(`[ResidentialPolygonClipping] Fetched ${polygons.length} residential polygons from Overpass API`);
    return polygons;
  } catch (error) {
    console.error('[ResidentialPolygonClipping] Error fetching residential polygons:', error);
    
    // Return fallback empty array - component will handle gracefully
    return [];
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
    return heatmapCells.map(cell => ({
      ...cell,
      clipped: false,
    }));
  }

  return heatmapCells
    .filter(cell => isCellInResidentialArea(cell.lat, cell.lng, residentialPolygons))
    .map(cell => ({
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
      minLat: 42.9,
      maxLat: 43.1,
      minLng: -79.1,
      maxLng: -78.9,
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
