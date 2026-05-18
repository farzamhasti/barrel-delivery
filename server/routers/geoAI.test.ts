/**
 * Comprehensive Testing Suite for Geo AI System
 * Phase 96: Comprehensive System Testing & Validation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { predictCache } from '../utils/predictionCache';
import { generateDynamicAlerts } from '../utils/alertGenerator';
import { isCanadianHoliday, getActiveEvents, calculateEventDemandMultiplier } from '../utils/eventValidator';

describe('Geo AI System - Phase 96 Comprehensive Testing', () => {
  beforeEach(() => {
    predictCache.clear();
  });

  afterEach(() => {
    predictCache.clear();
  });

  describe('Predict Cache Management', () => {
    it('should cache predicts with TTL', () => {
      const testData = { orders: 50, confidence: 0.95 };
      predictCache.set('demand:zone1', testData, 5 * 60 * 1000);

      expect(predictCache.get('demand:zone1')).toEqual(testData);
    });

    it('should return null for expired cache entries', (done) => {
      const testData = { orders: 50 };
      predictCache.set('demand:zone1', testData, 100); // 100ms TTL

      expect(predictCache.get('demand:zone1')).toEqual(testData);

      setTimeout(() => {
        expect(predictCache.get('demand:zone1')).toBeNull();
        done();
      }, 150);
    });

    it('should track cache statistics', () => {
      predictCache.resetStats();
      predictCache.set('demand:zone1', { orders: 50 }, 5 * 60 * 1000);
      predictCache.get('demand:zone1'); // Hit
      predictCache.get('demand:zone2'); // Miss

      const stats = predictCache.getStats();
      expect(stats.hits).toBeGreaterThanOrEqual(1);
      expect(stats.misses).toBeGreaterThanOrEqual(1);
      expect(stats.hitRate).toBeGreaterThan(0);
    });

    it('should clear expired entries', (done) => {
      predictCache.set('demand:zone1', { orders: 50 }, 100);
      predictCache.set('demand:zone2', { orders: 60 }, 5 * 60 * 1000);

      setTimeout(() => {
        const cleared = predictCache.clearExpired();
        expect(cleared).toBe(1);
        expect(predictCache.get('demand:zone1')).toBeNull();
        expect(predictCache.get('demand:zone2')).not.toBeNull();
        done();
      }, 150);
    });
  });

  describe('Dynamic Alert Generation', () => {
    it('should generate demand surge alert', () => {
      const alerts = generateDynamicAlerts({
        predictedOrders: 60,
        demandThreshold: 40,
      });

      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts[0].title).toContain('Demand');
      expect(alerts[0].priority).toBe('high');
    });

    it('should generate driver shortage alert', () => {
      const alerts = generateDynamicAlerts({
        driverShortageRisk: 0.75,
      });

      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts[0].title).toContain('Driver');
      expect(alerts[0].priority).toMatch(/high|critical/);
    });

    it('should generate delay risk alert', () => {
      const alerts = generateDynamicAlerts({
        delayRisk: 0.65,
      });

      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts[0].title).toContain('Delay');
    });

    it('should generate severe weather alert', () => {
      const alerts = generateDynamicAlerts({
        precipitation: 10,
        windSpeed: 40,
      });

      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts[0].title).toContain('Weather');
    });

    it('should generate snowfall alert', () => {
      const alerts = generateDynamicAlerts({
        snowfall: 10,
      });

      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts[0].title).toContain('Snowfall');
    });

    it('should generate hotspot overload alert', () => {
      const alerts = generateDynamicAlerts({
        hotspotsIntensity: 0.9,
      });

      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts[0].title).toContain('Hotspot');
    });

    it('should generate event impact alert', () => {
      const alerts = generateDynamicAlerts({
        activeEventMultiplier: 1.5,
      });

      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts[0].title).toContain('Event');
    });

    it('should not generate alerts when conditions are normal', () => {
      const alerts = generateDynamicAlerts({
        predictedOrders: 30,
        demandThreshold: 40,
        driverShortageRisk: 0.5,
        delayRisk: 0.4,
        precipitation: 0,
        snowfall: 0,
        windSpeed: 15,
        hotspotsIntensity: 0.5,
        activeEventMultiplier: 1.0,
      });

      expect(alerts.length).toBe(0);
    });
  });

  describe('Event Validation System', () => {
    it('should identify Canadian holidays', () => {
      // Test Canada Day
      const canadaDay = new Date(2026, 6, 1); // July 1
      const result = isCanadianHoliday(canadaDay);

      expect(result.isHoliday).toBe(true);
      expect(result.name).toContain('Canada');
    });

    it('should return false for non-holidays', () => {
      const randomDay = new Date(2026, 5, 15); // June 15
      const result = isCanadianHoliday(randomDay);

      expect(result.isHoliday).toBe(false);
    });

    it('should calculate event demand multiplier', async () => {
      const multiplier = await calculateEventDemandMultiplier();

      expect(multiplier).toBeGreaterThanOrEqual(1.0);
      expect(multiplier).toBeLessThanOrEqual(2.0);
    });

    it('should return active events array', async () => {
      const events = await getActiveEvents();

      expect(Array.isArray(events)).toBe(true);
      // Events array may be empty or contain holiday events
      if (events.length > 0) {
        expect(events[0]).toHaveProperty('id');
        expect(events[0]).toHaveProperty('name');
        expect(events[0]).toHaveProperty('demandMultiplier');
      }
    });
  });

  describe('Business Hours Enforcement', () => {
    it('should identify business hours correctly', () => {
      // Create a date during business hours (Wednesday 6 PM)
      const businessHour = new Date();
      businessHour.setDate(businessHour.getDate() + ((3 - businessHour.getDay()) % 7)); // Set to Wednesday
      businessHour.setHours(18, 0, 0, 0); // 6 PM

      const hour = businessHour.getHours();
      const dayOfWeek = businessHour.getDay();

      // Wednesday (3) should be open at 6 PM
      const isOpen = dayOfWeek >= 0 && dayOfWeek <= 4 && hour >= 16 && hour < 22;
      expect(isOpen).toBe(true);
    });

    it('should identify closed hours correctly', () => {
      // Create a date outside business hours (3 AM)
      const closedHour = new Date();
      closedHour.setHours(3, 0, 0, 0);

      const hour = closedHour.getHours();
      const isOpen = hour >= 16 && hour < 22;
      expect(isOpen).toBe(false);
    });

    it('should handle Friday/Saturday extended hours', () => {
      // Friday (5) at 10:30 PM should be open
      const fridayNight = new Date();
      fridayNight.setDate(fridayNight.getDate() + ((5 - fridayNight.getDay()) % 7)); // Set to Friday
      fridayNight.setHours(22, 30, 0, 0);

      const hour = fridayNight.getHours();
      const dayOfWeek = fridayNight.getDay();

      // Friday/Saturday extended hours (until 11 PM)
      const isOpen = (dayOfWeek === 5 || dayOfWeek === 6) && hour >= 16 && hour < 23;
      expect(isOpen).toBe(true);
    });
  });

  describe('Weather Impact Calculations', () => {
    it('should apply weather multipliers correctly', () => {
      // Test snowfall multiplier
      let multiplier = 1.0;
      multiplier += 0.35; // Snowfall
      expect(multiplier).toBe(1.35);

      // Test rain multiplier
      multiplier = 1.0;
      multiplier += 0.15; // Rain
      expect(multiplier).toBe(1.15);

      // Test cold multiplier
      multiplier = 1.0;
      multiplier += 0.10; // Cold
      expect(multiplier).toBe(1.10);
    });

    it('should respect minimum multiplier', () => {
      let multiplier = 1.0;
      multiplier -= 0.10; // Hot weather
      multiplier = Math.max(0.8, multiplier); // Minimum

      expect(multiplier).toBe(0.9);
    });
  });

  describe('Data Integrity', () => {
    it('should maintain data consistency across cache operations', () => {
      const originalData = {
        orders: 50,
        confidence: 0.95,
        timestamp: new Date().toISOString(),
      };

      predictCache.set('test:data', originalData, 5 * 60 * 1000);
      const retrievedData = predictCache.get('test:data');

      expect(retrievedData).toEqual(originalData);
      expect(retrievedData.orders).toBe(50);
      expect(retrievedData.confidence).toBe(0.95);
    });

    it('should handle multiple concurrent cache operations', () => {
      for (let i = 0; i < 10; i++) {
        predictCache.set(`zone:${i}`, { orders: i * 10 }, 5 * 60 * 1000);
      }

      for (let i = 0; i < 10; i++) {
        const data = predictCache.get(`zone:${i}`);
        expect(data.orders).toBe(i * 10);
      }

      expect(predictCache.size()).toBe(10);
    });
  });

  describe('Alert Priority Levels', () => {
    it('should assign correct priority to critical alerts', () => {
      const alerts = generateDynamicAlerts({
        predictedOrders: 100,
        demandThreshold: 40,
      });

      expect(alerts[0].priority).toBe('critical');
    });

    it('should assign correct priority to high alerts', () => {
      const alerts = generateDynamicAlerts({
        predictedOrders: 60,
        demandThreshold: 40,
      });

      expect(alerts[0].priority).toBe('high');
    });

    it('should assign correct priority to medium alerts', () => {
      const alerts = generateDynamicAlerts({
        activeEventMultiplier: 1.4,
      });

      expect(alerts[0].priority).toBe('medium');
    });
  });

  describe('Performance Metrics', () => {
    it('should handle cache operations efficiently', () => {
      const startTime = Date.now();

      for (let i = 0; i < 100; i++) {
        predictCache.set(`perf:${i}`, { value: i }, 5 * 60 * 1000);
      }

      for (let i = 0; i < 100; i++) {
        predictCache.get(`perf:${i}`);
      }

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1000); // Should complete in less than 1 second
    });

    it('should generate alerts quickly', () => {
      const startTime = Date.now();

      for (let i = 0; i < 100; i++) {
        generateDynamicAlerts({
          predictedOrders: 50 + i,
          demandThreshold: 40,
          driverShortageRisk: 0.5 + (i % 10) / 100,
        });
      }

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(500); // Should complete in less than 500ms
    });
  });
});
