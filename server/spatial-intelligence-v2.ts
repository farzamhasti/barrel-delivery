/**
 * Spatial Intelligence Module - Phase 27.3
 * Advanced GeoMarketing & Spatial Competition Analysis
 * 
 * Implements:
 * - Grid-based spatial clustering (500m cells)
 * - Competitor proximity analysis
 * - Growth opportunity scoring
 * - Underserved zone detection
 * - Heatmap generation
 */

import { getDb } from './db';
import { orders, competitors } from '../drizzle/schema';
import { eq, gte, lte, and } from 'drizzle-orm';

// Constants
const GRID_CELL_SIZE_KM = 0.5; // 500 meters
const DELIVERY_TIME_TARGET_MINUTES = 20;
const UNDERSERVED_THRESHOLD_MINUTES = DELIVERY_TIME_TARGET_MINUTES + 5; // >25 min
const HIGH_COMPETITION_THRESHOLD = 3; // >= 3 competitors
const GROWING_DEMAND_MIN_ORDERS = 5;
const GROWING_DEMAND_MAX_COMPETITORS = 2;
const GROWING_DEMAND_MIN_SCORE = 0.6;

// Types
export interface OrderLocation {
  id: number;
  latitude: number;
  longitude: number;
  area?: string;
  deliveryTimeMinutes?: number;
  createdAt: Date;
}

export interface CompetitorLocation {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  type: string;
  distanceFromRestaurantKm: number;
}

export interface GridCell {
  gridCellId: string;
  centroidLat: number;
  centroidLng: number;
  orderCount: number;
  orders: OrderLocation[];
  avgDeliveryTimeMinutes: number;
  competitorCount: number;
  competitors: CompetitorLocation[];
  isUnderserved: boolean;
  isHighCompetition: boolean;
  isGrowingDemand: boolean;
  growthScore: number;
  zoneType: string;
}

export interface SpatialAnalysisResult {
  gridCells: GridCell[];
  competitors: CompetitorLocation[];
  insights: string[];
  timestamp: Date;
  analysisType: string;
  gridCellCount: number;
  totalOrders: number;
  totalCompetitors: number;
}

/**
 * Calculate Haversine distance between two coordinates
 */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in km
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
 * Get grid cell ID for coordinates
 */
export function getGridCellId(lat: number, lng: number): string {
  const gridLat = Math.floor(lat / GRID_CELL_SIZE_KM) * GRID_CELL_SIZE_KM;
  const gridLng = Math.floor(lng / GRID_CELL_SIZE_KM) * GRID_CELL_SIZE_KM;
  return `grid_${gridLat.toFixed(3)}_${gridLng.toFixed(3)}`;
}

/**
 * Get grid cell centroid
 */
export function getGridCentroid(gridCellId: string): { lat: number; lng: number } {
  const parts = gridCellId.split('_');
  const lat = parseFloat(parts[1]) + GRID_CELL_SIZE_KM / 2;
  const lng = parseFloat(parts[2]) + GRID_CELL_SIZE_KM / 2;
  return { lat, lng };
}

/**
 * Cluster delivery orders into grid cells
 */
export function clusterDeliveryOrders(
  orders: OrderLocation[],
  restaurantLat: number,
  restaurantLng: number
): Map<string, GridCell> {
  const gridCells = new Map<string, GridCell>();

  for (const order of orders) {
    const gridCellId = getGridCellId(order.latitude, order.longitude);

    if (!gridCells.has(gridCellId)) {
      const centroid = getGridCentroid(gridCellId);
      gridCells.set(gridCellId, {
        gridCellId,
        centroidLat: centroid.lat,
        centroidLng: centroid.lng,
        orderCount: 0,
        orders: [],
        avgDeliveryTimeMinutes: 0,
        competitorCount: 0,
        competitors: [],
        isUnderserved: false,
        isHighCompetition: false,
        isGrowingDemand: false,
        growthScore: 0,
        zoneType: 'neutral',
      });
    }

    const cell = gridCells.get(gridCellId)!;
    cell.orders.push(order);
    cell.orderCount++;
  }

  // Calculate average delivery time per cell
  gridCells.forEach((cell) => {
    if (cell.orders.length > 0) {
      const totalTime = cell.orders.reduce((sum, o: OrderLocation) => sum + (o.deliveryTimeMinutes || 0), 0);
      cell.avgDeliveryTimeMinutes = totalTime / cell.orders.length;
    }
  });

  return gridCells;
}

/**
 * Analyze competitor proximity for each grid cell
 */
export function analyzeCompetitorProximity(
  gridCells: Map<string, GridCell>,
  competitors: CompetitorLocation[]
): void {
  const COMPETITOR_PROXIMITY_KM = 1; // Consider competitors within 1 km of cell centroid

  gridCells.forEach((cell) => {
    const nearbyCompetitors = competitors.filter((comp: CompetitorLocation) => {
      const distance = haversineDistance(
        cell.centroidLat,
        cell.centroidLng,
        comp.latitude,
        comp.longitude
      );
      return distance <= COMPETITOR_PROXIMITY_KM;
    });

    cell.competitors = nearbyCompetitors;
    cell.competitorCount = nearbyCompetitors.length;
  });
}

/**
 * Calculate growth scores for grid cells
 */
