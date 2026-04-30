import { describe, it, expect } from 'vitest';
import { normalizeAddress } from './googleMapsRouting';

describe('Google Maps Routing', () => {
  describe('normalizeAddress', () => {
    it('should append Fort Erie, ON to incomplete addresses', () => {
      const result = normalizeAddress('1 Hospitality Dr');
      expect(result).toBe('1 Hospitality Dr, Fort Erie, ON');
    });

    it('should append Fort Erie, ON to street addresses without city', () => {
      const result = normalizeAddress('323 Niagara');
      expect(result).toBe('323 Niagara, Fort Erie, ON');
    });

    it('should not modify addresses that already contain Fort Erie', () => {
      const result = normalizeAddress('1 Hospitality Dr, Fort Erie, ON');
      expect(result).toBe('1 Hospitality Dr, Fort Erie, ON');
    });

    it('should not modify addresses that already contain ON', () => {
      const result = normalizeAddress('1 Hospitality Dr, Fort Erie, ON L2A 1M7');
      expect(result).toBe('1 Hospitality Dr, Fort Erie, ON L2A 1M7');
    });

    it('should handle addresses with ON abbreviation (case insensitive)', () => {
      const result = normalizeAddress('1 Hospitality Dr, on');
      expect(result).toBe('1 Hospitality Dr, on');
    });

    it('should handle addresses with fort erie (case insensitive)', () => {
      const result = normalizeAddress('1 Hospitality Dr, FORT ERIE');
      expect(result).toBe('1 Hospitality Dr, FORT ERIE');
    });

    it('should trim whitespace before normalizing', () => {
      const result = normalizeAddress('  1 Hospitality Dr  ');
      expect(result).toBe('1 Hospitality Dr, Fort Erie, ON');
    });

    it('should handle empty strings', () => {
      const result = normalizeAddress('');
      expect(result).toBe('');
    });

    it('should handle null-like values', () => {
      const result = normalizeAddress('');
      expect(result).toBe('');
    });

    it('should preserve address formatting', () => {
      const result = normalizeAddress('123 Main St, Apt 4B');
      expect(result).toBe('123 Main St, Apt 4B, Fort Erie, ON');
    });

    it('should handle addresses with postal codes', () => {
      const result = normalizeAddress('224 Garrison Rd, L2A 1M7');
      expect(result).toBe('224 Garrison Rd, L2A 1M7, Fort Erie, ON');
    });

    it('should handle addresses with province abbreviation in different cases', () => {
      const result1 = normalizeAddress('1 Hospitality Dr, On');
      const result2 = normalizeAddress('1 Hospitality Dr, ON');
      const result3 = normalizeAddress('1 Hospitality Dr, on');
      
      expect(result1).toBe('1 Hospitality Dr, On');
      expect(result2).toBe('1 Hospitality Dr, ON');
      expect(result3).toBe('1 Hospitality Dr, on');
    });
  });

  describe('Address normalization edge cases', () => {
    it('should handle addresses with multiple commas', () => {
      const result = normalizeAddress('1 Hospitality Dr, Unit 1, Building A');
      expect(result).toBe('1 Hospitality Dr, Unit 1, Building A, Fort Erie, ON');
    });

    it('should handle addresses with special characters', () => {
      const result = normalizeAddress("O'Brien St");
      expect(result).toBe("O'Brien St, Fort Erie, ON");
    });

    it('should handle addresses with numbers and letters mixed', () => {
      const result = normalizeAddress('123A Main St');
      expect(result).toBe('123A Main St, Fort Erie, ON');
    });

    it('should not duplicate Fort Erie if already present with different formatting', () => {
      const result = normalizeAddress('1 Hospitality Dr, Fort Erie');
      expect(result).toBe('1 Hospitality Dr, Fort Erie');
    });

    it('should handle very short addresses', () => {
      const result = normalizeAddress('Main');
      expect(result).toBe('Main, Fort Erie, ON');
    });
  });
});
