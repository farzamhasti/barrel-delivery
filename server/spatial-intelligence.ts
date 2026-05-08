/**
 * Phase 2: Spatial Intelligence Backend
 * Clustering algorithms, growth opportunity scoring, competitor proximity analysis
 */

interface OrderLocation {
  id: string;
  latitude: number;
  longitude: number;
  deliveredAt: Date | number;
  totalDeliveryTime: number;
  area: string;
}

interface Competitor {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  type: string;
  distance: number;
}

interface GridCell {
  gridX: number;
  gridY: number;
  centerLat: number;
  centerLng: number;
  orderCount: number;
  avgDeliveryTime: number;
  competitorCount: number;
  competitorDensity: number;
  growthScore: number;
  isUnderserved: boolean;
  isHighCompetition: boolean;
  isGrowingDemand: boolean;
}

const GRID_SIZE_KM = 0.5; // 500m grid cells
const TARGET_DELIVERY_TIME = 20; // minutes
const EARTH_RADIUS_KM = 6371;

/**
 * Haversine distance calculation
 */
function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

/**
 * Convert lat/lng to grid coordinates
 */
function getGridCoordinates(
  latitude: number,
  longitude: number,
  centerLat: number,
  centerLng: number
): { gridX: number; gridY: number } {
  // Approximate conversion: 1 degree ≈ 111 km
  const latKm = (latitude - centerLat) * 111;
  const lngKm = (longitude - centerLng) * 111 * Math.cos((centerLat * Math.PI) / 180);

  const gridX = Math.floor(latKm / GRID_SIZE_KM);
  const gridY = Math.floor(lngKm / GRID_SIZE_KM);

  return { gridX, gridY };
}

/**
 * Convert grid coordinates back to lat/lng
 */
function getGridCenter(
  gridX: number,
  gridY: number,
  centerLat: number,
  centerLng: number
): { latitude: number; longitude: number } {
  const latOffset = (gridX * GRID_SIZE_KM) / 111;
  const lngOffset = (gridY * GRID_SIZE_KM) / (111 * Math.cos((centerLat * Math.PI) / 180));

  return {
    latitude: centerLat + latOffset,
    longitude: centerLng + lngOffset,
  };
}

/**
 * Cluster delivery orders into grid cells
 */
export function clusterDeliveryOrders(
  orders: OrderLocation[],
  restaurantLat: number,
  restaurantLng: number
): Record<string, GridCell> {
  const gridCells: Record<string, GridCell> = {};

  for (const order of orders) {
    const { gridX, gridY } = getGridCoordinates(
      order.latitude,
      order.longitude,
      restaurantLat,
      restaurantLng
    );
    const key = `${gridX},${gridY}`;

    if (!gridCells[key]) {
      const center = getGridCenter(gridX, gridY, restaurantLat, restaurantLng);
      gridCells[key] = {
        gridX,
        gridY,
        centerLat: center.latitude,
        centerLng: center.longitude,
        orderCount: 0,
        avgDeliveryTime: 0,
        competitorCount: 0,
        competitorDensity: 0,
        growthScore: 0,
        isUnderserved: false,
        isHighCompetition: false,
        isGrowingDemand: false,
      };
    }

    const cell = gridCells[key];
    cell.orderCount += 1;
    cell.avgDeliveryTime =
      (cell.avgDeliveryTime * (cell.orderCount - 1) + order.totalDeliveryTime) /
      cell.orderCount;
  }

  return gridCells;
}

/**
 * Analyze competitor proximity for each grid cell
 */
export function analyzeCompetitorProximity(
  gridCells: Record<string, GridCell>,
  competitors: Competitor[]
): void {
  const CELL_RADIUS_KM = GRID_SIZE_KM * 1.5; // Consider competitors within 1.5x cell size

  Object.values(gridCells).forEach((cell) => {
    let competitorCount = 0;
    let totalCompetitorDistance = 0;

    for (const competitor of competitors) {
      const distance = haversineDistance(
        cell.centerLat,
        cell.centerLng,
        competitor.latitude,
        competitor.longitude
      );

      if (distance <= CELL_RADIUS_KM) {
        competitorCount += 1;
        totalCompetitorDistance += distance;
      }
    }

    cell.competitorCount = competitorCount;
    cell.competitorDensity =
      competitorCount > 0 ? competitorCount / (Math.PI * CELL_RADIUS_KM * CELL_RADIUS_KM) : 0;
  });
}

