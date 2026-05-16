import { describe, it, expect } from 'vitest';
import { DateTime } from 'luxon';
import {
  isOperatingHours,
  getBusinessStatus,
  getNextOpeningTime,
  getNextClosingTime,
  getHoursUntilOpen,
  getHoursUntilClose,
  getForecastingStatus,
  shouldAllowForecasting,
  shouldAllowAlerts,
  shouldAllowPredictions,
  getBusinessStatusMessage,
  getForecastingDisabledMessage,
} from './businessHours';

describe('Business Hours Management', () => {
  describe('Operating Hours Validation', () => {
    it('should return true during operating hours (weekday evening)', () => {
      // Monday 5 PM (within 4 PM - 10 PM)
      const monday5pm = DateTime.fromObject({ weekday: 1, hour: 17, minute: 0 });
      expect(isOperatingHours(monday5pm)).toBe(true);
    });

    it('should return true during operating hours (Friday evening)', () => {
      // Friday 9 PM (within 4 PM - 11 PM)
      const friday9pm = DateTime.fromObject({ weekday: 5, hour: 21, minute: 0 });
      expect(isOperatingHours(friday9pm)).toBe(true);
    });

    it('should return false before opening hours', () => {
      // Monday 2 PM (before 4 PM)
      const monday2pm = DateTime.fromObject({ weekday: 1, hour: 14, minute: 0 });
      expect(isOperatingHours(monday2pm)).toBe(false);
    });

    it('should return false after closing hours (weekday)', () => {
      // Monday 11 PM (after 10 PM)
      const monday11pm = DateTime.fromObject({ weekday: 1, hour: 23, minute: 0 });
      expect(isOperatingHours(monday11pm)).toBe(false);
    });

    it('should return false after closing hours (weekend)', () => {
      // Saturday 11:30 PM (after 11 PM)
      const saturday1130pm = DateTime.fromObject({ weekday: 6, hour: 23, minute: 30 });
      expect(isOperatingHours(saturday1130pm)).toBe(false);
    });

    it('should return true at opening time', () => {
      // Monday 4 PM (exactly at opening)
      const monday4pm = DateTime.fromObject({ weekday: 1, hour: 16, minute: 0 });
      expect(isOperatingHours(monday4pm)).toBe(true);
    });

    it('should return false at closing time', () => {
      // Monday 10 PM (exactly at closing)
      const monday10pm = DateTime.fromObject({ weekday: 1, hour: 22, minute: 0 });
      expect(isOperatingHours(monday10pm)).toBe(false);
    });
  });

  describe('Business Status', () => {
    it('should report business open during operating hours', () => {
      const monday5pm = DateTime.fromObject({ weekday: 1, hour: 17, minute: 0 });
      const status = getBusinessStatus(monday5pm);
      expect(status.isOpen).toBe(true);
      expect(status.message).toBe('Business Open');
    });

    it('should report business closed outside operating hours', () => {
      const monday2pm = DateTime.fromObject({ weekday: 1, hour: 14, minute: 0 });
      const status = getBusinessStatus(monday2pm);
      expect(status.isOpen).toBe(false);
      expect(status.message).toBe('Business Closed');
    });

    it('should calculate hours until close correctly', () => {
      const monday5pm = DateTime.fromObject({ weekday: 1, hour: 17, minute: 0 });
      const status = getBusinessStatus(monday5pm);
      expect(status.hoursUntilClose).toBe(5); // 10 PM - 5 PM = 5 hours
    });

    it('should calculate hours until open correctly', () => {
      const monday2pm = DateTime.fromObject({ weekday: 1, hour: 14, minute: 0 });
      const status = getBusinessStatus(monday2pm);
      expect(status.hoursUntilOpen).toBe(2); // 4 PM - 2 PM = 2 hours
    });
  });

  describe('Next Opening/Closing Times', () => {
    it('should return next closing time when open', () => {
      const monday5pm = DateTime.fromObject({ weekday: 1, hour: 17, minute: 0 });
      const nextClose = getNextClosingTime(monday5pm);
      expect(nextClose.hour).toBe(22); // 10 PM
      expect(nextClose.weekday).toBe(1); // Same day
    });

    it('should return next opening time when closed', () => {
      const monday2pm = DateTime.fromObject({ weekday: 1, hour: 14, minute: 0 });
      const nextOpen = getNextOpeningTime(monday2pm);
      expect(nextOpen.hour).toBe(16); // 4 PM
      expect(nextOpen.weekday).toBe(1); // Same day
    });

    it('should return next day opening time after closing', () => {
      const monday11pm = DateTime.fromObject({ weekday: 1, hour: 23, minute: 0 });
      const nextOpen = getNextOpeningTime(monday11pm);
      expect(nextOpen.hour).toBe(16); // 4 PM
      expect(nextOpen.weekday).toBe(2); // Next day (Tuesday)
    });

    it('should handle weekend to Monday transition', () => {
      const sunday11pm = DateTime.fromObject({ weekday: 7, hour: 23, minute: 0 }); // Luxon uses 1-7
      const nextOpen = getNextOpeningTime(sunday11pm);
      expect(nextOpen.hour).toBe(16); // 4 PM
      expect(nextOpen.weekday).toBe(1); // Monday
    });
  });

  describe('Forecasting Status', () => {
    it('should allow forecasting during operating hours', () => {
      const monday5pm = DateTime.fromObject({ weekday: 1, hour: 17, minute: 0 });
      const status = getForecastingStatus(monday5pm);
      expect(status.canForecast).toBe(true);
      expect(status.canAlert).toBe(true);
      expect(status.canPredict).toBe(true);
    });

    it('should disable forecasting outside operating hours', () => {
      const monday2pm = DateTime.fromObject({ weekday: 1, hour: 14, minute: 0 });
      const status = getForecastingStatus(monday2pm);
      expect(status.canForecast).toBe(false);
      expect(status.canAlert).toBe(false);
      expect(status.canPredict).toBe(false);
    });

    it('should provide reason for disabled forecasting', () => {
      const monday2pm = DateTime.fromObject({ weekday: 1, hour: 14, minute: 0 });
      const status = getForecastingStatus(monday2pm);
      expect(status.reason).toContain('Business closed');
      expect(status.reason).toContain('Forecasting paused');
    });
  });

  describe('Helper Functions', () => {
    it('shouldAllowForecasting returns correct value', () => {
      const monday5pm = DateTime.fromObject({ weekday: 1, hour: 17, minute: 0 });
      const monday2pm = DateTime.fromObject({ weekday: 1, hour: 14, minute: 0 });

      expect(shouldAllowForecasting(monday5pm)).toBe(true);
      expect(shouldAllowForecasting(monday2pm)).toBe(false);
    });

    it('shouldAllowAlerts returns correct value', () => {
      const monday5pm = DateTime.fromObject({ weekday: 1, hour: 17, minute: 0 });
      const monday2pm = DateTime.fromObject({ weekday: 1, hour: 14, minute: 0 });

      expect(shouldAllowAlerts(monday5pm)).toBe(true);
      expect(shouldAllowAlerts(monday2pm)).toBe(false);
    });

    it('shouldAllowPredictions returns correct value', () => {
      const monday5pm = DateTime.fromObject({ weekday: 1, hour: 17, minute: 0 });
      const monday2pm = DateTime.fromObject({ weekday: 1, hour: 14, minute: 0 });

      expect(shouldAllowPredictions(monday5pm)).toBe(true);
      expect(shouldAllowPredictions(monday2pm)).toBe(false);
    });
  });

  describe('UI Messages', () => {
    it('should generate correct status message when open', () => {
      const monday5pm = DateTime.fromObject({ weekday: 1, hour: 17, minute: 0 });
      const message = getBusinessStatusMessage(monday5pm);
      expect(message).toContain('Business Open');
      expect(message).toContain('Closes in');
    });

    it('should generate correct status message when closed', () => {
      const monday2pm = DateTime.fromObject({ weekday: 1, hour: 14, minute: 0 });
      const message = getBusinessStatusMessage(monday2pm);
      expect(message).toContain('Business Closed');
      expect(message).toContain('Opens');
    });

    it('should generate correct forecasting disabled message', () => {
      const monday2pm = DateTime.fromObject({ weekday: 1, hour: 14, minute: 0 });
      const message = getForecastingDisabledMessage(monday2pm);
      expect(message).toContain('⏸️');
      expect(message).toContain('Forecasting paused');
    });

    it('should return empty string for forecasting message when open', () => {
      const monday5pm = DateTime.fromObject({ weekday: 1, hour: 17, minute: 0 });
      const message = getForecastingDisabledMessage(monday5pm);
      expect(message).toBe('');
    });
  });

  describe('Edge Cases', () => {
    it('should handle Friday to Saturday transition correctly', () => {
      const friday11pm = DateTime.fromObject({ weekday: 5, hour: 23, minute: 0 });
      const nextOpen = getNextOpeningTime(friday11pm);
      expect(nextOpen.hour).toBe(16); // 4 PM
      expect(nextOpen.weekday).toBe(6); // Saturday
    });

    it('should handle Saturday to Sunday transition correctly', () => {
      const saturday11pm = DateTime.fromObject({ weekday: 6, hour: 23, minute: 0 });
      const nextOpen = getNextOpeningTime(saturday11pm);
      expect(nextOpen.hour).toBe(16); // 4 PM
      expect(nextOpen.weekday).toBe(7); // Sunday (Luxon uses 7 for Sunday)
    });

    it('should handle extended Friday hours', () => {
      const friday10pm = DateTime.fromObject({ weekday: 5, hour: 22, minute: 0 });
      expect(isOperatingHours(friday10pm)).toBe(true); // Friday 10 PM is within 4 PM - 11 PM
    });

    it('should handle extended Saturday hours', () => {
      const saturday10pm = DateTime.fromObject({ weekday: 6, hour: 22, minute: 0 });
      expect(isOperatingHours(saturday10pm)).toBe(true); // Saturday 10 PM is within 4 PM - 11 PM
    });

    it('should reject 11 PM on weekdays', () => {
      const monday11pm = DateTime.fromObject({ weekday: 1, hour: 23, minute: 0 });
      expect(isOperatingHours(monday11pm)).toBe(false); // Monday 11 PM is after 10 PM
    });
  });

  describe('Hours Calculation', () => {
    it('should calculate hours until open correctly', () => {
      const monday2pm = DateTime.fromObject({ weekday: 1, hour: 14, minute: 0 });
      const hours = getHoursUntilOpen(monday2pm);
      expect(hours).toBe(2); // 4 PM - 2 PM = 2 hours
    });

    it('should calculate hours until close correctly', () => {
      const monday6pm = DateTime.fromObject({ weekday: 1, hour: 18, minute: 0 });
      const hours = getHoursUntilClose(monday6pm);
      expect(hours).toBe(4); // 10 PM - 6 PM = 4 hours
    });

    it('should return 0 hours until close when closed', () => {
      const monday2pm = DateTime.fromObject({ weekday: 1, hour: 14, minute: 0 });
      const hours = getHoursUntilClose(monday2pm);
      expect(hours).toBe(0);
    });
  });
});
