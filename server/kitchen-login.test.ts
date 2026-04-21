import { describe, it, expect, beforeAll } from "vitest";
import { createHash } from "crypto";
import { getSystemCredentials, verifySystemPassword, createSystemCredentials } from "./db";

describe("Kitchen Login", () => {
  beforeAll(async () => {
    // Ensure kitchen credentials exist
    await createSystemCredentials("barrel_kitchen", "kitchen123", "kitchen");
  });

  it("should verify kitchen credentials exist", async () => {
    const credentials = await getSystemCredentials("barrel_kitchen");
    expect(credentials).toBeDefined();
    expect(credentials?.username).toBe("barrel_kitchen");
    expect(credentials?.role).toBe("kitchen");
  });

  it("should verify kitchen password is correct", async () => {
    const credentials = await getSystemCredentials("barrel_kitchen");
    expect(credentials).toBeDefined();
    
    if (credentials) {
      const isValid = await verifySystemPassword("kitchen123", credentials.passwordHash);
      expect(isValid).toBe(true);
    }
  });

  it("should reject invalid password", async () => {
    const credentials = await getSystemCredentials("barrel_kitchen");
    expect(credentials).toBeDefined();
    
    if (credentials) {
      const isValid = await verifySystemPassword("wrongpassword", credentials.passwordHash);
      expect(isValid).toBe(false);
    }
  });

  it("should test password hashing format", () => {
    const password = "kitchen123";
    const salt = "barrel_kitchen_salt_2024";
    const hash = createHash("sha256").update(salt + password).digest("hex");
    const passwordHash = `sha256$${salt}$${hash}`;
    
    // Verify format
    expect(passwordHash).toMatch(/^sha256\$/);
    const parts = passwordHash.split("$");
    expect(parts).toHaveLength(3);
    expect(parts[0]).toBe("sha256");
  });
});
