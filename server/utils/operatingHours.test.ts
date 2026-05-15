/**
 * Test suite for Operating Hours Utility Module
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  isWithinOperatingHours,
  getDayCategory,
  getOperatingHoursForDay,
  isDuringPeakHours,
  isDuringPreClosingSurge,
  getMinutesUntilNextOpen,
  getBusinessStatus,
  extractTemporalFeatures,
  DayCategory,
  OPERATING_HOURS,
  PEAK_HOURS,
} from './operatingHours';

describe('Operating Hours Utilities', () => {
  describe('isWithinOperatingHours', () => {
    it('should return true for Monday 5 PM', () => {
      // Monday, 5 PM (17:00)
      const date = new Date(2026, 4, 18, 17, 0, 0); // May 18, 2026 is a Monday
      expect(isWithinOperatingHours(date)).toBe(true);
    });

    it('should return true for Monday 9 PM', () => {
      // Monday, 9 PM (21:00)
      const date = new Date(2026, 4, 18, 21, 0, 0);
      expect(isWithinOperatingHours(date)).toBe(true);
    });

    it('should return false for Monday 3 PM (before opening)', () => {
      // Monday, 3 PM (15:00)
      const date = new Date(2026, 4, 18, 15, 0, 0);
      expect(isWithinOperatingHours(date)).toBe(false);
    });

    it('should return false for Monday 11 PM (after closing)', () => {
      // Monday, 11 PM (23:00)
      const date = new Date(2026, 4, 18, 23, 0, 0);
      expect(isWithinOperatingHours(date)).toBe(false);
    });

    it('should return true for Friday 10 PM', () => {
      // Friday, 10 PM (22:00)
      const date = new Date(2026, 4, 22, 22, 0, 0); // May 22, 2026 is a Friday
      expect(isWithinOperatingHours(date)).toBe(true);
    });

    it('should return false for Friday 11 PM', () => {
      // Friday, 11 PM (23:00)
      const date = new Date(2026, 4, 22, 23, 0, 0);
      expect(isWithinOperatingHours(date)).toBe(false);
    });

    it('should return true for Saturday 10:30 PM', () => {
      // Saturday, 10:30 PM (22:30)
      const date = new Date(2026, 4, 23, 22, 30, 0); // May 23, 2026 is a Saturday
      expect(isWithinOperatingHours(date)).toBe(true);
    });

    it('should return true for Sunday 5 PM', () => {
      // Sunday, 5 PM (17:00)
      const date = new Date(2026, 4, 17, 17, 0, 0); // May 17, 2026 is a Sunday
      expect(isWithinOperatingHours(date)).toBe(true);
    });
  });

  describe('getDayCategory', () => {
    it('should return WEEKDAY for Monday', () => {
      const date = new Date(2026, 4, 18, 17, 0, 0); // Monday
      expect(getDayCategory(date)).toBe(DayCategory.WEEKDAY);
    });

    it('should return WEEKDAY for Thursday', () => {
      const date = new Date(2026, 4, 21, 17, 0, 0); // Thursday
      expect(getDayCategory(date)).toBe(DayCategory.WEEKDAY);
    });

    it('should return FRIDAY for Friday', () => {
      const date = new Date(2026, 4, 22, 17, 0, 0); // Friday
      expect(getDayCategory(date)).toBe(DayCategory.FRIDAY);
    });

    it('should return SATURDAY for Saturday', () => {
      const date = new Date(2026, 4, 23, 17, 0, 0); // Saturday
      expect(getDayCategory(date)).toBe(DayCategory.SATURDAY);
    });

    it('should return WEEKDAY for Sunday', () => {
      const date = new Date(2026, 4, 17, 17, 0, 0); // Sunday
      expect(getDayCategory(date)).toBe(DayCategory.WEEKDAY);
    });
  });

  describe('getOperatingHoursForDay', () => {
    it('should return 16-22 for Monday (0)', () => {
      const hours = getOperatingHoursForDay(1); // Monday
      expect(hours.openHour).toBe(16);
      expect(hours.closeHour).toBe(22);
    });

    it('should return 16-23 for Friday (5)', () => {
      const hours = getOperatingHoursForDay(5); // Friday
      expect(hours.openHour).toBe(16);
      expect(hours.closeHour).toBe(23);
    });

    it('should return 16-23 for Saturday (6)', () => {
      const hours = getOperatingHoursForDay(6); // Saturday
      expect(hours.openHour).toBe(16);
      expect(hours.closeHour).toBe(23);
    });

    it('should return 16-22 for Sunday (0)', () => {
      const hours = getOperatingHoursForDay(0); // Sunday
      expect(hours.openHour).toBe(16);
      expect(hours.closeHour).toBe(22);
    });
  });

  describe('isDuringPeakHours', () => {
    it('should return true for 6 PM (early peak)', () => {
      const date = new Date(2026, 4, 18, 18, 0, 0); // Monday 6 PM
      expect(isDuringPeakHours(date)).toBe(true);
    });

    it('should return true for 8 PM (main peak)', () => {
      const date = new Date(2026, 4, 18, 20, 0, 0); // Monday 8 PM
      expect(isDuringPeakHours(date)).toBe(true);
    });

    it('should return true for 9:30 PM (late peak weekday)', () => {
      const date = new Date(2026, 4, 18, 21, 30, 0); // Monday 9:30 PM
      expect(isDuringPeakHours(date)).toBe(true);
    });

    it('should return true for 10:30 PM (late peak weekend)', () => {
      const date = new Date(2026, 4, 23, 22, 30, 0); // Saturday 10:30 PM
      expect(isDuringPeakHours(date)).toBe(true);
    });

    it('should return false for 4:30 PM (before peak)', () => {
      const date = new Date(2026, 4, 18, 16, 30, 0); // Monday 4:30 PM
      expect(isDuringPeakHours(date)).toBe(false);
    });

    it('should return false for 11 PM (after peak)', () => {
      const date = new Date(2026, 4, 18, 23, 0, 0); // Monday 11 PM
      expect(isDuringPeakHours(date)).toBe(false);
    });
  });

  describe('isDuringPreClosingSurge', () => {
    it('should return true for Monday 9:30 PM', () => {
      const date = new Date(2026, 4, 18, 21, 30, 0); // Monday 9:30 PM
      expect(isDuringPreClosingSurge(date)).toBe(true);
    });

    it('should return true for Monday 9:59 PM', () => {
      const date = new Date(2026, 4, 18, 21, 59, 0); // Monday 9:59 PM
      expect(isDuringPreClosingSurge(date)).toBe(true);
    });

    it('should return false for Monday 9:29 PM', () => {
      const date = new Date(2026, 4, 18, 21, 29, 0); // Monday 9:29 PM
      expect(isDuringPreClosingSurge(date)).toBe(false);
    });

    it('should return true for Saturday 10:30 PM', () => {
      const date = new Date(2026, 4, 23, 22, 30, 0); // Saturday 10:30 PM
      expect(isDuringPreClosingSurge(date)).toBe(true);
    });

    it('should return false for Saturday 10:29 PM', () => {
      const date = new Date(2026, 4, 23, 22, 29, 0); // Saturday 10:29 PM
      expect(isDuringPreClosingSurge(date)).toBe(false);
    });
  });

  describe('getMinutesUntilNextOpen', () => {
    it('should return 0 during operating hours', () => {
      const date = new Date(2026, 4, 18, 18, 0, 0); // Monday 6 PM
      expect(getMinutesUntilNextOpen(date)).toBe(0);
    });

    it('should return minutes until today opening if before opening', () => {
      const date = new Date(2026, 4, 18, 10, 0, 0); // Monday 10 AM
      const expected = (16 - 10) * 60; // 360 minutes
      expect(getMinutesUntilNextOpen(date)).toBe(expected);
    });

    it('should return minutes until tomorrow opening if after closing', () => {
      const date = new Date(2026, 4, 18, 23, 0, 0); // Monday 11 PM
      const minutesUntilMidnight = 24 * 60 - 23 * 60; // 60 minutes
      const minutesAfterMidnight = 16 * 60; // 960 minutes
      const expected = minutesUntilMidnight + minutesAfterMidnight; // 1020 minutes
      expect(getMinutesUntilNextOpen(date)).toBe(expected);
    });
  });

  describe('getBusinessStatus', () => {
    it('should return open status during operating hours', () => {
      const date = new Date(2026, 4, 18, 18, 0, 0); // Monday 6 PM
      const status = getBusinessStatus(date);
      expect(status.isOpen).toBe(true);
      expect(status.dayCategory).toBe(DayCategory.WEEKDAY);
      expect(status.currentHour).toBe(18);
      expect(status.minutesUntilClose).toBe(4 * 60); // 240 minutes
    });

    it('should return closed status outside operating hours', () => {
      const date = new Date(2026, 4, 18, 23, 0, 0); // Monday 11 PM
      const status = getBusinessStatus(date);
      expect(status.isOpen).toBe(false);
      expect(status.dayCategory).toBe(DayCategory.WEEKDAY);
      expect(status.minutesUntilOpen).toBeGreaterThan(0);
    });

    it('should show correct minutes until close near closing time', () => {
      const date = new Date(2026, 4, 18, 21, 30, 0); // Monday 9:30 PM
      const status = getBusinessStatus(date);
      expect(status.isOpen).toBe(true);
      expect(status.minutesUntilClose).toBe(30); // 30 minutes
    });
  });

  describe('extractTemporalFeatures', () => {
    it('should extract correct features during operating hours', () => {
      const date = new Date(2026, 4, 18, 20, 15, 0); // Monday 8:15 PM
      const features = extractTemporalFeatures(date);

      expect(features.dayOfWeek).toBe(1); // Monday
      expect(features.dayCategory).toBe(DayCategory.WEEKDAY);
      expect(features.hour).toBe(20);
      expect(features.minute).toBe(15);
      expect(features.isWithinOperatingHours).toBe(true);
      expect(features.isPeakHour).toBe(true); // 8 PM is main peak
      expect(features.isPreClosingSurge).toBe(false);
      expect(features.hoursSinceOpen).toBe(4); // 20 - 16
      expect(features.minutesUntilClose).toBe(105); // (22 - 20) * 60 - 15
    });

    it('should extract correct features during pre-closing surge', () => {
      const date = new Date(2026, 4, 18, 21, 45, 0); // Monday 9:45 PM
      const features = extractTemporalFeatures(date);

      expect(features.isWithinOperatingHours).toBe(true);
      expect(features.isPeakHour).toBe(true);
      expect(features.isPreClosingSurge).toBe(true);
      expect(features.minutesUntilClose).toBe(15); // (22 - 21) * 60 - 45
    });

    it('should extract correct features outside operating hours', () => {
      const date = new Date(2026, 4, 18, 10, 0, 0); // Monday 10 AM
      const features = extractTemporalFeatures(date);

      expect(features.isWithinOperatingHours).toBe(false);
      expect(features.isPeakHour).toBe(false);
      expect(features.isPreClosingSurge).toBe(false);
      expect(features.hoursSinceOpen).toBe(-1);
      expect(features.minutesUntilClose).toBe(-1);
    });

    it('should extract correct features for Friday extended hours', () => {
      const date = new Date(2026, 4, 22, 22, 15, 0); // Friday 10:15 PM
      const features = extractTemporalFeatures(date);

      expect(features.dayOfWeek).toBe(5); // Friday
      expect(features.dayCategory).toBe(DayCategory.FRIDAY);
      expect(features.isWithinOperatingHours).toBe(true);
      expect(features.isPeakHour).toBe(true); // 10 PM is weekend late peak
      expect(features.hoursSinceOpen).toBe(6); // 22 - 16
      expect(features.minutesUntilClose).toBe(45); // (23 - 22) * 60 - 15
    });
  });
});
