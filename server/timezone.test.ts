import { describe, it, expect } from "vitest";
import { getTodayInTimezone, getStartOfDayInTimezone, getEndOfDayInTimezone, isSameDay } from "../shared/timezone";

describe("Timezone utilities for America/Toronto", () => {
  it("should get today's date in America/Toronto timezone", () => {
    const today = getTodayInTimezone();
    expect(today).toBeInstanceOf(Date);
    // Should be at midnight UTC
    expect(today.getUTCHours()).toBe(0);
    expect(today.getUTCMinutes()).toBe(0);
    expect(today.getUTCSeconds()).toBe(0);
  });

  it("should get start of day in America/Toronto timezone", () => {
    const now = new Date();
    const startOfDay = getStartOfDayInTimezone(now);
    expect(startOfDay).toBeInstanceOf(Date);
    // Start of day should be at midnight
    expect(startOfDay.getUTCHours()).toBe(0);
    expect(startOfDay.getUTCMinutes()).toBe(0);
  });

  it("should get end of day in America/Toronto timezone", () => {
    const now = new Date();
    const endOfDay = getEndOfDayInTimezone(now);
    expect(endOfDay).toBeInstanceOf(Date);
    // End of day should be 23:59:59.999
    expect(endOfDay.getTime() - getStartOfDayInTimezone(now).getTime()).toBeCloseTo(24 * 60 * 60 * 1000 - 1, -1);
  });

  it("should correctly identify if two dates are the same day", () => {
    const date1 = new Date("2024-04-21T10:00:00Z");
    const date2 = new Date("2024-04-21T20:00:00Z");
    const date3 = new Date("2024-04-22T10:00:00Z");

    expect(isSameDay(date1, date2)).toBe(true);
    expect(isSameDay(date1, date3)).toBe(false);
  });

  it("should handle timestamp numbers correctly", () => {
    const now = new Date();
    const timestamp = now.getTime();
    const startOfDay = getStartOfDayInTimezone(timestamp);
    expect(startOfDay).toBeInstanceOf(Date);
  });

  it("should correctly identify today's date", () => {
    const now = new Date();
    const today = getTodayInTimezone();
    // Today should be the start of the current day in America/Toronto
    const startOfToday = getStartOfDayInTimezone(now);
    expect(today.getTime()).toBe(startOfToday.getTime());
  });

  it("should handle timezone offset correctly for DST transitions", () => {
    // Test a date during DST (summer)
    const summerDate = new Date("2024-07-15T12:00:00Z");
    const summerStart = getStartOfDayInTimezone(summerDate);
    expect(summerStart).toBeInstanceOf(Date);

    // Test a date outside DST (winter)
    const winterDate = new Date("2024-01-15T12:00:00Z");
    const winterStart = getStartOfDayInTimezone(winterDate);
    expect(winterStart).toBeInstanceOf(Date);

    // Both should be valid dates
    expect(summerStart.getTime()).toBeLessThan(summerDate.getTime());
    expect(winterStart.getTime()).toBeLessThan(winterDate.getTime());
  });
});
