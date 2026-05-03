import { describe, it, expect } from 'vitest';

describe('Web Push Notifications - VAPID Keys', () => {
  it('should have VAPID_PUBLIC_KEY environment variable', () => {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    expect(publicKey).toBeDefined();
    if (publicKey) {
      expect(publicKey).toMatch(/^[A-Za-z0-9_-]+$/);
      expect(publicKey.length).toBeGreaterThan(50);
    }
  });

  it('should have VAPID_PRIVATE_KEY environment variable', () => {
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    expect(privateKey).toBeDefined();
    if (privateKey) {
      expect(privateKey).toMatch(/^[A-Za-z0-9_-]+$/);
      expect(privateKey.length).toBeGreaterThan(40);
    }
  });

  it('should have VAPID_SUBJECT environment variable', () => {
    const subject = process.env.VAPID_SUBJECT;
    expect(subject).toBeDefined();
    if (subject) {
      expect(subject).toMatch(/^mailto:|^https?:/);
    }
  });

  it('should have valid VAPID key pair format', () => {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    
    if (publicKey && privateKey) {
      // Public key should be longer than private key (P-256 ECDSA)
      expect(publicKey.length).toBeGreaterThan(privateKey.length);
      
      // Both should only contain base64url characters
      expect(/^[A-Za-z0-9_-]+$/.test(publicKey)).toBe(true);
      expect(/^[A-Za-z0-9_-]+$/.test(privateKey)).toBe(true);
    }
  });
});
