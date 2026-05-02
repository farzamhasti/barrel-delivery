import { describe, it, expect } from 'vitest';
import { convertOntarioTimeToUTC, convertUTCToOntarioTime } from './timezoneHelper';

describe('Timezone Helper - Ontario Time Conversion', () => {
  describe('convertOntarioTimeToUTC', () => {
    it('should convert Ontario local time to UTC correctly', () => {
      // Test with a known date: 2026-04-30 at 8:30 PM Ontario time
      // Ontario is in EDT (UTC-4) in April
      const ontarioTime = '2026-04-30T20:30';
      const utcDate = convertOntarioTimeToUTC(ontarioTime);

      // The UTC time should be 4 hours ahead
      // 8:30 PM EDT (UTC-4) = 12:30 AM UTC next day
      expect(utcDate.getUTCHours()).toBe(0); // 12:30 AM = 00:30 UTC
      expect(utcDate.getUTCMinutes()).toBe(30);
      expect(utcDate.getUTCDate()).toBe(1); // Next day in UTC
    });

    it('should handle winter time (EST) correctly', () => {
      // Test with a winter date: 2026-01-15 at 3:00 PM Ontario time
      // Ontario is in EST (UTC-5) in January
      const ontarioTime = '2026-01-15T15:00';
      const utcDate = convertOntarioTimeToUTC(ontarioTime);

      // The UTC time should be 5 hours ahead
      // 3:00 PM EST (UTC-5) = 8:00 PM UTC
      expect(utcDate.getUTCHours()).toBe(20); // 8:00 PM UTC
      expect(utcDate.getUTCMinutes()).toBe(0);
      expect(utcDate.getUTCDate()).toBe(15);
    });

    it('should handle DST transition date correctly', () => {
      // Test around DST transition (second Sunday of March)
      // 2026-03-08 is the DST transition date
      const ontarioTime = '2026-03-08T14:00';
      const utcDate = convertOntarioTimeToUTC(ontarioTime);

      // Should be converted correctly considering the DST transition
      expect(utcDate).toBeInstanceOf(Date);
      expect(utcDate.getUTCHours()).toBeGreaterThanOrEqual(18); // Should be around 7 PM UTC (EST)
    });

    it('should parse datetime-local format correctly', () => {
      const ontarioTime = '2026-06-15T14:30';
      const utcDate = convertOntarioTimeToUTC(ontarioTime);

      expect(utcDate).toBeInstanceOf(Date);
      expect(utcDate.getUTCMinutes()).toBe(30);
    });
  });

  describe('convertUTCToOntarioTime', () => {
    it('should convert UTC to Ontario local time correctly', () => {
      // Create a UTC date: 2026-04-30 at 00:30 UTC (which is 8:30 PM EDT on 2026-04-29)
      const utcDate = new Date('2026-04-30T00:30:00Z');
      const ontarioTime = convertUTCToOntarioTime(utcDate);

      // Should be 8:30 PM on 2026-04-29 in Ontario (EDT is UTC-4)
      expect(ontarioTime).toMatch(/2026-04-29T20:30/);
    });

    it('should handle winter UTC time correctly', () => {
      // Create a UTC date: 2026-01-15 at 20:00 UTC (which is 3:00 PM EST on 2026-01-15)
      const utcDate = new Date('2026-01-15T20:00:00Z');
      const ontarioTime = convertUTCToOntarioTime(utcDate);

      // Should be 3:00 PM on 2026-01-15 in Ontario (EST is UTC-5)
      expect(ontarioTime).toMatch(/2026-01-15T15:00/);
    });

    it('should return datetime-local format', () => {
      const utcDate = new Date('2026-06-15T18:45:00Z');
      const ontarioTime = convertUTCToOntarioTime(utcDate);

      // Should match YYYY-MM-DDTHH:MM format
      expect(ontarioTime).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    });
  });

  describe('Round-trip conversion', () => {
    it('should maintain time value through round-trip conversion', () => {
      const originalOntarioTime = '2026-04-30T20:30';
      
      // Convert to UTC and back
      const utcDate = convertOntarioTimeToUTC(originalOntarioTime);
      const backToOntario = convertUTCToOntarioTime(utcDate);

      // Should match the original (allowing for formatting differences)
      expect(backToOntario).toMatch(/2026-04-30T20:30/);
    });

    it('should handle multiple round-trips correctly', () => {
      const originalOntarioTime = '2026-01-15T14:15';
      
      let current = originalOntarioTime;
      for (let i = 0; i < 3; i++) {
        const utcDate = convertOntarioTimeToUTC(current);
        current = convertUTCToOntarioTime(utcDate);
      }

      expect(current).toMatch(/2026-01-15T14:15/);
    });
  });

  describe('Edge cases', () => {
    it('should handle midnight correctly', () => {
      const ontarioTime = '2026-04-30T00:00';
      const utcDate = convertOntarioTimeToUTC(ontarioTime);

      expect(utcDate).toBeInstanceOf(Date);
      expect(utcDate.getUTCMinutes()).toBe(0);
    });

    it('should handle end of day correctly', () => {
      const ontarioTime = '2026-04-30T23:59';
      const utcDate = convertOntarioTimeToUTC(ontarioTime);

      expect(utcDate).toBeInstanceOf(Date);
      expect(utcDate.getUTCMinutes()).toBe(59);
    });

    it('should handle noon correctly', () => {
      const ontarioTime = '2026-04-30T12:00';
      const utcDate = convertOntarioTimeToUTC(ontarioTime);

      expect(utcDate).toBeInstanceOf(Date);
      expect(utcDate.getUTCHours()).toBeGreaterThanOrEqual(15); // Should be around 4 PM UTC (EDT)
    });
  });
});
