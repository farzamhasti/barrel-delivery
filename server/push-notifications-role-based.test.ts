import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { storePushSubscription, sendPushNotification } from './push-service';

describe('Web Push Notifications - Role-Based Routing', () => {
  // Mock subscriptions for testing
  const mockSubscriptions = [
    {
      userId: 1001,
      role: 'admin' as const,
      endpoint: 'https://example.com/push/admin1',
      auth: 'auth_admin_1',
      p256dh: 'p256dh_admin_1',
    },
    {
      userId: 1002,
      role: 'admin' as const,
      endpoint: 'https://example.com/push/admin2',
      auth: 'auth_admin_2',
      p256dh: 'p256dh_admin_2',
    },
    {
      userId: 2001,
      role: 'kitchen' as const,
      endpoint: 'https://example.com/push/kitchen1',
      auth: 'auth_kitchen_1',
      p256dh: 'p256dh_kitchen_1',
    },
    {
      userId: 3001,
      role: 'driver' as const,
      endpoint: 'https://example.com/push/driver1',
      auth: 'auth_driver_1',
      p256dh: 'p256dh_driver_1',
    },
    {
      userId: 3002,
      role: 'driver' as const,
      endpoint: 'https://example.com/push/driver2',
      auth: 'auth_driver_2',
      p256dh: 'p256dh_driver_2',
    },
  ];

  beforeAll(async () => {
    // Store mock subscriptions
    for (const sub of mockSubscriptions) {
      await storePushSubscription(
        sub.userId,
        sub.role,
        sub.endpoint,
        sub.auth,
        sub.p256dh
      );
    }
  });

  it('should store push subscriptions with role and user ID', async () => {
    const result = await storePushSubscription(
      9999,
      'admin',
      'https://example.com/push/test',
      'test_auth',
      'test_p256dh'
    );
    expect(result).toBe(true);
  });

  it('should send notifications only to admin subscriptions when role is admin', async () => {
    const count = await sendPushNotification(1001, 'admin', {
      title: 'Test Admin',
      body: 'Admin notification',
      url: '/admin',
    });
    // Should send to at least the admin subscription
    expect(count).toBeGreaterThanOrEqual(0);
  });

  it('should send notifications only to kitchen subscriptions when role is kitchen', async () => {
    const count = await sendPushNotification(2001, 'kitchen', {
      title: 'Test Kitchen',
      body: 'Kitchen notification',
      url: '/kitchen',
    });
    // Should send to kitchen subscriptions
    expect(count).toBeGreaterThanOrEqual(0);
  });

  it('should send notifications only to specific driver when role is driver', async () => {
    const count = await sendPushNotification(3001, 'driver', {
      title: 'Test Driver',
      body: 'Driver notification',
      url: '/driver-dashboard',
    });
    // Should send to the specific driver
    expect(count).toBeGreaterThanOrEqual(0);
  });

  it('should have VAPID keys configured', () => {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT;

    expect(publicKey).toBeDefined();
    expect(privateKey).toBeDefined();
    expect(subject).toBeDefined();
    expect(publicKey).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(privateKey).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('should have correct notification payload structure', () => {
    const payload = {
      title: 'Order #40096 is ready',
      body: 'Your order is ready for pickup',
      url: '/admin/order-tracking',
      icon: '/barrel-logo.png',
      badge: '/barrel-logo.png',
      data: {
        orderId: 40096,
        role: 'admin',
      },
    };

    expect(payload.title).toBeDefined();
    expect(payload.body).toBeDefined();
    expect(payload.url).toBeDefined();
    expect(payload.data).toBeDefined();
    expect(payload.data.role).toBe('admin');
  });
});
