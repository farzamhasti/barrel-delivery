import { describe, it, expect } from 'vitest';
import {
  isPointInPolygon,
  generateRasterGrid,
  FORT_ERIE_BOUNDARY,
} from './boundaryRasterAnalysis';

describe('Boundary Raster Analysis', () => {
  describe('isPointInPolygon', () => {
    it('should return true for points inside the polygon', () => {
      // Test with a point that should be inside the Fort Erie boundary
      // Using a point from the center of the polygon
      const lat = 42.91;
      const lon = -78.98;
      const result = isPointInPolygon(lat, lon, FORT_ERIE_BOUNDARY);
      expect(result).toBe(true);
    });

    it('should return false for points outside the polygon', () => {
      // Test with a point clearly outside the boundary
      const lat = 42.80;
      const lon = -79.10;
      const result = isPointInPolygon(lat, lon, FORT_ERIE_BOUNDARY);
      expect(result).toBe(false);
    });

    it('should handle edge cases near polygon boundaries', () => {
      // Test with a point very close to the boundary
      const lat = 42.88;
      const lon = -79.02;
      const result = isPointInPolygon(lat, lon, FORT_ERIE_BOUNDARY);
      // Result depends on ray casting algorithm, but should not throw
      expect(typeof result).toBe('boolean');
    });

    it('should work with different polygon shapes', () => {
      const simpleSquare: [number, number][] = [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
        [0, 0],
      ];
      
      // Point inside square (note: lat is second param, lon is first)
      expect(isPointInPolygon(0.5, 0.5, simpleSquare)).toBe(true);
      
      // Point outside square
      expect(isPointInPolygon(2, 2, simpleSquare)).toBe(false);
    });
  });

  describe('generateRasterGrid', () => {
    it('should generate grid cells', () => {
      const cells = generateRasterGrid(30);
      expect(Array.isArray(cells)).toBe(true);
      expect(cells.length).toBeGreaterThan(0);
    });

    it('should generate cells with required properties', () => {
      const cells = generateRasterGrid(30);
      expect(cells.length).toBeGreaterThan(0);
      
      const cell = cells[0];
      expect(cell).toHaveProperty('lat');
      expect(cell).toHaveProperty('lon');
      expect(cell).toHaveProperty('id');
      expect(typeof cell.lat).toBe('number');
      expect(typeof cell.lon).toBe('number');
      expect(typeof cell.id).toBe('string');
    });

    it('should generate unique cell IDs', () => {
      const cells = generateRasterGrid(30);
      const ids = cells.map(c => c.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should generate cells within Fort Erie boundary', () => {
      const cells = generateRasterGrid(30);
      
      // All cells should be within or very close to the boundary
      const minLat = Math.min(...FORT_ERIE_BOUNDARY.map(p => p[1]));
      const maxLat = Math.max(...FORT_ERIE_BOUNDARY.map(p => p[1]));
      const minLon = Math.min(...FORT_ERIE_BOUNDARY.map(p => p[0]));
      const maxLon = Math.max(...FORT_ERIE_BOUNDARY.map(p => p[0]));
      
      for (const cell of cells) {
        expect(cell.lat).toBeGreaterThanOrEqual(minLat - 0.01);
        expect(cell.lat).toBeLessThanOrEqual(maxLat + 0.01);
        expect(cell.lon).toBeGreaterThanOrEqual(minLon - 0.01);
        expect(cell.lon).toBeLessThanOrEqual(maxLon + 0.01);
      }
    });

    it('should respect cell size parameter', () => {
      const cells500 = generateRasterGrid(500);
      const cells1000 = generateRasterGrid(1000);
      
      // Larger cell size should result in fewer cells
      expect(cells1000.length).toBeLessThan(cells500.length);
    });

    it('should generate reasonable number of cells for Fort Erie', () => {
      const cells = generateRasterGrid(); // Default 1000x1000m
      
      // Fort Erie is roughly 5km x 10km (0.045 degrees x 0.09 degrees)
      // With 1000m cells, we should have roughly (5000/1000) * (10000/1000) = ~50 cells
      // The actual boundary is complex, so we expect a small number of large cells
      expect(cells.length).toBeGreaterThan(5);
      expect(cells.length).toBeLessThan(500);
    });
  });

  describe('FORT_ERIE_BOUNDARY', () => {
    it('should be a valid polygon', () => {
      expect(Array.isArray(FORT_ERIE_BOUNDARY)).toBe(true);
      expect(FORT_ERIE_BOUNDARY.length).toBeGreaterThan(2);
    });

    it('should have valid coordinate pairs', () => {
      for (const coord of FORT_ERIE_BOUNDARY) {
        expect(Array.isArray(coord)).toBe(true);
        expect(coord.length).toBe(2);
        expect(typeof coord[0]).toBe('number'); // longitude
        expect(typeof coord[1]).toBe('number'); // latitude
        
        // Check reasonable ranges for Fort Erie, Ontario
        expect(coord[1]).toBeGreaterThan(42.8);
        expect(coord[1]).toBeLessThan(43.0);
        expect(coord[0]).toBeGreaterThan(-79.1);
        expect(coord[0]).toBeLessThan(-78.9);
      }
    });

    it('should be a closed polygon', () => {
      const first = FORT_ERIE_BOUNDARY[0];
      const last = FORT_ERIE_BOUNDARY[FORT_ERIE_BOUNDARY.length - 1];
      
      // First and last points should be the same (closed polygon)
      expect(first[0]).toBe(last[0]);
      expect(first[1]).toBe(last[1]);
    });
  });
});
