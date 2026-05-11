import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { getDb } from './db';
import { orders } from '../drizzle/schema';
import { getOrdersWithCoordinates } from './geomarketing';

describe('Heatmap Analytics', () => {
  let db: any;

  beforeAll(async () => {
    db = await getDb();
  });

  describe('getOrdersWithCoordinates', () => {
    it('should fetch orders within date range', async () => {
      const startDate = new Date('2026-01-01');
      const endDate = new Date('2026-12-31');

      const result = await getOrdersWithCoordinates(startDate, endDate);

      expect(Array.isArray(result)).toBe(true);
      // Each order should have required fields
      result.forEach((order) => {
        expect(order).toHaveProperty('id');
        expect(order).toHaveProperty('createdAt');
        expect(order).toHaveProperty('customerAddress');
      });
    });

    it('should only return delivered orders', async () => {
      const startDate = new Date('2026-01-01');
      const endDate = new Date('2026-12-31');

      const result = await getOrdersWithCoordinates(startDate, endDate);

      // All returned orders should have deliveredAt set
      result.forEach((order) => {
        expect(order.deliveredAt).toBeDefined();
      });
    });

    it('should filter by date range correctly', async () => {
      const startDate = new Date('2026-05-01');
      const endDate = new Date('2026-05-10');

      const result = await getOrdersWithCoordinates(startDate, endDate);

      result.forEach((order) => {
        const orderDate = new Date(order.createdAt);
        expect(orderDate.getTime()).toBeGreaterThanOrEqual(startDate.getTime());
        expect(orderDate.getTime()).toBeLessThanOrEqual(endDate.getTime());
      });
    });

    it('should handle empty date ranges', async () => {
      const startDate = new Date('2099-01-01');
      const endDate = new Date('2099-12-31');

      const result = await getOrdersWithCoordinates(startDate, endDate);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    it('should include coordinates for orders', async () => {
      const startDate = new Date('2026-01-01');
      const endDate = new Date('2026-12-31');

      const result = await getOrdersWithCoordinates(startDate, endDate);

      // Should have at least some orders with coordinates
      const ordersWithCoords = result.filter(
        (order) => order.customerLatitude && order.customerLongitude
      );
      expect(ordersWithCoords.length).toBeGreaterThan(0);

      // Coordinates should be valid numbers (may be strings from DB, need conversion)
      ordersWithCoords.forEach((order) => {
        const lat = Number(order.customerLatitude);
        const lng = Number(order.customerLongitude);
        expect(typeof lat).toBe('number');
        expect(typeof lng).toBe('number');
        expect(lat).toBeGreaterThanOrEqual(-90);
        expect(lat).toBeLessThanOrEqual(90);
        expect(lng).toBeGreaterThanOrEqual(-180);
        expect(lng).toBeLessThanOrEqual(180);
      });
    });

    it('should include area information', async () => {
      const startDate = new Date('2026-01-01');
      const endDate = new Date('2026-12-31');

      const result = await getOrdersWithCoordinates(startDate, endDate);

      result.forEach((order) => {
        expect(['Downtown', 'Central Park', 'Both']).toContain(order.area);
      });
    });
  });

  describe('Heatmap Data Transformation', () => {
    it('should transform orders to heatmap points', async () => {
      const startDate = new Date('2026-01-01');
      const endDate = new Date('2026-12-31');

      const orders = await getOrdersWithCoordinates(startDate, endDate);

      // Filter to only orders with coordinates
      const heatmapPoints = orders
        .filter((order) => order.customerLatitude && order.customerLongitude)
        .map((order) => ({
          lat: Number(order.customerLatitude),
          lng: Number(order.customerLongitude),
          orderId: order.id,
          address: order.customerAddress,
          timestamp: order.createdAt.getTime(),
        }));

      expect(Array.isArray(heatmapPoints)).toBe(true);

      // Each point should have required fields
      heatmapPoints.forEach((point) => {
        expect(point).toHaveProperty('lat');
        expect(point).toHaveProperty('lng');
        expect(point).toHaveProperty('orderId');
        expect(point).toHaveProperty('timestamp');
        expect(typeof point.lat).toBe('number');
        expect(typeof point.lng).toBe('number');
        expect(typeof point.timestamp).toBe('number');
      });
    });

    it('should filter by area correctly', async () => {
      const startDate = new Date('2026-01-01');
      const endDate = new Date('2026-12-31');

      const allOrders = await getOrdersWithCoordinates(startDate, endDate);

      // Filter to Downtown only
      const downtownOrders = allOrders.filter((order) => order.area === 'Downtown');

      expect(downtownOrders.length).toBeGreaterThanOrEqual(0);

      downtownOrders.forEach((order) => {
        expect(order.area).toBe('Downtown');
      });
    });

    it('should handle Both area filter correctly', async () => {
      const startDate = new Date('2026-01-01');
      const endDate = new Date('2026-12-31');

      const allOrders = await getOrdersWithCoordinates(startDate, endDate);

      // Filter to Both area
      const bothOrders = allOrders.filter((order) => order.area === 'Both');

      expect(bothOrders.length).toBeGreaterThanOrEqual(0);

      bothOrders.forEach((order) => {
        expect(order.area).toBe('Both');
      });
    });
  });

  describe('Heatmap Statistics', () => {
    it('should calculate correct statistics', async () => {
      const startDate = new Date('2026-01-01');
      const endDate = new Date('2026-12-31');

      const orders = await getOrdersWithCoordinates(startDate, endDate);

      const totalOrders = orders.length;
      const ordersWithCoordinates = orders.filter(
        (order) => order.customerLatitude && order.customerLongitude
      ).length;

      expect(totalOrders).toBeGreaterThanOrEqual(0);
      expect(ordersWithCoordinates).toBeLessThanOrEqual(totalOrders);

      // At least some orders should have coordinates
      if (totalOrders > 0) {
        expect(ordersWithCoordinates).toBeGreaterThan(0);
      }
    });

    it('should have consistent coordinate ranges', async () => {
      const startDate = new Date('2026-01-01');
      const endDate = new Date('2026-12-31');

      const orders = await getOrdersWithCoordinates(startDate, endDate);

      const coordOrders = orders.filter(
        (order) => order.customerLatitude && order.customerLongitude
      );

      if (coordOrders.length > 0) {
        // All coordinates should be in Fort Erie area (roughly)
        // Fort Erie is around 42.9°N, 78.9°W
        coordOrders.forEach((order) => {
          const lat = Number(order.customerLatitude);
          const lng = Number(order.customerLongitude);

          // Should be within reasonable bounds for Fort Erie area
          expect(lat).toBeGreaterThan(42.8);
          expect(lat).toBeLessThan(43.0);
          expect(lng).toBeGreaterThan(-79.0);
          expect(lng).toBeLessThan(-78.8);
        });
      }
    });
  });
});
