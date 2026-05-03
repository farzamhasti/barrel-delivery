import { describe, it, expect } from 'vitest';

describe('Web Push Notifications - Frontend VAPID Key', () => {
  it('should have VITE_FRONTEND_VAPID_PUBLIC_KEY available', () => {
    const vapidKey = import.meta.env.VITE_FRONTEND_VAPID_PUBLIC_KEY;
    expect(vapidKey).toBeDefined();
    expect(vapidKey).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(vapidKey.length).toBeGreaterThan(50);
  });

  it('should have valid base64url format for VAPID key', () => {
    const vapidKey = import.meta.env.VITE_FRONTEND_VAPID_PUBLIC_KEY;
    // VAPID keys are base64url encoded (no padding needed for validation)
    expect(/^[A-Za-z0-9_-]+$/.test(vapidKey)).toBe(true);
  });

  it('should have Service Worker support check function', () => {
    expect('serviceWorker' in navigator).toBe(true);
  });

  it('should have Notification API support', () => {
    expect('Notification' in window).toBe(true);
  });
});
