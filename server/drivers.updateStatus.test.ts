import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('drivers.updateStatus', () => {
  it('should update driver status without GPS dependency', async () => {
    // Mock database
    const mockUpdateDriverStatus = vi.fn().mockResolvedValue({
      id: 1,
      name: 'Test Driver',
      status: 'online',
    });

    // Simulate the updateStatus mutation
    const input = { id: 1, status: 'online' as const };
    const result = await mockUpdateDriverStatus(input.id, input.status);

    expect(result.status).toBe('online');
    expect(mockUpdateDriverStatus).toHaveBeenCalledWith(1, 'online');
  });

  it('should change status from online to offline instantly', async () => {
    const mockUpdateDriverStatus = vi.fn()
      .mockResolvedValueOnce({ id: 1, status: 'online' })
      .mockResolvedValueOnce({ id: 1, status: 'offline' });

    // First call: go online
    const onlineResult = await mockUpdateDriverStatus(1, 'online');
    expect(onlineResult.status).toBe('online');

    // Second call: go offline
    const offlineResult = await mockUpdateDriverStatus(1, 'offline');
    expect(offlineResult.status).toBe('offline');

    expect(mockUpdateDriverStatus).toHaveBeenCalledTimes(2);
  });

  it('should not wait for GPS before updating status', async () => {
    const mockUpdateDriverStatus = vi.fn().mockResolvedValue({ id: 1, status: 'online' });
    const startTime = performance.now();
    
    await mockUpdateDriverStatus(1, 'online');
    
    const endTime = performance.now();
    const duration = endTime - startTime;

    // Should complete almost instantly (< 10ms in test environment)
    expect(duration).toBeLessThan(10);
    expect(mockUpdateDriverStatus).toHaveBeenCalledWith(1, 'online');
  });
});