export function calculateGrowthScores(gridCells: Map<string, GridCell>): void {
  gridCells.forEach((cell) => {
    // Growth score formula (0-1 scale):
    // 40% order density (normalized to max 10 orders)
    // 35% delivery efficiency (inverse of time, normalized to 20-min target)
    // 25% competition factor (inverse, fewer competitors = higher score)

    const orderDensityScore = Math.min(cell.orderCount / 10, 1); // 0-1
    const efficiencyScore = Math.max(0, 1 - cell.avgDeliveryTimeMinutes / 30); // 0-1, inverse
    const competitionScore = Math.max(0, 1 - cell.competitorCount / 5); // 0-1, inverse

    cell.growthScore =
      orderDensityScore * 0.4 + efficiencyScore * 0.35 + competitionScore * 0.25;

    // Classify zones
    cell.isUnderserved = cell.avgDeliveryTimeMinutes > UNDERSERVED_THRESHOLD_MINUTES;
    cell.isHighCompetition = cell.competitorCount >= HIGH_COMPETITION_THRESHOLD;
    cell.isGrowingDemand =
      cell.orderCount >= GROWING_DEMAND_MIN_ORDERS &&
      cell.competitorCount <= GROWING_DEMAND_MAX_COMPETITORS &&
      cell.growthScore >= GROWING_DEMAND_MIN_SCORE;

    // Zone type classification
    if (cell.isGrowingDemand) {
      cell.zoneType = 'growing_demand';
    } else if (cell.isUnderserved && !cell.isHighCompetition) {
      cell.zoneType = 'underserved';
    } else if (cell.isHighCompetition && cell.orderCount > 5) {
      cell.zoneType = 'high_competition_high_demand';
    } else if (cell.isHighCompetition) {
      cell.zoneType = 'high_competition';
    } else if (cell.avgDeliveryTimeMinutes <= DELIVERY_TIME_TARGET_MINUTES) {
      cell.zoneType = 'efficient';
    } else {
      cell.zoneType = 'neutral';
    }
  });
}

/**
 * Generate strategic insights from spatial analysis
 */
export function generateSpatialInsights(
  gridCells: Map<string, GridCell>,
  competitors: CompetitorLocation[]
): string[] {
  const insights: string[] = [];

  // Count zone types
  let growingDemandCount = 0;
  let underservedCount = 0;
  let highCompetitionCount = 0;
  let efficientCount = 0;

  gridCells.forEach((cell) => {
    if (cell.isGrowingDemand) growingDemandCount++;
    if (cell.isUnderserved) underservedCount++;
    if (cell.isHighCompetition) highCompetitionCount++;
    if (cell.zoneType === 'efficient') efficientCount++;
  });

  // Generate insights
  if (growingDemandCount > 0) {
    insights.push(
      `🚀 Found ${growingDemandCount} high-growth opportunity zones with strong demand and low competition.`
    );
  }

  if (underservedCount > 0) {
    insights.push(
      `⏱️ Identified ${underservedCount} underserved zones with delivery times exceeding 25 minutes. Opportunity for expansion.`
    );
  }

  if (highCompetitionCount > 0) {
    insights.push(
      `🏪 ${highCompetitionCount} zones have 3+ competitors. Consider differentiation strategy.`
    );
  }

  if (efficientCount > 0) {
    insights.push(
      `✅ ${efficientCount} zones maintain delivery times at or below 20-minute target. Maintain current service levels.`
    );
  }

  const totalCompetitors = competitors.length;
  if (totalCompetitors > 0) {
    insights.push(
      `📊 Competitive landscape: ${totalCompetitors} food businesses identified within service area.`
    );
  }

  const totalOrders = Array.from(gridCells.values()).reduce((sum: number, cell: GridCell) => sum + cell.orderCount, 0);
  if (totalOrders > 0) {
    const avgOrdersPerCell = totalOrders / gridCells.size;
    insights.push(
      `📈 Average order density: ${avgOrdersPerCell.toFixed(1)} orders per grid cell.`
    );
  }

  return insights;
}

/**
 * Export spatial analysis results
 */
export function exportSpatialAnalysis(
  gridCells: Map<string, GridCell>,
  competitors: CompetitorLocation[],
  insights: string[]
): SpatialAnalysisResult {
  const totalOrders = Array.from(gridCells.values()).reduce((sum: number, cell: GridCell) => sum + cell.orderCount, 0);

  return {
    gridCells: Array.from(gridCells.values()),
    competitors,
    insights,
    timestamp: new Date(),
    analysisType: 'full_spatial_analysis',
    gridCellCount: gridCells.size,
    totalOrders,
    totalCompetitors: competitors.length,
  };
}

/**
 * Main spatial analysis orchestration
 */
export async function performSpatialAnalysis(
  orders: OrderLocation[],
  competitors: CompetitorLocation[],
  restaurantLat: number,
  restaurantLng: number
): Promise<SpatialAnalysisResult> {
  // Step 1: Cluster orders into grid cells
  const gridCells = clusterDeliveryOrders(orders, restaurantLat, restaurantLng);

  // Step 2: Analyze competitor proximity
  analyzeCompetitorProximity(gridCells, competitors);

  // Step 3: Calculate growth scores
  calculateGrowthScores(gridCells);

  // Step 4: Generate insights
  const insights = generateSpatialInsights(gridCells, competitors);

  // Step 5: Export results
  return exportSpatialAnalysis(gridCells, competitors, insights);
}
