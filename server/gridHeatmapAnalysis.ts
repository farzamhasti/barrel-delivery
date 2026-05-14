import { getDb } from './db';
import { orders } from '../drizzle/schema';
import { sql } from 'drizzle-orm';

// Fort Erie boundary (accurate coordinates)
const FORT_ERIE_BOUNDS = {
  minLat: 42.8,
  maxLat: 43.0,
  minLon: -79.3,
  maxLon: -79.0,
};

// Grid cell size in degrees (approximately 0.5 km at this latitude)
const GRID_CELL_SIZE = 0.005;

interface GridCell {
  lat: number;
  lon: number;
  centerLat: number;
  centerLon: number;
  demandScore: number;
  orderCount: number;
  avgDeliveryTime: number;
  avgWaitingTime: number;
  classification: 'Very High' | 'High' | 'Average' | 'Weak' | 'Underperforming';
  color: string;
}

interface HeatmapData {
  cells: GridCell[];
  cityStats: {
    totalOrders: number;
    avgDeliveryTime: number;
    avgWaitingTime: number;
    avgDemandScore: number;
  };
  interpretation: string;
}

/**
 * Create grid overlay of Fort Erie area
 */
function createGridCells(): { lat: number; lon: number }[] {
  const cells: { lat: number; lon: number }[] = [];
  
  for (let lat = FORT_ERIE_BOUNDS.minLat; lat < FORT_ERIE_BOUNDS.maxLat; lat += GRID_CELL_SIZE) {
    for (let lon = FORT_ERIE_BOUNDS.minLon; lon < FORT_ERIE_BOUNDS.maxLon; lon += GRID_CELL_SIZE) {
      cells.push({
        lat,
        lon,
      });
    }
  }
  
  return cells;
}

/**
 * Get orders within a grid cell
 */
async function getOrdersInCell(
  minLat: number,
  maxLat: number,
  minLon: number,
  maxLon: number,
  startDate: Date,
  endDate: Date
): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  const result = await db
    .select({
      count: sql<number>`COUNT(*)`,
      avgDeliveryTime: sql<number>`AVG(TIMESTAMPDIFF(MINUTE, ${orders.createdAt}, ${orders.deliveredAt}))`,
      avgWaitingTime: sql<number>`AVG(TIMESTAMPDIFF(MINUTE, ${orders.createdAt}, ${orders.readyAt}))`,
    })
    .from(orders)
    .where(
      sql`
        ${orders.status} = 'delivered'
        AND ${orders.customerLatitude} >= ${minLat}
        AND ${orders.customerLatitude} < ${maxLat}
        AND ${orders.customerLongitude} >= ${minLon}
        AND ${orders.customerLongitude} < ${maxLon}
        AND ${orders.createdAt} >= ${startDate}
        AND ${orders.createdAt} < ${endDate}
      `
    );

  return result;
}

/**
 * Calculate city-wide statistics
 */
async function calculateCityStats(startDate: Date, endDate: Date) {
  const db = await getDb();
  if (!db) return { totalOrders: 0, avgDeliveryTime: 0, avgWaitingTime: 0 };
  const result = await db
    .select({
      totalOrders: sql<number>`COUNT(*)`,
      avgDeliveryTime: sql<number>`AVG(TIMESTAMPDIFF(MINUTE, ${orders.createdAt}, ${orders.deliveredAt}))`,
      avgWaitingTime: sql<number>`AVG(TIMESTAMPDIFF(MINUTE, ${orders.createdAt}, ${orders.readyAt}))`,
    })
    .from(orders)
    .where(
      sql`
        ${orders.status} = 'delivered'
        AND ${orders.customerLatitude} >= ${FORT_ERIE_BOUNDS.minLat}
        AND ${orders.customerLatitude} < ${FORT_ERIE_BOUNDS.maxLat}
        AND ${orders.customerLongitude} >= ${FORT_ERIE_BOUNDS.minLon}
        AND ${orders.customerLongitude} < ${FORT_ERIE_BOUNDS.maxLon}
        AND ${orders.createdAt} >= ${startDate}
        AND ${orders.createdAt} < ${endDate}
      `
    );

  const stats = result[0] || { totalOrders: 0, avgDeliveryTime: 0, avgWaitingTime: 0 };
  return {
    totalOrders: Number(stats.totalOrders) || 0,
    avgDeliveryTime: Number(stats.avgDeliveryTime) || 0,
    avgWaitingTime: Number(stats.avgWaitingTime) || 0,
  };
}

/**
 * Classify demand based on score
 */
function classifyDemand(score: number): { classification: string; color: string } {
  if (score >= 80) return { classification: 'Very High', color: '#8B0000' }; // Dark red
  if (score >= 60) return { classification: 'High', color: '#FF4500' }; // Orange-red
  if (score >= 40) return { classification: 'Average', color: '#FFD700' }; // Gold
  if (score >= 20) return { classification: 'Weak', color: '#90EE90' }; // Light green
  return { classification: 'Underperforming', color: '#E8E8E8' }; // Light gray
}

