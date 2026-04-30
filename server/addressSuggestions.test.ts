import { describe, it, expect } from "vitest";
import { getAddressSuggestions, findAddressCoordinates } from "../client/src/lib/addressSuggestions";

describe("Address Suggestions", () => {
  it("should return empty array for input less than 2 characters", () => {
    expect(getAddressSuggestions("")).toEqual([]);
    expect(getAddressSuggestions("2")).toEqual([]);
  });

  it("should return suggestions matching the input", () => {
    const suggestions = getAddressSuggestions("255");
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions[0].address).toContain("255");
  });

  it("should be case insensitive", () => {
    const suggestionsLower = getAddressSuggestions("emerick");
    const suggestionsUpper = getAddressSuggestions("EMERICK");
    expect(suggestionsLower.length).toBe(suggestionsUpper.length);
  });

  it("should return coordinates for exact address match", () => {
    const coords = findAddressCoordinates("255 Emerick Avenue, Fort Erie, ON");
    expect(coords).not.toBeNull();
    expect(coords?.lat).toBe(42.9819);
    expect(coords?.lng).toBe(-79.0459);
  });

  it("should return null for non-matching address", () => {
    const coords = findAddressCoordinates("999 Fake Street, Nowhere, ON");
    expect(coords).toBeNull();
  });

  it("should filter addresses containing search term", () => {
    const suggestions = getAddressSuggestions("Fort Erie");
    expect(suggestions.length).toBeGreaterThan(0);
    suggestions.forEach(s => {
      expect(s.address.toLowerCase()).toContain("fort erie");
    });
  });

  it("should include lat/lng in suggestions", () => {
    const suggestions = getAddressSuggestions("Emerick");
    expect(suggestions.length).toBeGreaterThan(0);
    suggestions.forEach(s => {
      expect(s).toHaveProperty("lat");
      expect(s).toHaveProperty("lng");
      expect(typeof s.lat).toBe("number");
      expect(typeof s.lng).toBe("number");
    });
  });
});
