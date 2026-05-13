/**
 * Geographic Boundary Filter for Fort Erie Service Area
 * Uses point-in-polygon algorithm to filter zones within delivery boundaries
 */

// Fort Erie service area boundary polygon (48 points)
// Coordinates in [longitude, latitude] format
// Updated with accurate boundary from user GeoJSON
const FORT_ERIE_BOUNDARY = [
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
  [-78.999892, 42.8765244],
];

export interface BoundaryPoint {
  longitude: number;
  latitude: number;
}

export interface BoundaryCheckResult {
  isInside: boolean;
  distance?: number; // Distance from nearest boundary point in km
}

/**
 * Check if a point is inside the Fort Erie boundary using ray casting algorithm
 * @param longitude - Point longitude
 * @param latitude - Point latitude
 * @returns true if point is inside boundary, false otherwise
 */
export function isPointInBoundary(
  longitude: number,
  latitude: number
): BoundaryCheckResult {
  // Ray casting algorithm: cast a ray from the point to infinity
  // Count how many times it crosses the polygon boundary
  // If odd number of crossings, point is inside
  let isInside = false;

  for (let i = 0, j = FORT_ERIE_BOUNDARY.length - 1; i < FORT_ERIE_BOUNDARY.length; j = i++) {
    const [xi, yi] = FORT_ERIE_BOUNDARY[i];
    const [xj, yj] = FORT_ERIE_BOUNDARY[j];

    const intersect =
      yi > latitude !== yj > latitude &&
      longitude < ((xj - xi) * (latitude - yi)) / (yj - yi) + xi;

    if (intersect) isInside = !isInside;
  }

  return { isInside, distance: undefined };
}

/**
 * Calculate distance between two points in kilometers (Haversine formula)
 */
export function calculateDistance(
  lon1: number,
  lat1: number,
  lon2: number,
  lat2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Find the nearest boundary point to a given location
 */
export function findNearestBoundaryPoint(
  longitude: number,
  latitude: number
): { distance: number; point: [number, number] } {
  let minDistance = Infinity;
  let nearestPoint: [number, number] = [FORT_ERIE_BOUNDARY[0][0], FORT_ERIE_BOUNDARY[0][1]];

  for (const point of FORT_ERIE_BOUNDARY) {
    const distance = calculateDistance(longitude, latitude, point[0], point[1]);
    if (distance < minDistance) {
      minDistance = distance;
      nearestPoint = [point[0], point[1]];
    }
  }

  return { distance: minDistance, point: nearestPoint };
}

/**
 * Filter zones by geographic boundary
 * @param zones - Array of zones with location data
 * @returns Filtered zones that are within the Fort Erie boundary
 */
export function filterZonesByBoundary<T extends { latitude: number; longitude: number; orderLocations?: Array<{ lat: number; lon: number }> }>(
  zones: T[]
): T[] {
  return zones.filter((zone) => {
    // First check if zone center is inside boundary
    const centerResult = isPointInBoundary(zone.longitude, zone.latitude);
    if (centerResult.isInside) {
      return true;
    }
    
    // If zone center is outside, check if any order locations are inside
    if (zone.orderLocations && zone.orderLocations.length > 0) {
      const hasOrdersInside = zone.orderLocations.some((order) => {
        const orderResult = isPointInBoundary(order.lon, order.lat);
        return orderResult.isInside;
      });
      return hasOrdersInside;
    }
    
    // If no orders or center is outside, exclude the zone
    return false;
  });
}

/**
 * Classify zones by boundary status
 * @param zones - Array of zones with location data
 * @returns Object with zones inside and outside boundary
 */
export function classifyZonesByBoundary<T extends { latitude: number; longitude: number }>(
  zones: T[]
): {
  insideBoundary: T[];
  outsideBoundary: T[];
} {
  const insideBoundary: T[] = [];
  const outsideBoundary: T[] = [];

  for (const zone of zones) {
    const result = isPointInBoundary(zone.longitude, zone.latitude);
    if (result.isInside) {
      insideBoundary.push(zone);
    } else {
      outsideBoundary.push(zone);
    }
  }

  return { insideBoundary, outsideBoundary };
}

/**
 * Get boundary polygon for visualization
 */
export function getBoundaryPolygon(): Array<[number, number]> {
  return FORT_ERIE_BOUNDARY as Array<[number, number]>;
}

/**
 * Get boundary center point (centroid)
 */
export function getBoundaryCenter(): [number, number] {
  let sumLon = 0;
  let sumLat = 0;

  for (const point of FORT_ERIE_BOUNDARY) {
    sumLon += point[0];
    sumLat += point[1];
  }

  return [
    sumLon / FORT_ERIE_BOUNDARY.length,
    sumLat / FORT_ERIE_BOUNDARY.length,
  ] as [number, number];
}

/**
 * Get boundary bounds (min/max coordinates)
 */
export function getBoundaryBounds(): {
  minLon: number;
  maxLon: number;
  minLat: number;
  maxLat: number;
} {
  let minLon = Infinity;
  let maxLon = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;

  for (const point of FORT_ERIE_BOUNDARY) {
    minLon = Math.min(minLon, point[0]);
    maxLon = Math.max(maxLon, point[0]);
    minLat = Math.min(minLat, point[1]);
    maxLat = Math.max(maxLat, point[1]);
  }

  return { minLon, maxLon, minLat, maxLat };
}
