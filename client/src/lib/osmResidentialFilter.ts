/**
 * OpenStreetMap Land-Use Filtering
 * Filters delivery points to only residential areas
 * Uses Overpass API queries to identify residential zones
 */

export interface ResidentialArea {
  id: string;
  name: string;
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  type: 'residential' | 'commercial' | 'industrial' | 'park' | 'water' | 'farmland' | 'forest';
}

export interface DeliveryPoint {
  id: number;
  latitude: number;
  longitude: number;
  timestamp: number;
}

/**
 * OSM land-use tags that should be INCLUDED (residential areas)
 */
const RESIDENTIAL_LANDUSE_TAGS = [
  'residential',
  'allotments',
  'commercial', // Include commercial for mixed-use areas
];

/**
 * OSM land-use tags that should be EXCLUDED (non-residential)
 */
const EXCLUDED_LANDUSE_TAGS = [
  'industrial',
  'farmland',
  'forest',
  'water',
  'nature_reserve',
  'military',
  'railway',
  'airport',
  'quarry',
  'landfill',
];

/**
 * OSM amenity tags that indicate residential areas
 */
const RESIDENTIAL_AMENITIES = [
  'restaurant',
  'cafe',
  'bar',
  'pub',
  'fast_food',
  'shop',
  'supermarket',
  'pharmacy',
  'bank',
  'post_office',
  'library',
  'school',
  'hospital',
  'clinic',
];

/**
 * Check if a point is likely in a residential area based on nearby amenities
 * This is a heuristic approach when full OSM data is not available
 */
export function isLikelyResidential(
  latitude: number,
  longitude: number,
  nearbyAmenities?: string[]
): boolean {
  // If we have amenity data, check if it contains residential indicators
  if (nearbyAmenities && nearbyAmenities.length > 0) {
    const hasResidentialAmenity = nearbyAmenities.some((amenity) =>
      RESIDENTIAL_AMENITIES.some((tag) => amenity.toLowerCase().includes(tag))
    );
    return hasResidentialAmenity;
  }

  // Default: assume residential (conservative approach)
  // In production, this would query Overpass API
  return true;
}

/**
 * Filter delivery points to only those in residential areas
 * Uses a simple geographic heuristic (can be enhanced with OSM data)
 */
export function filterToResidentialAreas(points: DeliveryPoint[]): DeliveryPoint[] {
  // For now, return all points as residential
  // In production, this would:
  // 1. Query Overpass API for residential areas in the region
  // 2. Check each point against the residential polygon boundaries
  // 3. Return only points within residential areas

  // This is a placeholder that can be enhanced with actual OSM queries
  return points.filter((point) => isLikelyResidential(point.latitude, point.longitude));
}

/**
 * Build Overpass API query for residential areas in a bounding box
 * Returns the query string for use with Overpass API
 */
export function buildResidentialAreaQuery(
  north: number,
  south: number,
  east: number,
  west: number
): string {
  // Overpass API query for residential areas
  const bbox = `${south},${west},${north},${east}`;

  return `
    [bbox:${bbox}];
    (
      way["landuse"="residential"];
      way["landuse"="allotments"];
      relation["landuse"="residential"];
      relation["landuse"="allotments"];
    );
    out geom;
  `.trim();
}

/**
 * Build Overpass API query for non-residential areas to EXCLUDE
 */
export function buildExcludedAreaQuery(
  north: number,
  south: number,
  east: number,
  west: number
): string {
  const bbox = `${south},${west},${north},${east}`;
  const tags = EXCLUDED_LANDUSE_TAGS.map((tag) => `way["landuse"="${tag}"]`).join(';');

  return `
    [bbox:${bbox}];
    (
      ${tags};
    );
    out geom;
  `.trim();
}

/**
 * Check if a point is within a polygon (using ray casting algorithm)
 */
export function isPointInPolygon(
  point: [number, number],
  polygon: Array<[number, number]>
): boolean {
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
 * Filter points to exclude those in industrial/non-residential areas
 * Uses a simple distance-based heuristic
 */
export function excludeNonResidentialAreas(
  points: DeliveryPoint[],
  excludedAreas?: ResidentialArea[]
): DeliveryPoint[] {
  if (!excludedAreas || excludedAreas.length === 0) {
    return points;
  }

  return points.filter((point) => {
    // Check if point is in any excluded area
    for (const area of excludedAreas) {
      const inBounds =
        point.latitude <= area.bounds.north &&
        point.latitude >= area.bounds.south &&
        point.longitude <= area.bounds.east &&
        point.longitude >= area.bounds.west;

      if (inBounds) {
        return false; // Exclude this point
      }
    }
    return true;
  });
}

/**
 * Simple heuristic: detect if area is likely industrial based on point density
 * Industrial areas typically have lower delivery density
 */
export function isLikelyIndustrialArea(
  points: DeliveryPoint[],
  gridCellSize: number = 0.01 // ~1km at equator
): boolean {
  if (points.length < 3) return false;

  // Calculate point density
  let minLat = points[0].latitude;
  let maxLat = points[0].latitude;
  let minLng = points[0].longitude;
  let maxLng = points[0].longitude;

  for (const point of points) {
    minLat = Math.min(minLat, point.latitude);
    maxLat = Math.max(maxLat, point.latitude);
    minLng = Math.min(minLng, point.longitude);
    maxLng = Math.max(maxLng, point.longitude);
  }

  const area = (maxLat - minLat) * (maxLng - minLng);
  const density = points.length / area;

  // Industrial areas have very low delivery density (< 1 delivery per 0.01 degree square)
  return density < 1;
}

/**
 * Enhance residential filtering by analyzing temporal patterns
 * Residential areas typically have delivery peaks during meal times
 */
export function filterByTemporalResidentialPattern(
  points: DeliveryPoint[]
): DeliveryPoint[] {
  // Extract hours from timestamps
  const hourCounts = new Map<number, number>();

  for (const point of points) {
    const hour = new Date(point.timestamp).getHours();
    hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
  }

  // Residential areas typically have peaks at:
  // - Lunch: 11-14 (11 AM - 2 PM)
  // - Dinner: 17-21 (5 PM - 9 PM)
  const residentialHours = new Set([11, 12, 13, 14, 17, 18, 19, 20, 21]);

  // Calculate what percentage of deliveries occur during residential hours
  let residentialHourDeliveries = 0;
  for (const [hour, count] of hourCounts) {
    if (residentialHours.has(hour)) {
      residentialHourDeliveries += count;
    }
  }

  const residentialPercentage = residentialHourDeliveries / points.length;

  // If > 60% of deliveries are during meal times, likely residential
  if (residentialPercentage > 0.6) {
    return points;
  }

  // Otherwise, filter to only meal-time deliveries
  return points.filter((point) => {
    const hour = new Date(point.timestamp).getHours();
    return residentialHours.has(hour);
  });
}
