import { describe, it, expect } from "vitest";
import { generateFormattedReceipt } from "./receiptGenerator";

describe("receiptGenerator", () => {
  it("should generate a PNG buffer from receipt data", async () => {
    const input = {
      checkNumber: "40134",
      items: [
        { name: "Lasagna", quantity: 2 },
        { name: "Wings *10* (Mild)", quantity: 1 },
        { name: "2L Diet Pepsi", quantity: 1 },
      ],
    };

    const result = await generateFormattedReceipt(input);

    // Should return a Buffer
    expect(Buffer.isBuffer(result)).toBe(true);

    // Should be a valid PNG (starts with PNG magic number)
    expect(result[0]).toBe(0x89);
    expect(result[1]).toBe(0x50); // P
    expect(result[2]).toBe(0x4e); // N
    expect(result[3]).toBe(0x47); // G

    // Should have reasonable size (at least 1KB)
    expect(result.length).toBeGreaterThan(1000);
  });

  it("should handle single item", async () => {
    const input = {
      checkNumber: "123",
      items: [{ name: "Pizza", quantity: 1 }],
    };

    const result = await generateFormattedReceipt(input);
    expect(Buffer.isBuffer(result)).toBe(true);
    expect(result.length).toBeGreaterThan(1000);
  });

  it("should handle many items", async () => {
    const input = {
      checkNumber: "999",
      items: Array.from({ length: 10 }, (_, i) => ({
        name: `Item ${i + 1}`,
        quantity: i + 1,
      })),
    };

    const result = await generateFormattedReceipt(input);
    expect(Buffer.isBuffer(result)).toBe(true);
    expect(result.length).toBeGreaterThan(1000);
  });

  it("should handle special characters in item names", async () => {
    const input = {
      checkNumber: "456",
      items: [
        { name: "Pasta à la Carte", quantity: 1 },
        { name: "Café Espresso", quantity: 2 },
      ],
    };

    const result = await generateFormattedReceipt(input);
    expect(Buffer.isBuffer(result)).toBe(true);
    expect(result.length).toBeGreaterThan(1000);
  });

  it("should handle empty items array", async () => {
    const input = {
      checkNumber: "789",
      items: [],
    };

    const result = await generateFormattedReceipt(input);
    expect(Buffer.isBuffer(result)).toBe(true);
    expect(result.length).toBeGreaterThan(1000);
  });

  it("should produce consistent output for same input", async () => {
    const input = {
      checkNumber: "555",
      items: [{ name: "Burger", quantity: 1 }],
    };

    const result1 = await generateFormattedReceipt(input);
    const result2 = await generateFormattedReceipt(input);

    // Both should be valid PNGs
    expect(result1[0]).toBe(0x89);
    expect(result2[0]).toBe(0x89);

    // Both should have similar size (PNG compression may vary slightly)
    expect(Math.abs(result1.length - result2.length)).toBeLessThan(100);
  });
});
