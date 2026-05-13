/**
 * Geographic Boundary Filter for Fort Erie Service Area
 * Uses point-in-polygon algorithm to filter zones within delivery boundaries
 */

// Fort Erie service area boundary polygon (37 points)
// Coordinates in [longitude, latitude] format
const FORT_ERIE_BOUNDARY = [
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
