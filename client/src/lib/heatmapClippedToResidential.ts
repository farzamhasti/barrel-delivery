/**
 * Heatmap calculation with polygon clipping to residential areas
 * Uses Gaussian KDE with clipping to residential polygon boundaries
 */

export interface DeliveryPoint {
  id: string;
  latitude: number;
  longitude: number;
  timestamp: number;
}

export interface ClippedHeatmapCell {
  lat: number;
  lng: number;
  intensity: number;
}

export interface ResidentialPolygon {
  id: string;
  coordinates: Array<[number, number]>; // [lng, lat] pairs
  type: 'residential' | 'building';
}

export interface ClippedHeatmapData {
  gridPoints: ClippedHeatmapCell[];
  maxIntensity: number;
  minIntensity: number;
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  polygonBounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
}

/**
 * Point-in-polygon test using ray casting algorithm
 */
function isPointInPolygon(point: [number, number], polygon: [number, number][]): boolean {
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
 * Check if a point is within any residential polygon
 */
function isPointInResidentialArea(
  lat: number,
  lng: number,
  residentialPolygons: ResidentialPolygon[]
): boolean {
  const point: [number, number] = [lng, lat];

  for (const polygon of residentialPolygons) {
    if (isPointInPolygon(point, polygon.coordinates)) {
      return true;
    }
  }

  return false;
}

/**
 * Calculate Gaussian KDE value at a point
 * Using Scott's rule for bandwidth selection
 */
function gaussianKDE(
  point: [number, number],
  dataPoints: Array<[number, number]>,
  bandwidth: number
): number {
  if (dataPoints.length === 0) return 0;

  let sum = 0;
  const factor = 1 / (dataPoints.length * bandwidth * Math.sqrt(2 * Math.PI));

  for (const dataPoint of dataPoints) {
    const dx = point[0] - dataPoint[0];
    const dy = point[1] - dataPoint[1];
    const distSquared = dx * dx + dy * dy;
    const kernelValue = Math.exp(-distSquared / (2 * bandwidth * bandwidth));
    sum += kernelValue;
  }

  return factor * sum;
}

/**
 * Calculate Scott's rule bandwidth for KDE
 */
function calculateBandwidth(dataPoints: Array<[number, number]>): number {
  if (dataPoints.length < 2) return 0.01;

  // Calculate standard deviation
  let meanX = 0;
  let meanY = 0;

  for (const point of dataPoints) {
    meanX += point[0];
    meanY += point[1];
  }

  meanX /= dataPoints.length;
  meanY /= dataPoints.length;

  let varX = 0;
  let varY = 0;

  for (const point of dataPoints) {
    varX += Math.pow(point[0] - meanX, 2);
    varY += Math.pow(point[1] - meanY, 2);
  }

  varX /= dataPoints.length;
  varY /= dataPoints.length;

  const stdDev = Math.sqrt((varX + varY) / 2);

  // Scott's rule: h = n^(-1/(d+4)) * sigma
  // where d=2 (2D), so h = n^(-1/6) * sigma
  const n = dataPoints.length;
  const scottsRule = Math.pow(n, -1 / 6) * stdDev;

  return Math.max(scottsRule, 0.0005); // Minimum bandwidth to avoid division by zero
}

/**
 * Calculate bounding box from residential polygons
 */
function calculatePolygonBounds(
  residentialPolygons: ResidentialPolygon[]
): { north: number; south: number; east: number; west: number } {
  if (residentialPolygons.length === 0) {
    return { north: 43.1, south: 42.9, east: -78.9, west: -79.1 };
  }

  let north = -Infinity;
  let south = Infinity;
  let east = -Infinity;
  let west = Infinity;

  for (const polygon of residentialPolygons) {
    for (const [lng, lat] of polygon.coordinates) {
      north = Math.max(north, lat);
      south = Math.min(south, lat);
      east = Math.max(east, lng);
      west = Math.min(west, lng);
    }
  }

  return { north, south, east, west };
}

/**
 * Generate KDE heatmap clipped to residential polygon boundaries
 * Only renders heatmap cells that fall within residential areas
 */
export function generateClippedResidentialHeatmap(
  deliveryPoints: DeliveryPoint[],
  residentialPolygons: ResidentialPolygon[],
  gridResolution: number = 50
): ClippedHeatmapData {
  if (deliveryPoints.length === 0 || residentialPolygons.length === 0) {
    return {
      gridPoints: [],
      maxIntensity: 0,
      minIntensity: 0,
      bounds: { north: 0, south: 0, east: 0, west: 0 },
      polygonBounds: { north: 0, south: 0, east: 0, west: 0 },
    };
  }

  // Convert delivery points to [lng, lat] format
  const dataPoints: Array<[number, number]> = deliveryPoints.map(p => [p.longitude, p.latitude]);

  // Calculate polygon bounds
  const polygonBounds = calculatePolygonBounds(residentialPolygons);

  // Add small padding to bounds
  const padding = 0.001;
  const bounds = {
    north: polygonBounds.north + padding,
    south: polygonBounds.south - padding,
    east: polygonBounds.east + padding,
    west: polygonBounds.west - padding,
  };

  // Calculate grid cell size
  const latRange = bounds.north - bounds.south;
  const lngRange = bounds.east - bounds.west;
  const cellLat = latRange / gridResolution;
  const cellLng = lngRange / gridResolution;

  // Calculate bandwidth for KDE
  const bandwidth = calculateBandwidth(dataPoints);

  // Generate grid points and calculate KDE values
  const gridPoints: ClippedHeatmapCell[] = [];
  let maxIntensity = 0;
  let minIntensity = Infinity;

  for (let i = 0; i < gridResolution; i++) {
    for (let j = 0; j < gridResolution; j++) {
      const lat = bounds.south + i * cellLat + cellLat / 2;
      const lng = bounds.west + j * cellLng + cellLng / 2;

      // Only calculate KDE for points within residential areas
      if (isPointInResidentialArea(lat, lng, residentialPolygons)) {
        const intensity = gaussianKDE([lng, lat], dataPoints, bandwidth);

        gridPoints.push({
          lat,
          lng,
          intensity,
        });

        maxIntensity = Math.max(maxIntensity, intensity);
        minIntensity = Math.min(minIntensity, intensity);
      }
    }
  }

  // Normalize intensities to 0-1 range
  if (maxIntensity > 0) {
    for (const point of gridPoints) {
      point.intensity = point.intensity / maxIntensity;
    }
  }

  return {
    gridPoints,
    maxIntensity: maxIntensity > 0 ? 1 : 0, // Normalized
    minIntensity: minIntensity === Infinity ? 0 : minIntensity / maxIntensity,
    bounds,
    polygonBounds,
  };
}

/**
 * Convert clipped heatmap data to Leaflet heatmap format
 */
export function convertToLeafletFormat(heatmapData: ClippedHeatmapData): Array<[number, number, number]> {
  return heatmapData.gridPoints.map(point => [point.lat, point.lng, point.intensity]);
}
