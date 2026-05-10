/**
 * Heatmap Calculation Utilities
 * Implements Kernel Density Estimation (KDE) for delivery demand visualization
 */

export interface DeliveryPoint {
  id: number;
  latitude: number;
  longitude: number;
  timestamp: number; // Unix timestamp
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
 * For small areas, this approximation is sufficient
 */
function distance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dlat = lat2 - lat1;
  const dlng = lng2 - lng1;
  return Math.sqrt(dlat * dlat + dlng * dlng);
}

/**
 * Gaussian kernel function for KDE
 * Returns the weight contribution of a point at given distance
 */
function gaussianKernel(distance: number, bandwidth: number): number {
  const normalizedDist = distance / bandwidth;
  return Math.exp(-0.5 * normalizedDist * normalizedDist);
}

/**
 * Calculate optimal bandwidth using Scott's rule
 * bandwidth = n^(-1/(d+4)) where n is number of points, d is dimensions (2)
 */
function calculateBandwidth(pointCount: number): number {
  if (pointCount === 0) return 0.01;
  // For 2D data: n^(-1/6)
  const bandwidth = Math.pow(pointCount, -1 / 6);
  // Scale to reasonable geographic units (degrees)
  return Math.max(0.001, Math.min(0.1, bandwidth * 0.01));
}

/**
 * Generate KDE heatmap from delivery points
 * Creates a grid of intensity values based on point density
 */
export function generateKDEHeatmap(
  points: DeliveryPoint[],
  gridResolution: number = 50 // Number of grid cells per dimension
): HeatmapData {
  if (points.length === 0) {
    return {
      gridPoints: [],
      bounds: { north: 0, south: 0, east: 0, west: 0 },
      maxIntensity: 0,
      pointCount: 0,
    };
  }

  // Calculate bounds
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

  // Add padding to bounds
  const latPadding = (maxLat - minLat) * 0.1 || 0.01;
  const lngPadding = (maxLng - minLng) * 0.1 || 0.01;

  minLat -= latPadding;
  maxLat += latPadding;
  minLng -= lngPadding;
  maxLng += lngPadding;

  // Calculate bandwidth
  const bandwidth = calculateBandwidth(points.length);

  // Generate grid
  const gridPoints: HeatmapGridPoint[] = [];
  const latStep = (maxLat - minLat) / gridResolution;
  const lngStep = (maxLng - minLng) / gridResolution;

  let maxIntensity = 0;

  for (let i = 0; i <= gridResolution; i++) {
    for (let j = 0; j <= gridResolution; j++) {
      const lat = minLat + i * latStep;
      const lng = minLng + j * lngStep;

      // Calculate KDE value at this grid point
      let intensity = 0;
      for (const point of points) {
        const dist = distance(lat, lng, point.latitude, point.longitude);
        intensity += gaussianKernel(dist, bandwidth);
      }

      // Normalize by number of points
      intensity /= points.length;

      gridPoints.push({ lat, lng, intensity });
      maxIntensity = Math.max(maxIntensity, intensity);
    }
  }

  // Normalize intensities to 0-1 range
  if (maxIntensity > 0) {
    for (const point of gridPoints) {
      point.intensity /= maxIntensity;
    }
  }

  return {
    gridPoints,
    bounds: { north: maxLat, south: minLat, east: maxLng, west: minLng },
    maxIntensity,
    pointCount: points.length,
  };
}

/**
 * Convert KDE heatmap grid to Leaflet heatmap format
 * Returns array of [lat, lng, intensity] tuples
 */
export function convertToLeafletHeatmapFormat(
  heatmapData: HeatmapData
): Array<[number, number, number]> {
  return heatmapData.gridPoints.map((point) => [point.lat, point.lng, point.intensity]);
}

/**
 * Filter delivery points by time range
 */
export function filterPointsByTimeRange(
  points: DeliveryPoint[],
  startDate: Date,
  endDate: Date,
  startHour?: number,
  endHour?: number
): DeliveryPoint[] {
  const startTime = startDate.getTime();
  const endTime = endDate.getTime();

  return points.filter((point) => {
    if (point.timestamp < startTime || point.timestamp > endTime) {
      return false;
    }

    if (startHour !== undefined && endHour !== undefined) {
      const hour = new Date(point.timestamp).getHours();
      return hour >= startHour && hour < endHour;
    }

    return true;
  });
}

/**
 * Filter delivery points by day of week
 * dayOfWeek: 0 = Sunday, 1 = Monday, ..., 6 = Saturday
 */
export function filterPointsByDayOfWeek(
  points: DeliveryPoint[],
  daysOfWeek: number[]
): DeliveryPoint[] {
  return points.filter((point) => {
    const dayOfWeek = new Date(point.timestamp).getDay();
    return daysOfWeek.includes(dayOfWeek);
  });
}

/**
 * Filter delivery points by geographic bounds
 */
export function filterPointsByBounds(
  points: DeliveryPoint[],
  north: number,
  south: number,
  east: number,
  west: number
): DeliveryPoint[] {
  return points.filter(
    (point) =>
      point.latitude <= north &&
      point.latitude >= south &&
      point.longitude <= east &&
      point.longitude >= west
  );
}

/**
 * Downsample points for performance
 * Randomly selects a subset of points
 */
export function downsamplePoints(points: DeliveryPoint[], maxPoints: number): DeliveryPoint[] {
  if (points.length <= maxPoints) {
    return points;
  }

  const sampleRate = maxPoints / points.length;
  return points.filter(() => Math.random() < sampleRate);
}
