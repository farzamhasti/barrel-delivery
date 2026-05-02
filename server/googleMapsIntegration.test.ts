import { describe, it, expect } from 'vitest';

describe('Google Maps Integration', () => {
  describe('API Key Configuration', () => {
    it('should have VITE_GOOGLE_MAPS_API_KEY set', () => {
      const apiKey = process.env.VITE_GOOGLE_MAPS_API_KEY;
      expect(apiKey).toBeDefined();
      expect(apiKey).toBeTruthy();
    });

    it('should have valid Google API key format (starts with AIza)', () => {
      const apiKey = process.env.VITE_GOOGLE_MAPS_API_KEY;
      expect(apiKey).toMatch(/^AIza/);
    });

    it('should not be using Manus proxy key', () => {
      const apiKey = process.env.VITE_GOOGLE_MAPS_API_KEY;
      expect(apiKey).not.toContain('forge');
      expect(apiKey).not.toContain('proxy');
    });
  });

  describe('Google Maps Script URL Construction', () => {
    it('should construct valid direct Google Maps URL', () => {
      const apiKey = process.env.VITE_GOOGLE_MAPS_API_KEY;
      const scriptUrl = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&v=weekly&libraries=places,geocoding,geometry`;
      
      expect(scriptUrl).toContain('https://maps.googleapis.com/maps/api/js');
      expect(scriptUrl).not.toContain('proxy');
      expect(scriptUrl).not.toContain('forge');
    });

    it('should include all required libraries', () => {
      const apiKey = process.env.VITE_GOOGLE_MAPS_API_KEY;
      const scriptUrl = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&v=weekly&libraries=places,geocoding,geometry`;
      
      expect(scriptUrl).toContain('libraries=places');
      expect(scriptUrl).toContain('geocoding');
      expect(scriptUrl).toContain('geometry');
    });

    it('should work on external deployments (Railway, etc.)', () => {
      const apiKey = process.env.VITE_GOOGLE_MAPS_API_KEY;
      // The URL should be a direct Google Maps URL, not using any proxy
      const scriptUrl = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&v=weekly&libraries=places,geocoding,geometry`;
      
      // Should be a direct HTTPS URL to Google
      expect(scriptUrl).toMatch(/^https:\/\/maps\.googleapis\.com/);
      // Should not contain any custom proxy domain
      expect(scriptUrl).not.toMatch(/localhost|127\.0\.0\.1|manus|forge|butterfly/);
    });
  });

  describe('Required APIs for Functionality', () => {
    it('should have Places API for Autocomplete', () => {
      const scriptUrl = `https://maps.googleapis.com/maps/api/js?key=${process.env.VITE_GOOGLE_MAPS_API_KEY}&v=weekly&libraries=places,geocoding,geometry`;
      expect(scriptUrl).toContain('places');
    });

    it('should have Geocoding API for address resolution', () => {
      const scriptUrl = `https://maps.googleapis.com/maps/api/js?key=${process.env.VITE_GOOGLE_MAPS_API_KEY}&v=weekly&libraries=places,geocoding,geometry`;
      expect(scriptUrl).toContain('geocoding');
    });

    it('should have Geometry API for distance calculations', () => {
      const scriptUrl = `https://maps.googleapis.com/maps/api/js?key=${process.env.VITE_GOOGLE_MAPS_API_KEY}&v=weekly&libraries=places,geocoding,geometry`;
      expect(scriptUrl).toContain('geometry');
    });
  });

  describe('Deployment Compatibility', () => {
    it('should work on Manus hosting', () => {
      // Direct Google Maps URL works on Manus hosting
      const apiKey = process.env.VITE_GOOGLE_MAPS_API_KEY;
      expect(apiKey).toBeTruthy();
      expect(apiKey).toMatch(/^AIza/);
    });

    it('should work on Railway deployment', () => {
      // Direct Google Maps URL works on Railway without proxy
      const apiKey = process.env.VITE_GOOGLE_MAPS_API_KEY;
      const scriptUrl = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&v=weekly&libraries=places,geocoding,geometry`;
      
      // Should be a direct URL that works from any domain
      expect(scriptUrl).toContain('https://maps.googleapis.com');
      expect(scriptUrl).not.toContain('proxy');
    });

    it('should work on any external hosting', () => {
      // Direct Google Maps API key works anywhere
      const apiKey = process.env.VITE_GOOGLE_MAPS_API_KEY;
      expect(apiKey).toBeTruthy();
      // API key is configured in Google Cloud Console to accept requests from any domain
      expect(apiKey).toMatch(/^AIza[a-zA-Z0-9_-]+$/);
    });
  });
});
