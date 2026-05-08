/**
 * Competitor Integration Module
 * Handles extraction of competitor data from OpenStreetMap via Overpass API
 * Includes caching, refresh logic, and database persistence
 */

// Overpass API endpoint
const OVERPASS_API_URL = "https://overpass-api.de/api/interpreter";

// Restaurant location (Fort Erie, ON, Canada)
const RESTAURANT_LAT = 42.90517;
const RESTAURANT_LNG = -78.92295;

// Default extraction radius in kilometers
const DEFAULT_EXTRACTION_RADIUS_KM = 2;

// Cache validity period in hours
const CACHE_VALIDITY_HOURS = 24;

// Competitor types to extract from OSM
const COMPETITOR_TYPES = {
  restaurant: ['restaurant'],
  fast_food: ['fast_food'],
  cafe: ['cafe'],
  bar: ['bar'],
  food_court: ['food_court'],
  pub: ['pub'],
  bakery: ['bakery'],
  ice_cream: ['ice_cream'],
  pizza: ['pizza'],
};

interface CompetitorData {
  osmId: string;
  name: string;
  latitude: number;
  longitude: number;
  type: string;
  address?: string;
  website?: string;
  phone?: string;
  openingHours?: string;
  distanceFromRestaurantKm: number;
}

/**
 * Calculate distance between two coordinates using Haversine formula
 */
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Build Overpass QL query for competitor extraction
 */
function buildOverpassQuery(lat: number, lng: number, radiusKm: number): string {
  const radiusMeters = radiusKm * 1000;

  // Build amenity filter
  const amenityFilters = Object.values(COMPETITOR_TYPES)
    .flat()
    .map((type) => `amenity="${type}"`)
    .join(' or ');

  return `
    [bbox:${lat - radiusKm / 111},${lng - radiusKm / 111},${lat + radiusKm / 111},${lng + radiusKm / 111}];
    (
      node[${amenityFilters}];
      way[${amenityFilters}];
      relation[${amenityFilters}];
    );
    out center;
  `;
}

/**
 * Extract competitor type from OSM amenity
 */
function getCompetitorType(amenity: string): string {
  for (const [type, amenities] of Object.entries(COMPETITOR_TYPES)) {
    if (amenities.includes(amenity)) {
      return type;
    }
  }
  return 'other';
}

/**
 * Fetch competitors from Overpass API
 */
async function fetchCompetitorsFromOverpass(
  lat: number,
  lng: number,
  radiusKm: number
): Promise<CompetitorData[]> {
  try {
    const query = buildOverpassQuery(lat, lng, radiusKm);

    const response = await fetch(OVERPASS_API_URL, {
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

    const competitors: CompetitorData[] = [];

    if (data.elements) {
      for (const element of data.elements) {
        // Skip elements without name
        if (!element.tags?.name) continue;

        // Get coordinates
        let elementLat = element.lat;
        let elementLng = element.lon;

        // For ways and relations, use center
        if (element.center) {
          elementLat = element.center.lat;
          elementLng = element.center.lon;
        }

        if (!elementLat || !elementLng) continue;

        const distance = haversineDistance(lat, lng, elementLat, elementLng);

        // Skip if outside radius
        if (distance > radiusKm) continue;

        const competitor: CompetitorData = {
          osmId: `${element.type}-${element.id}`,
          name: element.tags.name,
          latitude: elementLat,
          longitude: elementLng,
          type: getCompetitorType(element.tags.amenity),
          address: element.tags['addr:full'] || element.tags['addr:street'],
          website: element.tags.website,
          phone: element.tags.phone,
          openingHours: element.tags['opening_hours'],
          distanceFromRestaurantKm: distance,
        };

        competitors.push(competitor);
      }
    }

    return competitors;
  } catch (error) {
    console.error('Error fetching from Overpass API:', error);
    throw error;
  }
}

/**
 * Check if cache is still valid
 */
function isCacheValid(lastRefreshAt: Date | null): boolean {
  if (!lastRefreshAt) return false;

  const now = new Date();
  const hoursSinceRefresh = (now.getTime() - lastRefreshAt.getTime()) / (1000 * 60 * 60);

  return hoursSinceRefresh < CACHE_VALIDITY_HOURS;
}

/**
 * Refresh competitor data (stub for Phase 1)
 * Full implementation will be added when tRPC procedures are created
 */
export async function refreshCompetitorData(
  restaurantId: string,
  radiusKm: number = DEFAULT_EXTRACTION_RADIUS_KM
): Promise<{ success: boolean; competitorCount: number; message: string }> {
  try {
    // Fetch from Overpass API
    const newCompetitors = await fetchCompetitorsFromOverpass(
      RESTAURANT_LAT,
      RESTAURANT_LNG,
      radiusKm
    );

    return {
      success: true,
      competitorCount: newCompetitors.length,
      message: `Successfully fetched ${newCompetitors.length} competitors from Overpass API`,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      competitorCount: 0,
      message: `Failed to refresh competitors: ${errorMessage}`,
    };
  }
}

/**
 * Get cached competitors (stub for Phase 1)
 */
export async function getCachedCompetitors(restaurantId: string) {
  return {
    competitors: [],
    cacheStatus: 'not_implemented',
    lastRefreshAt: null,
    message: 'Competitor caching will be implemented in Phase 1',
  };
}

/**
 * Get cache status (stub for Phase 1)
 */
export async function getCacheStatus(restaurantId: string) {
  return {
    status: 'not_initialized',
    lastRefreshAt: null,
    nextRefreshAt: null,
    totalCompetitors: 0,
    cacheStatus: 'unknown',
  };
}

/**
 * Get competitors from API (for testing)
 */
export async function getCompetitorsFromAPI(
  lat: number = RESTAURANT_LAT,
  lng: number = RESTAURANT_LNG,
  radiusKm: number = DEFAULT_EXTRACTION_RADIUS_KM
): Promise<CompetitorData[]> {
  return fetchCompetitorsFromOverpass(lat, lng, radiusKm);
}
