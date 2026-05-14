import * as voronoi from '@turf/voronoi';
import * as intersect from '@turf/intersect';
import { featureCollection, point, polygon, centroid, booleanPointInPolygon, area } from '@turf/turf';

/**
 * Fort Erie boundary polygon (in GeoJSON format)
 * Coordinates are [longitude, latitude]
 */
const FORT_ERIE_BOUNDARY = {
  type: 'Polygon' as const,
  coordinates: [[
    [-78.9783667, 42.8812164],
    [-78.9187357, 42.8812164],
    [-78.9187357, 42.9566977],
    [-78.9783667, 42.9566977],
    [-78.9783667, 42.8812164],
  ]],
};

export interface VoronoiZone {
  zoneId: string;
  geometry: GeoJSON.Polygon;
  centerLat: number;
  centerLon: number;
  orderCount: number;
  previousOrderCount: number;
  currentOrderCount: number;
}

/**
 * Generate Voronoi diagram from order points and clip to Fort Erie boundary
 * Returns only zones that are entirely or partially within Fort Erie
 */
export function generateClippedVoronoiZones(
  orderPoints: Array<{ lat: number; lon: number; orderId: string }>
): VoronoiZone[] {
  if (orderPoints.length === 0) {
    return [];
  }

  try {
    // Convert order points to GeoJSON features
    const points = featureCollection(
      orderPoints.map((p, idx) =>
        point([p.lon, p.lat], { id: idx, orderId: p.orderId })
      )
    );

    // Generate Voronoi diagram
    const voronoiResult = voronoi.voronoi(points, {
      bbox: [-78.99, 42.85, -78.91, 42.96], // Slightly larger than Fort Erie
    });

    const zones: VoronoiZone[] = [];
    let zoneCounter = 0;

    // Process each Voronoi cell
    for (const feature of voronoiResult.features) {
      if (feature.geometry.type !== 'Polygon') continue;

      try {
        // Clip the Voronoi cell to Fort Erie boundary
        const voronoiPoly = polygon(feature.geometry.coordinates);
        const boundaryPoly = polygon(FORT_ERIE_BOUNDARY.coordinates);
        
        // Use turf's intersect function
        const clipped = (intersect as any).default(voronoiPoly, boundaryPoly);

        if (!clipped || !clipped.geometry || clipped.geometry.type !== 'Polygon') {
          continue; // Zone is entirely outside Fort Erie
        }

        // Get the center of the clipped polygon
        const centroidFeature = centroid(clipped);
        const [centerLon, centerLat] = centroidFeature.geometry.coordinates;

        zones.push({
          zoneId: `voronoi_${zoneCounter++}`,
          geometry: clipped.geometry as any as GeoJSON.Polygon,
          centerLat,
          centerLon,
          orderCount: 0,
          previousOrderCount: 0,
          currentOrderCount: 0,
        });
      } catch (error) {
        // Skip zones that can't be clipped
        console.error('[voronoiSpatialClipping] Error clipping zone:', error);
        continue;
      }
    }

    console.log(`[voronoiSpatialClipping] Generated ${zones.length} clipped Voronoi zones from ${orderPoints.length} order points`);
    return zones;
  } catch (error) {
    console.error('[voronoiSpatialClipping] Error generating Voronoi diagram:', error);
    return [];
  }
}

/**
 * Check if a point is inside a polygon
 */
export function isPointInPolygon(
  lat: number,
  lon: number,
  polygonGeom: GeoJSON.Polygon
): boolean {
  try {
    const pt = point([lon, lat]);
    const poly = polygon(polygonGeom.coordinates);
    return (booleanPointInPolygon as any)(pt, poly);
  } catch (error) {
    console.error('[voronoiSpatialClipping] Error checking point in polygon:', error);
    return false;
  }
}

/**
 * Get all zones that contain a specific point
 */
export function getZonesContainingPoint(
  lat: number,
  lon: number,
  zones: VoronoiZone[]
): VoronoiZone[] {
  return zones.filter(zone => isPointInPolygon(lat, lon, zone.geometry));
}

/**
 * Calculate the area of a polygon in square kilometers
 */
export function calculatePolygonArea(polygonGeom: GeoJSON.Polygon): number {
  try {
    const poly = polygon(polygonGeom.coordinates);
    return (area as any)(poly) / 1_000_000; // Convert to km²
  } catch (error) {
    console.error('[voronoiSpatialClipping] Error calculating polygon area:', error);
    return 0;
  }
}

/**
 * Get the Fort Erie boundary polygon
 */
export function getFortErieBoundary(): GeoJSON.Polygon {
  return FORT_ERIE_BOUNDARY;
}

/**
 * Check if a point is within Fort Erie boundary
 */
export function isPointInFortErie(lat: number, lon: number): boolean {
  return isPointInPolygon(lat, lon, FORT_ERIE_BOUNDARY);
}
