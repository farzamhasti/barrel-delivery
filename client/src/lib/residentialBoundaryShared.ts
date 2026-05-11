/**
 * Shared utilities for residential boundary polygon operations
 * Used by both client and server components
 */

export interface BoundaryPoint {
  lat: number;
  lng: number;
}

/**
 * Check if a point is inside a polygon using ray casting algorithm
 * Works with GeoJSON Polygon features from OpenStreetMap
 */
export function isPointInPolygon(point: BoundaryPoint, boundary: any): boolean {
  if (!boundary || !boundary.geometry || boundary.geometry.type !== 'Polygon') {
    return false;
  }

  const coords = boundary.geometry.coordinates[0];
  const x = point.lng;
  const y = point.lat;

  let inside = false;
  for (let i = 0, j = coords.length - 1; i < coords.length; j = i++) {
    const xi = coords[i][0];
    const yi = coords[i][1];
    const xj = coords[j][0];
    const yj = coords[j][1];

    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }

  return inside;
}

/**
 * Create a Leaflet layer for the residential boundary polygon
 */
export function createBoundaryLayer(boundary: any): any {
  if (typeof window === 'undefined' || !window.L || !boundary) return null;

  const coords = boundary.geometry.coordinates[0];
  const latLngs = coords.map((c: any) => [c[1], c[0]]);

  return window.L.polyline(latLngs, {
    color: '#8b5cf6',
    weight: 2,
    opacity: 0.7,
    dashArray: '5, 5',
    fill: false,
  });
}

/**
 * Get boundary coordinates as LatLng array for Leaflet
 */
export function getBoundaryLatLngs(boundary: any): Array<[number, number]> {
  if (!boundary || !boundary.geometry || boundary.geometry.type !== 'Polygon') {
    return [];
  }

  const coords = boundary.geometry.coordinates[0];
  return coords.map((c: any) => [c[1], c[0]]);
}

/**
 * Get bounding box of the residential boundary
 */
export function getBoundaryBounds(boundary: any): {
  north: number;
  south: number;
  east: number;
  west: number;
} | null {
  if (!boundary || !boundary.geometry || boundary.geometry.type !== 'Polygon') {
    return null;
  }

  const coords = boundary.geometry.coordinates[0];
  let minLat = coords[0][1];
  let maxLat = coords[0][1];
  let minLng = coords[0][0];
  let maxLng = coords[0][0];

  for (const [lng, lat] of coords) {
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
  }

  return {
    north: maxLat,
    south: minLat,
    east: maxLng,
    west: minLng,
  };
}
