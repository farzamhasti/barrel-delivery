/**
 * Hardcoded competitor locations for Fort Erie
 * These are the exact competitors provided for the geomarketing analysis
 */

export interface CompetitorLocation {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  type: 'restaurant' | 'cafe' | 'fast_food' | 'pizza' | 'other';
}

/**
 * List of 13 competitors in Fort Erie with exact coordinates
 */
export const FORT_ERIE_COMPETITORS: CompetitorLocation[] = [
  {
    name: 'Red Swan Pizza',
    address: '315 Garrison Rd Unit 8, Fort Erie, ON L2A 0G2',
    latitude: 42.9179,
    longitude: -78.9128,
    type: 'pizza',
  },
  {
    name: 'Crafted 1885',
    address: '1318 Dominion Rd, Fort Erie, ON L2A 1J3',
    latitude: 42.8854,
    longitude: -78.9372,
    type: 'restaurant',
  },
  {
    name: 'Take 2 Restaurant & Bar',
    address: '1882 Garrison Rd, Fort Erie, ON L2A 5M4',
    latitude: 42.9226,
    longitude: -78.9674,
    type: 'restaurant',
  },
  {
    name: "Rizzo's House of Parm",
    address: '2 Ridgeway Rd, Ridgeway, ON L0S 1N0',
    latitude: 42.8532,
    longitude: -79.0156,
    type: 'restaurant',
  },
  {
    name: "Rina's Place",
    address: '1206 Dominion Rd, Fort Erie, ON L2A 1H5',
    latitude: 42.8869,
    longitude: -78.9365,
    type: 'restaurant',
  },
  {
    name: "Tahini's",
    address: '450 Garrison Rd Unit #103, Fort Erie, ON L2A 1N2',
    latitude: 42.9158,
    longitude: -78.9124,
    type: 'fast_food',
  },
  {
    name: "Osmow's Shawarma",
    address: '385 Garrison Rd, Fort Erie, ON L2A 1N1',
    latitude: 42.9148,
    longitude: -78.9117,
    type: 'fast_food',
  },
  {
    name: 'The Plaice Bar & Grill',
    address: '981 Garrison Rd, Fort Erie, ON L2A 1N8',
    latitude: 42.9186,
    longitude: -78.9135,
    type: 'restaurant',
  },
  {
    name: 'Pizza Hut',
    address: '450 Garrison Rd Unit # 130, Fort Erie, ON L2A 1N2',
    latitude: 42.9158,
    longitude: -78.9124,
    type: 'pizza',
  },
  {
    name: "Arby's",
    address: '199 Garrison Rd, Fort Erie, ON L2A 1M6',
    latitude: 42.9135,
    longitude: -78.9111,
    type: 'fast_food',
  },
  {
    name: 'Little Red Coffee & Catering (Fort Erie)',
    address: '46 Queen St, Fort Erie, ON L2A 1T8',
    latitude: 42.9089,
    longitude: -78.9198,
    type: 'cafe',
  },
  {
    name: 'Southsides Patio Bar & Grill',
    address: '80 Niagara Blvd, Fort Erie, ON L2A 3G3',
    latitude: 42.8868,
    longitude: -78.9288,
    type: 'restaurant',
  },
  {
    name: 'City Thai Restaurant',
    address: '93 Niagara Blvd, Fort Erie, ON L2A 3G4',
    latitude: 42.8876,
    longitude: -78.9295,
    type: 'restaurant',
  },
];

/**
 * Calculate distance between two coordinates using Haversine formula
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
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
 * Get competitors within a specified radius of a location
 */
export function getCompetitorsWithinRadius(
  lat: number,
  lng: number,
  radiusKm: number = 2
): CompetitorLocation[] {
  return FORT_ERIE_COMPETITORS.filter((competitor) => {
    const distance = calculateDistance(lat, lng, competitor.latitude, competitor.longitude);
    return distance <= radiusKm;
  });
}

/**
 * Get the nearest competitor to a location
 */
export function getNearestCompetitor(lat: number, lng: number): CompetitorLocation | null {
  if (FORT_ERIE_COMPETITORS.length === 0) return null;

  let nearest = FORT_ERIE_COMPETITORS[0];
  let minDistance = calculateDistance(lat, lng, nearest.latitude, nearest.longitude);

  for (const competitor of FORT_ERIE_COMPETITORS) {
    const distance = calculateDistance(lat, lng, competitor.latitude, competitor.longitude);
    if (distance < minDistance) {
      minDistance = distance;
      nearest = competitor;
    }
  }

  return nearest;
}

/**
 * Count competitors by type within a radius
 */
export function countCompetitorsByType(
  lat: number,
  lng: number,
  radiusKm: number = 2
): Record<string, number> {
  const competitors = getCompetitorsWithinRadius(lat, lng, radiusKm);
  const counts: Record<string, number> = {
    restaurant: 0,
    cafe: 0,
    fast_food: 0,
    pizza: 0,
    other: 0,
  };

  for (const competitor of competitors) {
    counts[competitor.type]++;
  }

  return counts;
}
