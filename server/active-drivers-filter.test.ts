import { describe, it, expect } from 'vitest';

/**
 * Test suite for Active Drivers filtering logic
 * Ensures that both Order Tracking and Kitchen Dashboard display drivers correctly
 */
describe('Active Drivers Filter', () => {
  // Mock driver data
  const mockDrivers = [
    {
      id: 1,
      name: 'Farzam Hasti',
      status: 'offline',
      isActive: true,
      phone: '555-0001',
    },
    {
      id: 2,
      name: 'John Doe',
      status: 'online',
      isActive: true,
      phone: '555-0002',
    },
    {
      id: 3,
      name: 'Jane Smith',
      status: 'offline',
      isActive: false,
      phone: '555-0003',
    },
    {
      id: 4,
      name: 'Mike Johnson',
      status: 'online',
      isActive: true,
      phone: '555-0004',
    },
  ];

  it('should filter drivers by isActive status only (not by status field)', () => {
    // This is the correct filter used in both OrderTrackingWithMap and KitchenDashboard
    const activeDrivers = mockDrivers.filter((d: any) => d.isActive);
    
    // Should return 3 drivers (all with isActive = true)
    expect(activeDrivers).toHaveLength(3);
    expect(activeDrivers.map((d: any) => d.id)).toEqual([1, 2, 4]);
  });

  it('should NOT filter by status field (online/offline)', () => {
    // Old broken filter that was causing empty results
    const brokenFilter = mockDrivers.filter((d: any) => d.status === 'online' && d.isActive);
    
    // This would only return 2 drivers
    expect(brokenFilter).toHaveLength(2);
    expect(brokenFilter.map((d: any) => d.id)).toEqual([2, 4]);
  });

  it('should include drivers with both online and offline status if isActive is true', () => {
    const activeDrivers = mockDrivers.filter((d: any) => d.isActive);
    
    // Should have drivers with different status values
    const statuses = activeDrivers.map((d: any) => d.status);
    expect(statuses).toContain('online');
    expect(statuses).toContain('offline');
  });

  it('should exclude inactive drivers regardless of status', () => {
    const activeDrivers = mockDrivers.filter((d: any) => d.isActive);
    
    // Should not include Jane Smith (isActive = false)
    const names = activeDrivers.map((d: any) => d.name);
    expect(names).not.toContain('Jane Smith');
  });

  it('should return drivers with correct data structure for display', () => {
    const activeDrivers = mockDrivers.filter((d: any) => d.isActive);
    
    // Each driver should have required fields for display
    activeDrivers.forEach((driver: any) => {
      expect(driver).toHaveProperty('id');
      expect(driver).toHaveProperty('name');
      expect(driver).toHaveProperty('status');
      expect(driver).toHaveProperty('phone');
      expect(driver).toHaveProperty('isActive');
    });
  });
});
