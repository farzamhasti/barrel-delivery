/**
 * Server-side utility to fetch residential area boundaries from OpenStreetMap
 * Uses Overpass API to get the boundary polygon for Fort Erie residential areas
 * Falls back to hardcoded boundary if API fails
 */

let cachedBoundary: any = null;

/**
 * Hardcoded fallback boundary for Fort Erie residential areas
 * This is used when the Overpass API is unavailable
 */
const FALLBACK_BOUNDARY = {
  type: 'Feature',
  properties: { name: 'Fort Erie Residential Area (Fallback)' },
  geometry: {
    type: 'Polygon',
    coordinates: [
      [
        [-78.88, 42.88],
        [-78.88, 42.92],
        [-79.00, 42.92],
        [-79.00, 42.88],
        [-78.88, 42.88],
      ],
    ],
  },
};

/**
 * Calculate approximate area of a polygon using Shoelace formula
 */
function calculatePolygonArea(geometry: any[]): number {
  if (geometry.length < 3) return 0;

  let area = 0;
  for (let i = 0; i < geometry.length - 1; i++) {
    const lat1 = geometry[i].lat;
    const lon1 = geometry[i].lon;
    const lat2 = geometry[i + 1].lat;
    const lon2 = geometry[i + 1].lon;

    area += lon1 * lat2 - lon2 * lat1;
  }

  return Math.abs(area) / 2;
}

/**
 * Fetch the residential area boundary polygon for Fort Erie
 * Uses Overpass API to query OSM data
 * Falls back to hardcoded boundary if API fails
 */
export async function getResidentialBoundary(): Promise<any> {
  // Return cached boundary if available
  if (cachedBoundary) {
    console.log('[residentialBoundary] Returning cached boundary');
    return cachedBoundary;
  }

  try {
    // Query Overpass API for residential areas in Fort Erie
    // Fort Erie approximate bounds: 42.88°N to 42.92°N, -79.00°W to -78.88°W
    const query = `[out:json];
(
  way["landuse"="residential"](42.88,-79.00,42.92,-78.88);
  relation["landuse"="residential"](42.88,-79.00,42.92,-78.88);
);
out geom;`;

    console.log('[residentialBoundary] Fetching from Overpass API...');
    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: query,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    });

    if (!response.ok) {
      console.error('[residentialBoundary] API error:', response.status, response.statusText);
      console.log('[residentialBoundary] Using fallback boundary');
      cachedBoundary = FALLBACK_BOUNDARY;
      return cachedBoundary;
    }

    let data;
    try {
      data = await response.json();
    } catch (parseError) {
      console.error('[residentialBoundary] JSON parse error:', parseError);
      console.log('[residentialBoundary] Using fallback boundary');
      cachedBoundary = FALLBACK_BOUNDARY;
      return cachedBoundary;
    }

    // Convert OSM data to GeoJSON polygon
    if (!data.elements || data.elements.length === 0) {
      console.warn('[residentialBoundary] No residential areas found in Fort Erie');
      console.log('[residentialBoundary] Using fallback boundary');
      cachedBoundary = FALLBACK_BOUNDARY;
      return cachedBoundary;
    }

    console.log(`[residentialBoundary] Found ${data.elements.length} elements`);

    // Find the largest polygon (main residential area)
    let largestPolygon = null;
    let largestArea = 0;

    for (const element of data.elements) {
      if ((element.type === 'way' || element.type === 'relation') && element.geometry) {
        const area = calculatePolygonArea(element.geometry);
        if (area > largestArea) {
          largestArea = area;
          largestPolygon = element;
        }
      }
    }

    if (!largestPolygon || !largestPolygon.geometry) {
      console.warn('[residentialBoundary] No valid residential polygon found in OSM data');
      console.log('[residentialBoundary] Using fallback boundary');
      cachedBoundary = FALLBACK_BOUNDARY;
      return cachedBoundary;
    }

    console.log(`[residentialBoundary] Using polygon with ${largestPolygon.geometry.length} points`);

    // Convert geometry to GeoJSON coordinates
    const coordinates = largestPolygon.geometry
      .map((point: any) => {
        if (typeof point.lat === 'number' && typeof point.lon === 'number') {
          return [point.lon, point.lat];
        }
        return null;
      })
      .filter((c: any) => c !== null);

    if (coordinates.length < 3) {
      console.warn('[residentialBoundary] Not enough valid coordinates in polygon');
      console.log('[residentialBoundary] Using fallback boundary');
      cachedBoundary = FALLBACK_BOUNDARY;
      return cachedBoundary;
    }

    // Ensure polygon is closed
    if (
      coordinates.length > 0 &&
      (coordinates[0][0] !== coordinates[coordinates.length - 1][0] ||
        coordinates[0][1] !== coordinates[coordinates.length - 1][1])
    ) {
      coordinates.push(coordinates[0]);
    }

    const boundary = {
      type: 'Feature',
      properties: { name: 'Residential Area (from OSM)' },
      geometry: {
        type: 'Polygon',
        coordinates: [coordinates],
      },
    };

    cachedBoundary = boundary;
    console.log('[residentialBoundary] Successfully fetched and cached boundary from OSM');
    return boundary;
  } catch (error) {
    console.error('[residentialBoundary] Error:', error);
    console.log('[residentialBoundary] Using fallback boundary');
    cachedBoundary = FALLBACK_BOUNDARY;
    return cachedBoundary;
  }
}
