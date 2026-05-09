import { describe, it, expect } from 'vitest';
import { analyzeCompetitorBuffers } from './bufferAnalysis';

describe('bufferAnalysis', () => {
  const mockOrders = [
    {
      id: 1,
      customerLatitude: 42.9052,
      customerLongitude: -78.9233,
      deliveryTime: 25,
      customerAddress: '123 Main St',
    },
    {
      id: 2,
      customerLatitude: 42.9100,
      customerLongitude: -78.9100,
      deliveryTime: 30,
      customerAddress: '456 Oak Ave',
    },
    {
      id: 3,
      customerLatitude: 42.8900,
      customerLongitude: -79.0500,
      deliveryTime: 35,
      customerAddress: '789 Elm St',
    },
  ];

  const mockCompetitors = [
    {
      id: 1,
      name: 'Pizza Place',
      latitude: 42.9052,
      longitude: -78.9233,
      type: 'restaurant',
      hasDelivery: true,
    },
    {
      id: 2,
      name: 'Burger Joint',
      latitude: 42.9100,
      longitude: -78.9100,
      type: 'fast_food',
      hasDelivery: true,
    },
  ];

  it('should calculate buffer analysis with selected competitors', () => {
    const result = analyzeCompetitorBuffers(mockOrders, mockCompetitors, 1);

    expect(result.totalOrders).toBe(3);
    expect(result.selectedCompetitorsCount).toBe(2);
    expect(result.bufferRadiusKm).toBe(1);
    expect(result.ordersInsideBuffer + result.ordersOutsideBuffer).toBe(3);
    expect(result.percentageInside + result.percentageOutside).toBeCloseTo(100, 1);
  });

  it('should return 0% inside buffer when no competitors selected', () => {
    const result = analyzeCompetitorBuffers(mockOrders, [], 1);

    expect(result.selectedCompetitorsCount).toBe(0);
    expect(result.ordersInsideBuffer).toBe(0);
    expect(result.ordersOutsideBuffer).toBe(3);
    expect(result.percentageInside).toBe(0);
    expect(result.percentageOutside).toBe(100);
  });

  it('should return 0% inside buffer when no orders provided', () => {
    const result = analyzeCompetitorBuffers([], mockCompetitors, 1);

    expect(result.totalOrders).toBe(0);
    expect(result.ordersInsideBuffer).toBe(0);
    expect(result.ordersOutsideBuffer).toBe(0);
    expect(result.percentageInside).toBe(0);
    expect(result.percentageOutside).toBe(0);
  });

  it('should handle different buffer radius values', () => {
    const result1 = analyzeCompetitorBuffers(mockOrders, mockCompetitors, 0.5);
    const result2 = analyzeCompetitorBuffers(mockOrders, mockCompetitors, 2);

    expect(result1.bufferRadiusKm).toBe(0.5);
    expect(result2.bufferRadiusKm).toBe(2);
    // Larger radius should capture more orders
    expect(result2.ordersInsideBuffer).toBeGreaterThanOrEqual(result1.ordersInsideBuffer);
  });

  it('should handle orders with string coordinates', () => {
    const ordersWithStringCoords = [
      {
        id: 1,
        customerLatitude: '42.9052',
        customerLongitude: '-78.9233',
        deliveryTime: 25,
        customerAddress: '123 Main St',
      },
    ];

    const result = analyzeCompetitorBuffers(ordersWithStringCoords, mockCompetitors, 1);

    expect(result.totalOrders).toBe(1);
    expect(result.percentageInside + result.percentageOutside).toBeCloseTo(100, 1);
  });

  it('should ignore orders with invalid coordinates', () => {
    const ordersWithInvalidCoords = [
      {
        id: 1,
        customerLatitude: 0,
        customerLongitude: 0,
        deliveryTime: 25,
        customerAddress: '123 Main St',
      },
      {
        id: 2,
        customerLatitude: 42.9052,
        customerLongitude: -78.9233,
        deliveryTime: 30,
        customerAddress: '456 Oak Ave',
      },
    ];

    const result = analyzeCompetitorBuffers(ordersWithInvalidCoords, mockCompetitors, 1);

    // Should only count the valid order
    expect(result.totalOrders).toBe(2);
  });

  it('should calculate percentages correctly', () => {
    const result = analyzeCompetitorBuffers(mockOrders, mockCompetitors, 1);

    const expectedPercentageInside = (result.ordersInsideBuffer / result.totalOrders) * 100;
    const expectedPercentageOutside = (result.ordersOutsideBuffer / result.totalOrders) * 100;

    expect(result.percentageInside).toBeCloseTo(expectedPercentageInside, 1);
    expect(result.percentageOutside).toBeCloseTo(expectedPercentageOutside, 1);
  });
});