/**
 * Calculate growth opportunity score for each grid cell
 */
export function calculateGrowthScores(gridCells: Record<string, GridCell>): void {
  // Normalize metrics for scoring
  const cells = Object.values(gridCells);
  const orderCounts = cells.map((c) => c.orderCount);
  const deliveryTimes = cells.map((c) => c.avgDeliveryTime);
  const competitorDensities = cells.map((c) => c.competitorDensity);

  const maxOrders = Math.max(...orderCounts, 1);
  const maxDeliveryTime = Math.max(...deliveryTimes, 1);
  const maxCompetitorDensity = Math.max(...competitorDensities, 0.001);

  Object.values(gridCells).forEach((cell) => {
    // Score components (0-1 scale)
    const orderDensityScore = cell.orderCount / maxOrders; // Higher is better
    const deliveryEfficiencyScore =
      cell.avgDeliveryTime > 0
        ? Math.max(0, 1 - cell.avgDeliveryTime / (TARGET_DELIVERY_TIME * 1.5))
        : 0; // Higher is better
    const competitorScore = 1 - cell.competitorDensity / maxCompetitorDensity; // Lower competition is better

    // Weighted growth opportunity score
    cell.growthScore =
      orderDensityScore * 0.4 +
      deliveryEfficiencyScore * 0.35 +
      competitorScore * 0.25;

    // Classification
    cell.isUnderserved = cell.orderCount > 0 && cell.avgDeliveryTime > TARGET_DELIVERY_TIME;
    cell.isHighCompetition = cell.competitorCount >= 3;
    cell.isGrowingDemand =
      cell.orderCount >= 5 && cell.competitorCount <= 2 && cell.growthScore > 0.6;
  });
}

/**
 * Identify strategic insights from spatial analysis
 */
export function generateSpatialInsights(
  gridCells: Record<string, GridCell>,
  competitors: Competitor[]
): string[] {
  const insights: string[] = [];
  const cells = Object.values(gridCells);

  // Find top growth zones
  const topGrowthZones = cells
    .filter((c) => c.orderCount > 0)
    .sort((a, b) => b.growthScore - a.growthScore)
    .slice(0, 3);

  // Find underserved zones
  const underservedZones = cells.filter((c) => c.isUnderserved && c.orderCount > 0);

  // Find high-competition high-demand zones
  const competitiveZones = cells.filter((c) => c.isHighCompetition && c.orderCount > 3);

  // Generate insights
  if (topGrowthZones.length > 0) {
    const zone = topGrowthZones[0];
    insights.push(
      `Top growth opportunity: Zone at (${zone.centerLat.toFixed(4)}, ${zone.centerLng.toFixed(4)}) with ${zone.orderCount} orders and ${zone.competitorCount} competitors.`
    );
  }

  if (underservedZones.length > 0) {
    const avgDeliveryTime = (
      underservedZones.reduce((sum, z) => sum + z.avgDeliveryTime, 0) / underservedZones.length
    ).toFixed(1);
    insights.push(
      `${underservedZones.length} underserved zones detected with average delivery time of ${avgDeliveryTime} minutes (target: ${TARGET_DELIVERY_TIME}min).`
    );
  }

  if (competitiveZones.length > 0) {
    insights.push(
      `${competitiveZones.length} high-competition zones with strong demand detected. Consider aggressive marketing in these areas.`
    );
  }

  if (competitors.length > 0) {
    const avgCompetitorDistance = (
      competitors.reduce((sum, c) => sum + c.distance, 0) / competitors.length
    ).toFixed(2);
    insights.push(
      `Average competitor distance: ${avgCompetitorDistance} km. Market is moderately competitive.`
    );
  }

  return insights;
}

/**
 * Export spatial analysis results
 */
export function exportSpatialAnalysis(
  gridCells: Record<string, GridCell>,
  competitors: Competitor[],
  insights: string[]
) {
  return {
    gridCells: Object.values(gridCells),
    competitors,
    insights,
    timestamp: new Date(),
    analysisType: "spatial-intelligence-phase-2",
  };
}