/**
 * Calculate demand score for a cell (0-100)
 */
function calculateDemandScore(
  orderCount: number,
  cityOrderDensity: number,
  avgDeliveryTime: number,
  cityAvgDeliveryTime: number
): number {
  // Normalize order count relative to city average
  const densityRatio = cityOrderDensity > 0 ? orderCount / cityOrderDensity : 0;
  const densityScore = Math.min(densityRatio * 50, 50); // 0-50 points

  // Normalize delivery time (faster delivery = higher score)
  const deliveryRatio = cityAvgDeliveryTime > 0 ? cityAvgDeliveryTime / avgDeliveryTime : 1;
  const deliveryScore = Math.min(deliveryRatio * 50, 50); // 0-50 points

  return Math.round(densityScore + deliveryScore);
}

/**
 * Generate spatial interpretation
 */
function generateInterpretation(cells: GridCell[], cityStats: any): string {
  const veryHighCount = cells.filter(c => c.classification === 'Very High').length;
  const highCount = cells.filter(c => c.classification === 'High').length;
  const averageCount = cells.filter(c => c.classification === 'Average').length;

  if (veryHighCount > 0) {
    return `High-demand zones identified: ${veryHighCount} region(s). Geographic demand analysis for Fort Erie: Demand is concentrated in specific high-performing areas with significant variations across the city.`;
  } else if (highCount > 0) {
    return `Moderate demand distribution: ${highCount} region(s) with elevated demand. Geographic demand analysis for Fort Erie: Demand is relatively distributed with some localized variations.`;
  } else {
    return `Even demand distribution across Fort Erie with ${averageCount} region(s) showing average demand. Geographic demand analysis for Fort Erie: Demand is relatively evenly distributed across Fort Erie with minor localized variations.`;
  }
}

/**
 * Analyze relative demand using grid-based heatmap
 */
export async function analyzeGridHeatmap(startDate: Date, endDate: Date): Promise<HeatmapData> {
  try {
    // Get city-wide statistics
    const cityStats = await calculateCityStats(startDate, endDate);
    const cityOrderDensity = cityStats.totalOrders > 0 ? cityStats.totalOrders / 40 : 0; // ~40 grid cells

    // Create grid cells
    const gridCells = createGridCells();

    // Analyze each cell
    const cells: GridCell[] = [];
    for (const cell of gridCells) {
      const maxLat = cell.lat + GRID_CELL_SIZE;
      const maxLon = cell.lon + GRID_CELL_SIZE;

      const cellData = await getOrdersInCell(cell.lat, maxLat, cell.lon, maxLon, startDate, endDate);
      const stats = cellData[0] || { count: 0, avgDeliveryTime: 0, avgWaitingTime: 0 };

      const orderCount = Number(stats.count) || 0;
      const avgDeliveryTime = Number(stats.avgDeliveryTime) || cityStats.avgDeliveryTime;
      const avgWaitingTime = Number(stats.avgWaitingTime) || cityStats.avgWaitingTime;

      const demandScore = calculateDemandScore(
        orderCount,
        cityOrderDensity,
        avgDeliveryTime,
        cityStats.avgDeliveryTime
      );

      const { classification, color } = classifyDemand(demandScore);

      cells.push({
        lat: cell.lat,
        lon: cell.lon,
        centerLat: cell.lat + GRID_CELL_SIZE / 2,
        centerLon: cell.lon + GRID_CELL_SIZE / 2,
        demandScore,
        orderCount,
        avgDeliveryTime: Math.round(avgDeliveryTime),
        avgWaitingTime: Math.round(avgWaitingTime),
        classification: classification as any,
        color,
      });
    }

    // Calculate average demand score
    const avgDemandScore = cells.length > 0 ? Math.round(cells.reduce((sum, c) => sum + c.demandScore, 0) / cells.length) : 0;

    // Generate interpretation
    const interpretation = generateInterpretation(cells, cityStats);

    return {
      cells,
      cityStats: {
        totalOrders: cityStats.totalOrders,
        avgDeliveryTime: Math.round(cityStats.avgDeliveryTime),
        avgWaitingTime: Math.round(cityStats.avgWaitingTime),
        avgDemandScore,
      },
      interpretation,
    };
  } catch (error) {
    console.error('[analyzeGridHeatmap] Error:', error);
    return {
      cells: [],
      cityStats: {
        totalOrders: 0,
        avgDeliveryTime: 0,
        avgWaitingTime: 0,
        avgDemandScore: 0,
      },
      interpretation: 'Unable to analyze demand data',
    };
  }
}
