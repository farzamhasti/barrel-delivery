/**
 * Utility to fetch and cache residential area boundaries from OpenStreetMap
 * Uses Overpass API to get the boundary polygon for Fort Erie residential areas
 */

let cachedBoundary: GeoJSON.Feature<GeoJSON.Polygon> | null = null;

export interface BoundaryPoint {
  lat: number;
  lng: number;
}

/**
 * Fetch the residential area boundary polygon for Fort Erie
 * Uses Overpass API to query OSM data
 */
export async function getResidentialBoundary(): Promise<GeoJSON.Feature<GeoJSON.Polygon> | null> {
  // Return cached boundary if available
  if (cachedBoundary) {
    return cachedBoundary;
  }

  try {
    // Query Overpass API for residential areas in Fort Erie
    // Fort Erie approximate bounds: 42.88°N to 42.92°N, -79.00°W to -78.88°W
    const query = `
      [bbox:42.88,-79.00,42.92,-78.88];
      (
        way["landuse"="residential"];
        relation["landuse"="residential"];
      );
      out geom;
    `;

    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: query,
    });

    if (!response.ok) {
      console.error('Failed to fetch residential boundary from Overpass API');
      return null;
    }

    const data = await response.json();

    // Convert OSM data to GeoJSON polygon
    const boundary = convertOSMToGeoJSON(data);
    if (boundary) {
      cachedBoundary = boundary;
      return boundary;
    }

    return null;
  } catch (error) {
    console.error('Error fetching residential boundary:', error);
    return null;
  }
}

/**
 * Convert OSM data from Overpass API to GeoJSON format
 */
function convertOSMToGeoJSON(osmData: any): GeoJSON.Feature<GeoJSON.Polygon> | null {
  if (!osmData.elements || osmData.elements.length === 0) {
    return null;
  }

  // Find the largest polygon (main residential area)
  let largestPolygon: any = null;
  let largestArea = 0;

  for (const element of osmData.elements) {
    if (element.type === 'way' && element.geometry) {
      const area = calculatePolygonArea(element.geometry);
      if (area > largestArea) {
        largestArea = area;
        largestPolygon = element;
      }
    }
  }

  if (!largestPolygon || !largestPolygon.geometry) {
    return null;
  }

  // Convert geometry to GeoJSON coordinates
  const coordinates = largestPolygon.geometry.map((point: any) => [point.lon, point.lat]);

  // Ensure polygon is closed
  if (coordinates.length > 0 && 
      (coordinates[0][0] !== coordinates[coordinates.length - 1][0] ||
       coordinates[0][1] !== coordinates[coordinates.length - 1][1])) {
    coordinates.push(coordinates[0]);
  }

  return {
    type: 'Feature',
    properties: { name: 'Residential Area' },
    geometry: {
      type: 'Polygon',
      coordinates: [coordinates],
    },
  };
}

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

    area += (lon1 * lat2 - lon2 * lat1);
  }

  return Math.abs(area) / 2;
}

/**
 * Check if a point is inside a polygon using ray casting algorithm
 */
export function isPointInPolygon(point: BoundaryPoint, polygon: GeoJSON.Feature<GeoJSON.Polygon>): boolean {
  const coords = polygon.geometry.coordinates[0];
  let inside = false;

  for (let i = 0, j = coords.length - 1; i < coords.length; j = i++) {
    const xi = coords[i][0];
    const yi = coords[i][1];
    const xj = coords[j][0];
    const yj = coords[j][1];

    const intersect = yi > point.lat !== yj > point.lat &&
      point.lng < (xj - xi) * (point.lat - yi) / (yj - yi) + xi;

    if (intersect) inside = !inside;
  }

  return inside;
}

/**
 * Get boundary polygon as Leaflet LatLng array
 */
export function getBoundaryLatLngs(polygon: GeoJSON.Feature<GeoJSON.Polygon>): Array<[number, number]> {
  return polygon.geometry.coordinates[0].map(([lng, lat]) => [lat, lng]);
}

/**
 * Create a Leaflet polygon layer for the residential boundary
 */
export function createBoundaryLayer(polygon: GeoJSON.Feature<GeoJSON.Polygon>): any {
  if (!window.L) return null;

  const latLngs = getBoundaryLatLngs(polygon);

  return window.L.polygon(latLngs, {
    color: '#999',
    weight: 2,
    opacity: 0.5,
    fill: false,
    dashArray: '5, 5',
  });
}
