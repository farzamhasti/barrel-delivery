import { describe, it, expect } from 'vitest';

describe('Google Maps API Key Validation', () => {
  it('should have VITE_GOOGLE_MAPS_API_KEY environment variable set', () => {
    const apiKey = process.env.VITE_GOOGLE_MAPS_API_KEY;
    expect(apiKey).toBeDefined();
    expect(apiKey).toBeTruthy();
    expect(typeof apiKey).toBe('string');
  });

  it('should have a valid API key format', () => {
    const apiKey = process.env.VITE_GOOGLE_MAPS_API_KEY;
    // Google API keys typically start with 'AIza' and are long alphanumeric strings
    expect(apiKey).toMatch(/^AIza[a-zA-Z0-9_-]+$/);
  });

  it('should be able to construct a valid Google Maps script URL', () => {
    const apiKey = process.env.VITE_GOOGLE_MAPS_API_KEY;
    const scriptUrl = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&v=weekly&libraries=places,geocoding,geometry`;
    
    expect(scriptUrl).toContain('https://maps.googleapis.com/maps/api/js');
    expect(scriptUrl).toContain(`key=${apiKey}`);
    expect(scriptUrl).toContain('libraries=places,geocoding,geometry');
  });

  it('should validate that the API key is not the Manus proxy key', () => {
    const apiKey = process.env.VITE_GOOGLE_MAPS_API_KEY;
    // Should not be the old Manus key format
    expect(apiKey).not.toBe('BXsJYcezPabd4jsNJGSS3T');
    expect(apiKey).not.toContain('forge');
  });
});
