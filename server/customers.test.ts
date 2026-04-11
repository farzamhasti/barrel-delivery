import { describe, it, expect, beforeAll } from "vitest";
import { createCustomer, getDb } from "./db";
import { initializeDatabase } from "./_core/initDb";

describe("Customers", () => {
  beforeAll(async () => {
    // Initialize database and ensure tables exist
    await initializeDatabase();
  });

  it("should create a customer with phone, name, and address", async () => {
    const customerData = {
      name: "John Doe",
      phone: "+1 (555) 123-4567",
      address: "123 Main St, Toronto, ON M5V 3A8",
      latitude: 43.6629 as any,
      longitude: -79.3957 as any,
    };

    const result = await createCustomer(customerData);
    
    // Verify the result is an array with ResultSetHeader
    expect(Array.isArray(result)).toBe(true);
    expect((result as any)[0]).toBeDefined();
    expect((result as any)[0].insertId).toBeGreaterThan(0);
  });

  it("should create a customer with optional latitude/longitude", async () => {
    const customerData = {
      name: "Jane Smith",
      phone: "+1 (555) 987-6543",
      address: "456 Oak Ave, Vancouver, BC V6B 4X8",
    };

    const result = await createCustomer(customerData);
    
    expect(Array.isArray(result)).toBe(true);
    expect((result as any)[0]).toBeDefined();
    expect((result as any)[0].insertId).toBeGreaterThan(0);
  });

  it("should create a customer without phone (nullable field)", async () => {
    const customerData = {
      name: "Bob Johnson",
      phone: undefined as any,
      address: "789 Pine Rd, Calgary, AB T2P 1H9",
    };

    const result = await createCustomer(customerData);
    
    expect(Array.isArray(result)).toBe(true);
    expect((result as any)[0]).toBeDefined();
    expect((result as any)[0].insertId).toBeGreaterThan(0);
  });

  it("should create a customer with minimal required fields", async () => {
    const customerData = {
      name: "Alice Wonder",
      address: "321 Elm St, Montreal, QC H1A 1A1",
    } as any;

    const result = await createCustomer(customerData);
    
    expect(Array.isArray(result)).toBe(true);
    expect((result as any)[0]).toBeDefined();
    expect((result as any)[0].insertId).toBeGreaterThan(0);
  });
});
