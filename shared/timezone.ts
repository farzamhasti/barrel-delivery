/**
 * Timezone utilities for handling America/Toronto (Eastern Time)
 * All timestamps are stored as UTC in the database
 * These utilities convert to/from America/Toronto for display and filtering
 */

const TIMEZONE = "America/Toronto";

/**
 * Get today's date in America/Toronto timezone
 * Returns a Date object set to midnight (00:00:00) in the specified timezone
 */
export function getTodayInTimezone(): Date {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(now);
  const year = parseInt(parts.find((p) => p.type === "year")?.value || "2024");
  const month = parseInt(parts.find((p) => p.type === "month")?.value || "1") - 1;
  const day = parseInt(parts.find((p) => p.type === "day")?.value || "1");

  // Create a date at midnight in the local timezone, then adjust to UTC
  const localDate = new Date(year, month, day, 0, 0, 0, 0);
  const offset = getTimezoneOffset(localDate);
  return new Date(localDate.getTime() - offset);
}

/**
 * Get the start of day (midnight) for a given date in America/Toronto timezone
 */
export function getStartOfDayInTimezone(date: Date): Date {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(date);
  const year = parseInt(parts.find((p) => p.type === "year")?.value || "2024");
  const month = parseInt(parts.find((p) => p.type === "month")?.value || "1") - 1;
  const day = parseInt(parts.find((p) => p.type === "day")?.value || "1");

  const localDate = new Date(year, month, day, 0, 0, 0, 0);
  const offset = getTimezoneOffset(localDate);
  return new Date(localDate.getTime() - offset);
}

/**
 * Get the end of day (23:59:59.999) for a given date in America/Toronto timezone
 */
export function getEndOfDayInTimezone(date: Date): Date {
  const startOfDay = getStartOfDayInTimezone(date);
  return new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000 - 1);
}

/**
 * Check if a timestamp falls on today in America/Toronto timezone
 */
export function isToday(timestamp: Date | number): boolean {
  const date = typeof timestamp === "number" ? new Date(timestamp) : timestamp;
  const today = getTodayInTimezone();
  const startOfDay = getStartOfDayInTimezone(today);
  const endOfDay = getEndOfDayInTimezone(today);

  return date.getTime() >= startOfDay.getTime() && date.getTime() <= endOfDay.getTime();
}

/**
 * Check if two dates are on the same day in America/Toronto timezone
 */
export function isSameDay(date1: Date | number, date2: Date | number): boolean {
  const d1 = typeof date1 === "number" ? new Date(date1) : date1;
  const d2 = typeof date2 === "number" ? new Date(date2) : date2;

  const startOfDay1 = getStartOfDayInTimezone(d1);
  const startOfDay2 = getStartOfDayInTimezone(d2);

  return startOfDay1.getTime() === startOfDay2.getTime();
}

/**
 * Get the timezone offset in milliseconds for a given date
 * This accounts for daylight saving time
 */
function getTimezoneOffset(date: Date): number {
  const utcDate = new Date(date.toLocaleString("en-US", { timeZone: "UTC" }));
  const tzDate = new Date(date.toLocaleString("en-US", { timeZone: TIMEZONE }));
  return utcDate.getTime() - tzDate.getTime();
}

/**
 * Format a date for display in America/Toronto timezone
 */
export function formatDateInTimezone(date: Date | number, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === "number" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    ...options,
  }).format(d);
}

/**
 * Format a date and time for display in America/Toronto timezone
 */
export function formatDateTimeInTimezone(date: Date | number): string {
  return formatDateInTimezone(date, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}
