/**
 * Heatmap Calculation with Residential Area Masking
 * Implements Kernel Density Estimation (KDE) for delivery demand visualization
 * ONLY for residential areas - excludes non-residential zones
 */

import { isPointInPolygon, BoundaryPoint } from './residentialBoundaryShared';

export interface DeliveryPoint {
  id: number;
  latitude: number;
  longitude: number;
  timestamp: number;
}

export interface HeatmapGridPoint {
  lat: number;
  lng: number;
  intensity: number; // 0-1 normalized intensity
}

export interface HeatmapData {
  gridPoints: HeatmapGridPoint[];
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  maxIntensity: number;
  pointCount: number;
}

/**
 * Calculate Euclidean distance between two points (in degrees)
 */
function distance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dlat = lat2 - lat1;
  const dlng = lng2 - lng1;
  return Math.sqrt(dlat * dlat + dlng * dlng);
}

/**
 * Gaussian kernel function for KDE
 */
function gaussianKernel(distance: number, bandwidth: number): number {
  const normalizedDist = distance / bandwidth;
  return Math.exp(-0.5 * normalizedDist * normalizedDist);
}

/**
 * Calculate optimal bandwidth using Scott's rule
 */
function calculateBandwidth(pointCount: number): number {
  if (pointCount === 0) return 0.01;
  const bandwidth = Math.pow(pointCount, -1 / 6);
  return Math.max(0.001, Math.min(0.1, bandwidth * 0.01));
}

/**
 * Generate KDE heatmap from delivery points, ONLY within residential boundary
 * All grid cells outside the residential boundary are excluded
 */
export function generateKDEHeatmapResidential(
  points: DeliveryPoint[],
  residentialBoundary: any, // GeoJSON Feature<Polygon>
  gridResolution: number = 50
): HeatmapData {
  if (points.length === 0) {
    return {
      gridPoints: [],
      bounds: { north: 0, south: 0, east: 0, west: 0 },
      maxIntensity: 0,
      pointCount: 0,
    };
  }

  // Calculate bounds from residential boundary, not from all points
  const boundaryCoords = residentialBoundary.geometry.coordinates[0];
  let minLat = boundaryCoords[0][1];
  let maxLat = boundaryCoords[0][1];
  let minLng = boundaryCoords[0][0];
  let maxLng = boundaryCoords[0][0];

  for (const [lng, lat] of boundaryCoords) {
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
  }

  // Add small padding
  const latPadding = (maxLat - minLat) * 0.05;
  const lngPadding = (maxLng - minLng) * 0.05;

  minLat -= latPadding;
  maxLat += latPadding;
  minLng -= lngPadding;
  maxLng += lngPadding;

  // Create grid
  const latStep = (maxLat - minLat) / gridResolution;
  const lngStep = (maxLng - minLng) / gridResolution;

  const gridPoints: HeatmapGridPoint[] = [];
  let maxIntensity = 0;
  const bandwidth = calculateBandwidth(points.length);

  // Generate grid cells
  for (let i = 0; i <= gridResolution; i++) {
    for (let j = 0; j <= gridResolution; j++) {
      const lat = minLat + i * latStep;
      const lng = minLng + j * lngStep;

      // CRITICAL: Only include grid cells that are within residential boundary
      const gridPoint: BoundaryPoint = { lat, lng };
      if (!isPointInPolygon(gridPoint, residentialBoundary)) {
        continue; // Skip this grid cell - it's outside residential area
      }

      // Calculate KDE intensity at this grid point
      let intensity = 0;
      for (const point of points) {
        const dist = distance(lat, lng, point.latitude, point.longitude);
        intensity += gaussianKernel(dist, bandwidth);
      }

      if (intensity > 0) {
        gridPoints.push({ lat, lng, intensity });
        maxIntensity = Math.max(maxIntensity, intensity);
      }
    }
  }

  // Normalize intensities to 0-1
  if (maxIntensity > 0) {
    for (const point of gridPoints) {
      point.intensity = point.intensity / maxIntensity;
    }
  }

  return {
    gridPoints,
    bounds: { north: maxLat, south: minLat, east: maxLng, west: minLng },
    maxIntensity: maxIntensity > 0 ? 1 : 0, // Normalized
    pointCount: points.length,
  };
}

/**
 * Convert heatmap data to Leaflet heatmap format
 */
export function convertToLeafletHeatmapFormat(heatmapData: HeatmapData): Array<[number, number, number]> {
  return heatmapData.gridPoints.map((point) => [point.lat, point.lng, point.intensity]);
}
