import { describe, it, expect } from "vitest";

describe("Decimal to Number Conversion", () => {
  it("should convert Decimal objects to numbers correctly", () => {
    // Simulate Decimal objects from database (as they come from Drizzle ORM)
    const decimalLat = { toString: () => "42.9051910" };
    const decimalLng = { toString: () => "-78.9225479" };

    // Convert using Number()
    const numLat = Number(decimalLat);
    const numLng = Number(decimalLng);

    expect(typeof numLat).toBe("number");
    expect(typeof numLng).toBe("number");
    expect(numLat).toBeCloseTo(42.9051910, 5);
    expect(numLng).toBeCloseTo(-78.9225479, 5);
  });

  it("should handle null coordinates gracefully", () => {
    const nullLat = null;
    const nullLng = null;

    const result = {
      latitude: nullLat ? Number(nullLat) : null,
      longitude: nullLng ? Number(nullLng) : null,
    };

    expect(result.latitude).toBeNull();
    expect(result.longitude).toBeNull();
  });

  it("should handle undefined coordinates gracefully", () => {
    const undefinedLat = undefined;
    const undefinedLng = undefined;

    const result = {
      latitude: undefinedLat ? Number(undefinedLat) : null,
      longitude: undefinedLng ? Number(undefinedLng) : null,
    };

    expect(result.latitude).toBeNull();
    expect(result.longitude).toBeNull();
  });

  it("should convert string coordinates to numbers", () => {
    const stringLat = "42.9051910";
    const stringLng = "-78.9225479";

    const numLat = Number(stringLat);
    const numLng = Number(stringLng);

    expect(typeof numLat).toBe("number");
    expect(typeof numLng).toBe("number");
    expect(numLat).toBeCloseTo(42.9051910, 5);
    expect(numLng).toBeCloseTo(-78.9225479, 5);
  });

  it("should preserve precision in coordinate conversion", () => {
    // High precision coordinates
    const lat = "42.90519100000001";
    const lng = "-78.92254790000001";

    const numLat = Number(lat);
    const numLng = Number(lng);

    // JavaScript numbers maintain reasonable precision for coordinates
    expect(numLat).toBeCloseTo(42.90519100000001, 10);
    expect(numLng).toBeCloseTo(-78.92254790000001, 10);
  });
});
