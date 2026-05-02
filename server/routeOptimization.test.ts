import { describe, it, expect, vi } from 'vitest';
import { calculateReturnTime, formatReturnTimeMinutes } from './routeOptimization';

describe('Route Optimization Service', () => {
  describe('formatReturnTimeMinutes', () => {
    it('should format seconds to minutes correctly', () => {
      expect(formatReturnTimeMinutes(60)).toBe('1 minutes');
      expect(formatReturnTimeMinutes(120)).toBe('2 minutes');
      expect(formatReturnTimeMinutes(90)).toBe('2 minutes');
      expect(formatReturnTimeMinutes(30)).toBe('1 minutes');
    });

    it('should round up partial minutes', () => {
      expect(formatReturnTimeMinutes(61)).toBe('2 minutes');
      expect(formatReturnTimeMinutes(119)).toBe('2 minutes');
    });
  });

  describe('calculateReturnTime', () => {
    it('should return zero time when no valid orders provided', async () => {
      const mockApiKey = 'test-key';
      const result = await calculateReturnTime(
        'Restaurant Address',
        [],
        mockApiKey
      );

      expect(result.totalReturnTime).toBe(0);
      expect(result.deliverySequence).toEqual([]);
      expect(result.breakdown.pickupTime).toBe(0);
      expect(result.breakdown.deliveryHandlingTime).toBe(0);
      expect(result.breakdown.travelTime).toBe(0);
    });

    it('should filter out orders without on_the_way status', async () => {
      const mockApiKey = 'test-key';
      const orders = [
        {
          id: 1,
          customerAddress: '123 Main St',
          status: 'delivered',
          driverId: 1,
        },
        {
          id: 2,
          customerAddress: '456 Oak Ave',
          status: 'pending',
          driverId: 1,
        },
      ];

      const result = await calculateReturnTime(
        'Restaurant Address',
        orders,
        mockApiKey
      );

      expect(result.totalReturnTime).toBe(0);
      expect(result.deliverySequence).toEqual([]);
    });

    it('should filter out orders with null addresses', async () => {
      const mockApiKey = 'test-key';
      const orders = [
        {
          id: 1,
          customerAddress: null,
          status: 'on_the_way',
          driverId: 1,
        },
      ];

      const result = await calculateReturnTime(
        'Restaurant Address',
        orders,
        mockApiKey
      );

      expect(result.totalReturnTime).toBe(0);
      expect(result.deliverySequence).toEqual([]);
    });

    it('should calculate fixed times correctly', async () => {
      // Note: This test would need mocking of Google Maps API
      // For now, we test the structure
      const mockApiKey = 'test-key';
      const orders = [
        {
          id: 1,
          customerAddress: '123 Main St',
          status: 'on_the_way',
          driverId: 1,
        },
      ];

      // Mock the fetch to avoid actual API calls
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              status: 'OK',
              routes: [
                {
                  legs: [
                    {
                      distance: { value: 5000 },
                      duration: { value: 600 },
                      duration_in_traffic: { value: 720 },
                    },
                  ],
                },
              ],
            }),
        } as any)
      );

      try {
        const result = await calculateReturnTime(
          'Restaurant Address',
          orders,
          mockApiKey
        );

        // Fixed times: 30s pickup + 90s delivery = 120s
        expect(result.breakdown.pickupTime).toBe(30);
        expect(result.breakdown.deliveryHandlingTime).toBe(90);
        // Travel time should be calculated from API
        expect(result.breakdown.travelTime).toBeGreaterThan(0);
        expect(result.totalReturnTime).toBeGreaterThan(120);
      } finally {
        vi.restoreAllMocks();
      }
    });

    it('should handle multiple orders with correct handling time', async () => {
      const mockApiKey = 'test-key';
      const orders = [
        {
          id: 1,
          customerAddress: '123 Main St',
          status: 'on_the_way',
          driverId: 1,
        },
        {
          id: 2,
          customerAddress: '456 Oak Ave',
          status: 'on_the_way',
          driverId: 1,
        },
        {
          id: 3,
          customerAddress: '789 Pine Rd',
          status: 'on_the_way',
          driverId: 1,
        },
      ];

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              status: 'OK',
              routes: [
                {
                  legs: [
                    {
                      distance: { value: 5000 },
                      duration: { value: 600 },
                      duration_in_traffic: { value: 720 },
                    },
                  ],
                },
              ],
            }),
        } as any)
      );

      try {
        const result = await calculateReturnTime(
          'Restaurant Address',
          orders,
          mockApiKey
        );

        // Fixed times: 30s pickup + (90s * 3 orders) = 300s
        expect(result.breakdown.pickupTime).toBe(30);
        expect(result.breakdown.deliveryHandlingTime).toBe(270);
        expect(result.deliverySequence.length).toBe(3);
      } finally {
        vi.restoreAllMocks();
      }
    });
  });
});
