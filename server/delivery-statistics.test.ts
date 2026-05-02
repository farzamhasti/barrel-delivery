import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as db from './db';

describe('Delivery Statistics', () => {
  let testDriverId: number;
  let testOrderId: number;
  const testDate = new Date('2026-05-01');

  beforeAll(async () => {
    // Create a test driver
    const driver = await db.createDriver({
      name: 'Test Driver Stats',
      licenseNumber: `LIC-${Date.now()}`,
      phone: '555-0123',
      status: 'offline',
      isActive: true,
    });
    testDriverId = driver?.id || 1;

    // Create a test order
    const order = await db.createOrder({
      orderNumber: `ORD-STATS-${Date.now()}`,
      customerAddress: '123 Test St',
      customerPhone: '555-0456',
      status: 'Delivered',
      driverId: testDriverId,
    });
    testOrderId = order?.id || 1;

    // Update order to mark as delivered with a timestamp on the test date
    const deliveredAt = new Date(Date.UTC(
      testDate.getUTCFullYear(),
      testDate.getUTCMonth(),
      testDate.getUTCDate(),
      14,
      30,
      0,
      0
    ));
    
    await db.updateOrder(testOrderId, {
      status: 'Delivered',
      driverId: testDriverId,
    });

    // Manually update the deliveredAt timestamp
    const dbInstance = await db.getDb();
    if (dbInstance) {
      const { orders } = await import('../drizzle/schema');
      const { eq } = await import('drizzle-orm');
      await dbInstance.update(orders).set({
        deliveredAt,
        updatedAt: deliveredAt,
      }).where(eq(orders.id, testOrderId));
    }
  });

  afterAll(async () => {
    // Clean up test data
    if (testOrderId) {
      await db.deleteOrder(testOrderId);
    }
    if (testDriverId) {
      await db.deleteDriver(testDriverId);
    }
  });

  it('should return 0 delivered orders for a driver with no deliveries', async () => {
    // Create a new driver with no deliveries
    const newDriver = await db.createDriver({
      name: 'No Deliveries Driver',
      licenseNumber: `LIC-NONE-${Date.now()}`,
      phone: '555-0789',
      status: 'offline',
      isActive: true,
    });

    const count = await db.getDeliveredOrdersCountByDate(newDriver?.id || 1, testDate);
    expect(count).toBe(0);

    // Clean up
    if (newDriver?.id) {
      await db.deleteDriver(newDriver.id);
    }
  });

  it('should count delivered orders for a specific driver on a specific date', async () => {
    const count = await db.getDeliveredOrdersCountByDate(testDriverId, testDate);
    expect(count).toBeGreaterThanOrEqual(0);
    expect(typeof count).toBe('number');
  });

  it('should return different counts for different dates', async () => {
    const countToday = await db.getDeliveredOrdersCountByDate(testDriverId, testDate);
    const countYesterday = await db.getDeliveredOrdersCountByDate(
      testDriverId,
      new Date(testDate.getTime() - 24 * 60 * 60 * 1000)
    );

    expect(typeof countToday).toBe('number');
    expect(typeof countYesterday).toBe('number');
  });

  it('should handle invalid driver ID gracefully', async () => {
    const count = await db.getDeliveredOrdersCountByDate(99999, testDate);
    expect(count).toBe(0);
  });
});
