/**
 * Heatmap Engine
 * Generates live, predictive, risk, and driver shortage heatmaps
 */

import { logger } from '../utils/logger';

interface HeatmapPoint {
  lat: number;
  lng: number;
  intensity: number;
  weight?: number;
}

interface HeatmapGrid {
  cells: HeatmapCell[][];
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  resolution: number; // Grid cell size in km
  timestamp: number;
}

interface HeatmapCell {
  lat: number;
  lng: number;
  intensity: number; // 0-1
  count: number;
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  driverDensity?: number;
}

interface Heatmap {
  id: string;
  type: 'demand' | 'risk' | 'driver_shortage' | 'predictive';
  grid: HeatmapGrid;
  maxIntensity: number;
  minIntensity: number;
  metadata: Record<string, any>;
  timestamp: number;
}

/**
 * Heatmap Generation Engine
 */
export class HeatmapEngine {
  private gridResolution: number; // km per cell
  private fortErieNorth: number = 43.1; // Approximate Fort Erie bounds
  private fortErieSouth: number = 42.9;
  private fortErieEast: number = -79.0;
  private fortErieWest: number = -79.3;

  constructor(gridResolution: number = 0.5) {
    this.gridResolution = gridResolution;
  }

  /**
   * Generate live demand heatmap from current orders
   */
  generateLiveDemandHeatmap(orders: Array<{ lat: number; lng: number; demand?: number }>): Heatmap {
    const points: HeatmapPoint[] = orders.map((order) => ({
      lat: order.lat,
      lng: order.lng,
      intensity: order.demand || 1,
    }));

    const grid = this.generateGrid(points);

    return {
      id: `heatmap_demand_${Date.now()}`,
      type: 'demand',
      grid,
      maxIntensity: Math.max(...grid.cells.flat().map((c) => c.intensity)),
      minIntensity: Math.min(...grid.cells.flat().map((c) => c.intensity)),
      metadata: {
        source: 'live_orders',
        orderCount: orders.length,
      },
      timestamp: Date.now(),
    };
  }

  /**
   * Generate predictive demand heatmap
   */
  generatePredictiveDemandHeatmap(
    predicts: Array<{ lat: number; lng: number; predictedDemand: number; confidence: number }>
  ): Heatmap {
    const points: HeatmapPoint[] = predicts.map((pred) => ({
      lat: pred.lat,
      lng: pred.lng,
      intensity: pred.predictedDemand * pred.confidence,
      weight: pred.confidence,
    }));

    const grid = this.generateGrid(points);

    return {
      id: `heatmap_predictive_${Date.now()}`,
      type: 'predictive',
      grid,
      maxIntensity: Math.max(...grid.cells.flat().map((c) => c.intensity)),
      minIntensity: Math.min(...grid.cells.flat().map((c) => c.intensity)),
      metadata: {
        source: 'ml_predicts',
        predictCount: predicts.length,
      },
      timestamp: Date.now(),
    };
  }

  /**
   * Generate risk heatmap
   */
  generateRiskHeatmap(
    orders: Array<{
      lat: number;
      lng: number;
      deliveryTime: number;
      maxTime: number;
    }>
  ): Heatmap {
    const points: HeatmapPoint[] = orders.map((order) => {
      const riskScore = Math.max(0, (order.deliveryTime - order.maxTime) / order.maxTime);
      return {
        lat: order.lat,
        lng: order.lng,
        intensity: Math.min(1, riskScore),
      };
    });

    const grid = this.generateGrid(points);

    // Add risk levels to cells
    for (const row of grid.cells) {
      for (const cell of row) {
        if (cell.intensity > 0.7) cell.riskLevel = 'critical';
        else if (cell.intensity > 0.5) cell.riskLevel = 'high';
        else if (cell.intensity > 0.3) cell.riskLevel = 'medium';
        else cell.riskLevel = 'low';
      }
    }

    return {
      id: `heatmap_risk_${Date.now()}`,
      type: 'risk',
      grid,
      maxIntensity: Math.max(...grid.cells.flat().map((c) => c.intensity)),
      minIntensity: Math.min(...grid.cells.flat().map((c) => c.intensity)),
      metadata: {
        source: 'delivery_risk',
        orderCount: orders.length,
      },
      timestamp: Date.now(),
    };
  }

  /**
   * Generate driver shortage heatmap
   */
  generateDriverShortageHeatmap(
    demandPoints: Array<{ lat: number; lng: number; demand: number }>,
    driverLocations: Array<{ lat: number; lng: number }>
  ): Heatmap {
    const grid = this.initializeGrid();

    // Add demand intensity
    for (const demand of demandPoints) {
      const cell = this.getGridCell(grid, demand.lat, demand.lng);
      if (cell) {
        cell.intensity += demand.demand;
        cell.count++;
      }
    }

    // Subtract driver density
    for (const driver of driverLocations) {
      const cell = this.getGridCell(grid, driver.lat, driver.lng);
      if (cell) {
        cell.driverDensity = (cell.driverDensity || 0) + 1;
      }
    }

    // Calculate shortage score
    for (const row of grid.cells) {
      for (const cell of row) {
        const driverDensity = cell.driverDensity || 0;
        const demandDensity = cell.count > 0 ? cell.intensity / cell.count : 0;

        if (driverDensity === 0) {
          cell.intensity = Math.min(1, demandDensity);
        } else {
          cell.intensity = Math.max(0, demandDensity - driverDensity / 5);
        }
      }
    }

    return {
      id: `heatmap_driver_shortage_${Date.now()}`,
      type: 'driver_shortage',
      grid,
      maxIntensity: Math.max(...grid.cells.flat().map((c) => c.intensity)),
      minIntensity: Math.min(...grid.cells.flat().map((c) => c.intensity)),
      metadata: {
        source: 'driver_availability',
        demandPoints: demandPoints.length,
        driverCount: driverLocations.length,
      },
      timestamp: Date.now(),
    };
  }

