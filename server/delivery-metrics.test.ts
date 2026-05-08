import { describe, it, expect } from 'vitest';

describe('Delivery Metrics Calculations', () => {
  // Helper function to calculate time differences
  function calculateMetrics(createdAt: Date, readyAt: Date | null, onTheWayAt: Date | null, deliveredAt: Date) {
    const waitTime = readyAt ? Math.floor((readyAt.getTime() - createdAt.getTime()) / 1000) : 0;
    const readyTime = onTheWayAt && readyAt ? Math.floor((onTheWayAt.getTime() - readyAt.getTime()) / 1000) : 0;
    const enRouteTime = deliveredAt && onTheWayAt ? Math.floor((deliveredAt.getTime() - onTheWayAt.getTime()) / 1000) : 0;
    const totalTime = deliveredAt ? Math.floor((deliveredAt.getTime() - createdAt.getTime()) / 1000) : 0;
    
    return { waitTime, readyTime, enRouteTime, totalTime };
  }

  it('should calculate pending time correctly (order creation to ready)', () => {
    const created = new Date('2026-05-07T10:00:00Z');
    const ready = new Date('2026-05-07T10:05:20Z'); // 5 minutes 20 seconds later
    const onTheWay = new Date('2026-05-07T10:10:00Z');
    const delivered = new Date('2026-05-07T10:20:15Z');

    const metrics = calculateMetrics(created, ready, onTheWay, delivered);
    
    expect(metrics.waitTime).toBe(320); // 5 * 60 + 20 = 320 seconds
  });

  it('should calculate ready time correctly (ready to on the way)', () => {
    const created = new Date('2026-05-07T10:00:00Z');
    const ready = new Date('2026-05-07T10:05:20Z');
    const onTheWay = new Date('2026-05-07T10:10:00Z'); // 4 minutes 40 seconds after ready
    const delivered = new Date('2026-05-07T10:20:15Z');

    const metrics = calculateMetrics(created, ready, onTheWay, delivered);
    
    expect(metrics.readyTime).toBe(280); // 4 * 60 + 40 = 280 seconds
  });

  it('should calculate on the way time correctly (assigned to delivered)', () => {
    const created = new Date('2026-05-07T10:00:00Z');
    const ready = new Date('2026-05-07T10:05:20Z');
    const onTheWay = new Date('2026-05-07T10:10:00Z');
    const delivered = new Date('2026-05-07T10:20:15Z'); // 10 minutes 15 seconds after on the way

    const metrics = calculateMetrics(created, ready, onTheWay, delivered);
    
    expect(metrics.enRouteTime).toBe(615); // 10 * 60 + 15 = 615 seconds
  });

  it('should calculate total time correctly (creation to delivery)', () => {
    const created = new Date('2026-05-07T10:00:00Z');
    const ready = new Date('2026-05-07T10:05:20Z');
    const onTheWay = new Date('2026-05-07T10:10:00Z');
    const delivered = new Date('2026-05-07T10:20:15Z'); // 20 minutes 15 seconds after creation

    const metrics = calculateMetrics(created, ready, onTheWay, delivered);
    
    expect(metrics.totalTime).toBe(1215); // 20 * 60 + 15 = 1215 seconds
  });

  it('should sum component times to equal total time', () => {
    const created = new Date('2026-05-07T10:00:00Z');
    const ready = new Date('2026-05-07T10:05:20Z');
    const onTheWay = new Date('2026-05-07T10:10:00Z');
    const delivered = new Date('2026-05-07T10:20:15Z');

    const metrics = calculateMetrics(created, ready, onTheWay, delivered);
    
    // Total should equal sum of all components
    const componentSum = metrics.waitTime + metrics.readyTime + metrics.enRouteTime;
    expect(metrics.totalTime).toBe(componentSum);
  });

  it('should handle missing status history gracefully', () => {
    const created = new Date('2026-05-07T10:00:00Z');
    const delivered = new Date('2026-05-07T10:20:15Z');

    const metrics = calculateMetrics(created, null, null, delivered);
    
    expect(metrics.waitTime).toBe(0);
    expect(metrics.readyTime).toBe(0);
    expect(metrics.enRouteTime).toBe(0);
    expect(metrics.totalTime).toBe(1215);
  });
});
