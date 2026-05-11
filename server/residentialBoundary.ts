/**
 * Server-side utility to fetch residential area boundaries from OpenStreetMap
 * Uses Overpass API to get the boundary polygon for Fort Erie residential areas
 */

let cachedBoundary: any = null;

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
 */
export async function getResidentialBoundary(): Promise<any> {
  // Return cached boundary if available
  if (cachedBoundary) {
    return cachedBoundary;
  }

  try {
    // Query Overpass API for residential areas in Fort Erie
    // Fort Erie approximate bounds: 42.88°N to 42.92°N, -79.00°W to -78.88°W
    // Using compact query format without newlines
    const query = '[out:json];[bbox:42.88,-79.00,42.92,-78.88];(way["landuse"="residential"];relation["landuse"="residential"];);out geom;';

    console.log('[residentialBoundary] Fetching from Overpass API...');
    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: query,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (!response.ok) {
      console.error('[residentialBoundary] API error:', response.status, response.statusText);
      try {
        const text = await response.text();
        console.error('[residentialBoundary] Response body:', text.substring(0, 200));
      } catch (e) {
        // Ignore error reading response body
      }
      return null;
    }

    let data;
    try {
      data = await response.json();
    } catch (parseError) {
      console.error('[residentialBoundary] JSON parse error:', parseError);
      return null;
    }

    // Convert OSM data to GeoJSON polygon
    if (!data.elements || data.elements.length === 0) {
      console.warn('[residentialBoundary] No residential areas found in Fort Erie');
      return null;
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
      return null;
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
      return null;
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
      properties: { name: 'Residential Area' },
      geometry: {
        type: 'Polygon',
        coordinates: [coordinates],
      },
    };

    cachedBoundary = boundary;
    console.log('[residentialBoundary] Successfully fetched and cached boundary');
    return boundary;
  } catch (error) {
    console.error('[residentialBoundary] Error:', error);
    return null;
  }
}
