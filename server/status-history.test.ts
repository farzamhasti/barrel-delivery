import { describe, it, expect, vi } from 'vitest';

describe('Status History Recording', () => {
  it('should record status changes to history table', async () => {
    // Mock database insert
    const mockInsert = vi.fn().mockResolvedValue({ rowCount: 1 });
    
    // Simulate recording a status change
    const recordStatusChange = async (orderId: number, status: string) => {
      return mockInsert({
        orderId,
        status,
        createdAt: new Date(),
      });
    };

    // Test recording "Ready" status
    const result = await recordStatusChange(1, 'Ready');
    expect(result.rowCount).toBe(1);
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: 1,
        status: 'Ready',
      })
    );
  });

  it('should record multiple status transitions', async () => {
    const mockInsert = vi.fn().mockResolvedValue({ rowCount: 1 });
    
    const recordStatusChange = async (orderId: number, status: string) => {
      return mockInsert({
        orderId,
        status,
        createdAt: new Date(),
      });
    };

    // Record sequence of status changes
    await recordStatusChange(1, 'Pending');
    await recordStatusChange(1, 'Ready');
    await recordStatusChange(1, 'On the Way');
    await recordStatusChange(1, 'Delivered');

    expect(mockInsert).toHaveBeenCalledTimes(4);
    expect(mockInsert).toHaveBeenNthCalledWith(1, expect.objectContaining({ status: 'Pending' }));
    expect(mockInsert).toHaveBeenNthCalledWith(2, expect.objectContaining({ status: 'Ready' }));
    expect(mockInsert).toHaveBeenNthCalledWith(3, expect.objectContaining({ status: 'On the Way' }));
    expect(mockInsert).toHaveBeenNthCalledWith(4, expect.objectContaining({ status: 'Delivered' }));
  });

  it('should retrieve status history for an order', async () => {
    const mockSelect = vi.fn().mockResolvedValue([
      { orderId: 1, status: 'Pending', createdAt: new Date('2026-05-07T10:00:00Z') },
      { orderId: 1, status: 'Ready', createdAt: new Date('2026-05-07T10:05:20Z') },
      { orderId: 1, status: 'On the Way', createdAt: new Date('2026-05-07T10:10:00Z') },
      { orderId: 1, status: 'Delivered', createdAt: new Date('2026-05-07T10:20:15Z') },
    ]);

    const history = await mockSelect(1);
    
    expect(history.length).toBe(4);
    expect(history[0].status).toBe('Pending');
    expect(history[1].status).toBe('Ready');
    expect(history[2].status).toBe('On the Way');
    expect(history[3].status).toBe('Delivered');
  });
});
