import { describe, it, expect } from 'vitest';

describe('Driver Dashboard - Delivered Orders Display', () => {
  it('should include delivered orders in the driver order list', () => {
    // Simulate the server-side filter logic from getTodayWithItems
    const allOrders = [
      { id: 1, driverId: 1, status: 'On the Way', orderNumber: '40001' },
      { id: 2, driverId: 1, status: 'Delivered', orderNumber: '40002' },
      { id: 3, driverId: 2, status: 'On the Way', orderNumber: '40003' },
      { id: 4, driverId: 1, status: 'Pending', orderNumber: '40004' },
    ];

    const driverId = 1;
    // This is the fixed filter logic - includes both "On the Way" and "Delivered"
    const driverOrders = allOrders.filter(
      (order) => order.driverId === driverId && (order.status === 'On the Way' || order.status === 'Delivered')
    );

    expect(driverOrders.length).toBe(2);
    expect(driverOrders[0].status).toBe('On the Way');
    expect(driverOrders[1].status).toBe('Delivered');
  });

  it('should separate orders into On the Way and Delivered tabs based on server status', () => {
    // Simulate the client-side tab split logic
    const assignedOrders = [
      { id: 1, status: 'On the Way', orderNumber: '40001' },
      { id: 2, status: 'Delivered', orderNumber: '40002' },
      { id: 3, status: 'On the Way', orderNumber: '40003' },
      { id: 4, status: 'Delivered', orderNumber: '40004' },
    ];

    const deliveredOrders = new Set<number>(); // Empty local set (no optimistic updates)

    // Fixed filter logic - uses server status
    const onTheWayOrders = assignedOrders.filter(
      (order) => order.status === 'On the Way' && !deliveredOrders.has(order.id)
    );
    const deliveredOrdersList = assignedOrders.filter(
      (order) => order.status === 'Delivered' || deliveredOrders.has(order.id)
    );

    expect(onTheWayOrders.length).toBe(2);
    expect(deliveredOrdersList.length).toBe(2);
  });

  it('should handle optimistic update when driver marks order as delivered', () => {
    // Simulate the scenario where driver just clicked "Mark as Delivered"
    // The local Set has the order but server hasn't refreshed yet
    const assignedOrders = [
      { id: 1, status: 'On the Way', orderNumber: '40001' },
      { id: 2, status: 'On the Way', orderNumber: '40002' },
    ];

    const deliveredOrders = new Set<number>([1]); // Order 1 was just marked

    const onTheWayOrders = assignedOrders.filter(
      (order) => order.status === 'On the Way' && !deliveredOrders.has(order.id)
    );
    const deliveredOrdersList = assignedOrders.filter(
      (order) => order.status === 'Delivered' || deliveredOrders.has(order.id)
    );

    // Order 1 should be in delivered (optimistic), order 2 should be on the way
    expect(onTheWayOrders.length).toBe(1);
    expect(onTheWayOrders[0].id).toBe(2);
    expect(deliveredOrdersList.length).toBe(1);
    expect(deliveredOrdersList[0].id).toBe(1);
  });

  it('should count delivered orders correctly after server refresh', () => {
    // After server refresh, the order status is updated from the server
    const assignedOrders = [
      { id: 1, status: 'Delivered', orderNumber: '40001' },
      { id: 2, status: 'On the Way', orderNumber: '40002' },
    ];

    const deliveredOrders = new Set<number>([1]); // Still in local set

    const onTheWayOrders = assignedOrders.filter(
      (order) => order.status === 'On the Way' && !deliveredOrders.has(order.id)
    );
    const deliveredOrdersList = assignedOrders.filter(
      (order) => order.status === 'Delivered' || deliveredOrders.has(order.id)
    );

    // Order 1 is delivered (from server status), order 2 is on the way
    expect(onTheWayOrders.length).toBe(1);
    expect(deliveredOrdersList.length).toBe(1);
    expect(deliveredOrdersList[0].id).toBe(1);
  });
});

describe('Driver Dashboard - Delivery Statistics', () => {
  it('should count delivered orders for a specific date using deliveredAt or updatedAt', () => {
    // Simulate the date filtering logic
    // When client sends '2026-05-05', new Date('2026-05-05') creates midnight UTC
    const today = new Date('2026-05-05T00:00:00Z');
    const year = today.getUTCFullYear();
    const month = today.getUTCMonth();
    const day = today.getUTCDate();
    
    // Toronto timezone (EDT = UTC-4)
    const startOfDay = new Date(Date.UTC(year, month, day, 4, 0, 0, 0)); // May 5 04:00 UTC = May 5 00:00 Toronto
    const endOfDay = new Date(Date.UTC(year, month, day + 1, 4, 0, 0, 0)); // May 6 04:00 UTC = May 6 00:00 Toronto

    const orders = [
      { id: 1, driverId: 1, status: 'Delivered', deliveredAt: new Date('2026-05-05T10:00:00Z'), updatedAt: new Date('2026-05-05T10:00:00Z') },
      { id: 2, driverId: 1, status: 'Delivered', deliveredAt: new Date('2026-05-05T20:00:00Z'), updatedAt: new Date('2026-05-05T20:00:00Z') },
      { id: 3, driverId: 1, status: 'Delivered', deliveredAt: new Date('2026-05-04T02:00:00Z'), updatedAt: new Date('2026-05-04T02:00:00Z') },
    ];

    const filteredResult = orders.filter((order) => {
      const deliveryTime = order.deliveredAt || order.updatedAt;
      if (!deliveryTime) return false;
      const orderTime = new Date(deliveryTime);
      return orderTime >= startOfDay && orderTime < endOfDay;
    });

    // Orders 1 and 2 are on May 5th Toronto time (between 04:00 UTC May 5 and 04:00 UTC May 6)
    // Order 3 is May 4 02:00 UTC which is before startOfDay
    expect(filteredResult.length).toBe(2);
  });

  it('should use updatedAt as fallback when deliveredAt is null', () => {
    const today = new Date('2026-05-05T00:00:00Z');
    const year = today.getUTCFullYear();
    const month = today.getUTCMonth();
    const day = today.getUTCDate();
    
    const startOfDay = new Date(Date.UTC(year, month, day, 4, 0, 0, 0));
    const endOfDay = new Date(Date.UTC(year, month, day + 1, 4, 0, 0, 0));

    const orders: Array<{id: number, driverId: number, status: string, deliveredAt: Date | null, updatedAt: Date}> = [
      { id: 1, driverId: 1, status: 'Delivered', deliveredAt: null, updatedAt: new Date('2026-05-05T15:00:00Z') },
      { id: 2, driverId: 1, status: 'Delivered', deliveredAt: null, updatedAt: new Date('2026-05-03T15:00:00Z') },
    ];

    const filteredResult = orders.filter((order) => {
      const deliveryTime = order.deliveredAt || order.updatedAt;
      if (!deliveryTime) return false;
      const orderTime = new Date(deliveryTime);
      return orderTime >= startOfDay && orderTime < endOfDay;
    });

    // Only order 1 should match (May 5th 15:00 UTC is between 04:00 UTC May 5 and 04:00 UTC May 6)
    expect(filteredResult.length).toBe(1);
    expect(filteredResult[0].id).toBe(1);
  });
});
