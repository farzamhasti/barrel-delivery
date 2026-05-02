import { describe, it, expect } from 'vitest';
import { createHash } from 'crypto';

// Helper function to generate password hash (same as in initDb.ts)
function generatePasswordHash(password: string): string {
  const salt = Math.random().toString(36).substring(2, 15);
  const hash = createHash('sha256').update(salt + password).digest('hex');
  return `sha256$${salt}$${hash}`;
}

// Password verification function (same as in db.ts)
async function verifySystemPassword(password: string, passwordHash: string): Promise<boolean> {
  try {
    // Simple hash verification using SHA-256
    // Format: algorithm$salt$hash
    const parts = passwordHash.split('$');
    if (parts.length !== 3 || parts[0] !== 'sha256') {
      return false;
    }
    
    const [, salt, storedHash] = parts;
    const computedHash = createHash('sha256').update(salt + password).digest('hex');
    
    // Use timing-safe comparison to prevent timing attacks
    try {
      const crypto = await import('crypto');
      return crypto.timingSafeEqual(Buffer.from(computedHash), Buffer.from(storedHash));
    } catch {
      return false;
    }
  } catch (error) {
    console.error("Password verification error:", error);
    return false;
  }
}

describe('Password Verification', () => {
  it('should verify correct password', async () => {
    const password = 'Barrel_1981@';
    const hash = generatePasswordHash(password);
    const result = await verifySystemPassword(password, hash);
    expect(result).toBe(true);
  });

  it('should reject incorrect password', async () => {
    const password = 'Barrel_1981@';
    const hash = generatePasswordHash(password);
    const result = await verifySystemPassword('wrongpassword', hash);
    expect(result).toBe(false);
  });

  it('should verify kitchen password', async () => {
    const password = '1111';
    const hash = generatePasswordHash(password);
    const result = await verifySystemPassword(password, hash);
    expect(result).toBe(true);
  });

  it('should reject invalid hash format', async () => {
    const result = await verifySystemPassword('password', 'invalid_hash');
    expect(result).toBe(false);
  });

  it('should reject hash without proper algorithm prefix', async () => {
    const result = await verifySystemPassword('password', 'salt$hash');
    expect(result).toBe(false);
  });

  it('should handle empty password', async () => {
    const hash = generatePasswordHash('');
    const result = await verifySystemPassword('', hash);
    expect(result).toBe(true);
  });

  it('should handle special characters in password', async () => {
    const password = 'P@ssw0rd!#$%^&*()';
    const hash = generatePasswordHash(password);
    const result = await verifySystemPassword(password, hash);
    expect(result).toBe(true);
  });
});