  /**
   * Generate grid from points
   */
  private generateGrid(points: HeatmapPoint[]): HeatmapGrid {
    const grid = this.initializeGrid();

    // Add points to grid
    for (const point of points) {
      const cell = this.getGridCell(grid, point.lat, point.lng);
      if (cell) {
        cell.intensity += point.intensity * (point.weight || 1);
        cell.count++;
      }
    }

    // Normalize intensities
    const maxIntensity = Math.max(...grid.cells.flat().map((c) => c.intensity || 0));
    if (maxIntensity > 0) {
      for (const row of grid.cells) {
        for (const cell of row) {
          cell.intensity = cell.intensity / maxIntensity;
        }
      }
    }

    // Apply Gaussian blur for smoothing
    this.applyGaussianBlur(grid);

    return grid;
  }

  /**
   * Initialize empty grid
   */
  private initializeGrid(): HeatmapGrid {
    const latCells = Math.ceil((this.fortErieNorth - this.fortErieSouth) / this.gridResolution);
    const lngCells = Math.ceil((this.fortErieEast - this.fortErieWest) / this.gridResolution);

    const cells: HeatmapCell[][] = [];
    for (let i = 0; i < latCells; i++) {
      const row: HeatmapCell[] = [];
      for (let j = 0; j < lngCells; j++) {
        const lat = this.fortErieNorth - i * this.gridResolution;
        const lng = this.fortErieWest + j * this.gridResolution;

        row.push({
          lat,
          lng,
          intensity: 0,
          count: 0,
        });
      }
      cells.push(row);
    }

    return {
      cells,
      bounds: {
        north: this.fortErieNorth,
        south: this.fortErieSouth,
        east: this.fortErieEast,
        west: this.fortErieWest,
      },
      resolution: this.gridResolution,
      timestamp: Date.now(),
    };
  }

  /**
   * Get grid cell for coordinates
   */
  private getGridCell(grid: HeatmapGrid, lat: number, lng: number): HeatmapCell | null {
    const i = Math.floor((grid.bounds.north - lat) / grid.resolution);
    const j = Math.floor((lng - grid.bounds.west) / grid.resolution);

    if (i >= 0 && i < grid.cells.length && j >= 0 && j < grid.cells[0].length) {
      return grid.cells[i][j];
    }

    return null;
  }

  /**
   * Apply Gaussian blur for smoothing
   */
  private applyGaussianBlur(grid: HeatmapGrid): void {
    const kernel = [
      [0.0625, 0.125, 0.0625],
      [0.125, 0.25, 0.125],
      [0.0625, 0.125, 0.0625],
    ];

    const blurred = grid.cells.map((row) => [...row.map((cell) => ({ ...cell }))]);

    for (let i = 1; i < grid.cells.length - 1; i++) {
      for (let j = 1; j < grid.cells[i].length - 1; j++) {
        let sum = 0;
        for (let ki = 0; ki < 3; ki++) {
          for (let kj = 0; kj < 3; kj++) {
            sum += grid.cells[i - 1 + ki][j - 1 + kj].intensity * kernel[ki][kj];
          }
        }
        blurred[i][j].intensity = sum;
      }
    }

    for (let i = 0; i < grid.cells.length; i++) {
      for (let j = 0; j < grid.cells[i].length; j++) {
        grid.cells[i][j].intensity = blurred[i][j].intensity;
      }
    }
  }

  /**
   * Get heatmap as GeoJSON
   */
  heatmapToGeoJSON(heatmap: Heatmap): any {
    const features = [];

    for (const row of heatmap.grid.cells) {
      for (const cell of row) {
        if (cell.intensity > 0) {
          features.push({
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [cell.lng, cell.lat],
            },
            properties: {
              intensity: cell.intensity,
              count: cell.count,
              riskLevel: cell.riskLevel,
              driverDensity: cell.driverDensity,
            },
          });
        }
      }
    }

    return {
      type: 'FeatureCollection',
      features,
    };
  }

  /**
   * Get heatmap statistics
   */
  getHeatmapStats(heatmap: Heatmap): {
    cellCount: number;
    activeCells: number;
    averageIntensity: number;
    hotspotCount: number;
  } {
    const cells = heatmap.grid.cells.flat();
    const activeCells = cells.filter((c) => c.intensity > 0);
    const hotspots = cells.filter((c) => c.intensity > 0.7);
    const avgIntensity = activeCells.reduce((sum, c) => sum + c.intensity, 0) / Math.max(activeCells.length, 1);

    return {
      cellCount: cells.length,
      activeCells: activeCells.length,
      averageIntensity: avgIntensity,
      hotspotCount: hotspots.length,
    };
  }
}

// Export singleton instance
export const heatmapEngine = new HeatmapEngine(0.5);
