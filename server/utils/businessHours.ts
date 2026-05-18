/**
 * Business Hours Management Utility
 * 
 * Enforces strict operating hours for Barrel Delivery:
 * - Sunday to Thursday: 4:00 PM - 10:00 PM (16:00 - 22:00)
 * - Friday & Saturday: 4:00 PM - 11:00 PM (16:00 - 23:00)
 * 
 * Outside operating hours:
 * - All predicting is disabled
 * - All alerts are disabled
 * - All predicts are disabled
 * - System shows "Business Closed" mode
 */

import { DateTime } from 'luxon';

export interface OperatingHours {
  dayOfWeek: number; // 0 = Sunday, 6 = Saturday
  startHour: number;
  endHour: number;
  dayName: string;
}

export interface BusinessStatus {
  isOpen: boolean;
  currentTime: DateTime;
  dayOfWeek: string;
  currentHour: number;
  nextOpeningTime: DateTime;
  nextClosingTime: DateTime;
  hoursUntilOpen: number;
  hoursUntilClose: number;
  message: string;
}

export interface PredictingStatus {
  canPredict: boolean;
  canAlert: boolean;
  canPredict: boolean;
  reason: string;
  nextAvailableTime: DateTime;
}

// Operating hours configuration
const OPERATING_SCHEDULE: OperatingHours[] = [
  { dayOfWeek: 0, startHour: 16, endHour: 22, dayName: 'Sunday' },      // 4 PM - 10 PM
  { dayOfWeek: 1, startHour: 16, endHour: 22, dayName: 'Monday' },      // 4 PM - 10 PM
  { dayOfWeek: 2, startHour: 16, endHour: 22, dayName: 'Tuesday' },     // 4 PM - 10 PM
  { dayOfWeek: 3, startHour: 16, endHour: 22, dayName: 'Wednesday' },   // 4 PM - 10 PM
  { dayOfWeek: 4, startHour: 16, endHour: 22, dayName: 'Thursday' },    // 4 PM - 10 PM
  { dayOfWeek: 5, startHour: 16, endHour: 23, dayName: 'Friday' },      // 4 PM - 11 PM
  { dayOfWeek: 6, startHour: 16, endHour: 23, dayName: 'Saturday' },    // 4 PM - 11 PM
];

/**
 * Get operating hours for a specific day of week
 */
export function getOperatingHours(dayOfWeek: number): OperatingHours | null {
  return OPERATING_SCHEDULE.find(h => h.dayOfWeek === dayOfWeek) || null;
}

/**
 * Check if current time is within operating hours
 */
export function isOperatingHours(time?: DateTime): boolean {
  const now = time || DateTime.now();
  const dayOfWeek = now.weekday % 7; // Luxon uses 1-7, convert to 0-6
  const hour = now.hour;

  const hours = getOperatingHours(dayOfWeek);
  if (!hours) return false;

  return hour >= hours.startHour && hour < hours.endHour;
}

/**
 * Get current business status
 */
export function getBusinessStatus(time?: DateTime): BusinessStatus {
  const now = time || DateTime.now();
  const dayOfWeek = now.weekday % 7;
  const hour = now.hour;
  const dayName = now.toFormat('EEEE');

  const hours = getOperatingHours(dayOfWeek);
  if (!hours) {
    return {
      isOpen: false,
      currentTime: now,
      dayOfWeek: dayName,
      currentHour: hour,
      nextOpeningTime: getNextOpeningTime(now),
      nextClosingTime: getNextClosingTime(now),
      hoursUntilOpen: getHoursUntilOpen(now),
      hoursUntilClose: getHoursUntilClose(now),
      message: 'Business Closed',
    };
  }

  const isOpen = hour >= hours.startHour && hour < hours.endHour;

  return {
    isOpen,
    currentTime: now,
    dayOfWeek: dayName,
    currentHour: hour,
    nextOpeningTime: getNextOpeningTime(now),
    nextClosingTime: getNextClosingTime(now),
    hoursUntilOpen: getHoursUntilOpen(now),
    hoursUntilClose: getHoursUntilClose(now),
    message: isOpen ? 'Business Open' : 'Business Closed',
  };
}

/**
 * Get next opening time
 */
export function getNextOpeningTime(time?: DateTime): DateTime {
  const now = time || DateTime.now();
  let checkDate = now.startOf('day');

  // Check next 7 days
  for (let i = 0; i < 7; i++) {
    const dayOfWeek = checkDate.weekday % 7;
    const hours = getOperatingHours(dayOfWeek);

    if (hours) {
      const openingTime = checkDate.set({ hour: hours.startHour, minute: 0, second: 0 });

      // If this is today and opening time hasn't passed, return it
      if (checkDate.hasSame(now, 'day') && openingTime > now) {
        return openingTime;
      }

      // If this is tomorrow or later, return the opening time
      if (checkDate > now.startOf('day')) {
        return openingTime;
      }
    }

    checkDate = checkDate.plus({ days: 1 });
  }

  // Fallback (should not reach here)
  return now.plus({ days: 1 }).startOf('day').set({ hour: 16 });
}

/**
 * Get next closing time
 */
export function getNextClosingTime(time?: DateTime): DateTime {
  const now = time || DateTime.now();
  const dayOfWeek = now.weekday % 7;
  const hours = getOperatingHours(dayOfWeek);

  if (!hours) {
    return getNextOpeningTime(now).plus({ hours: 6 }); // Assume 6 hour shift
  }

  const closingTime = now.startOf('day').set({ hour: hours.endHour, minute: 0, second: 0 });

  if (closingTime > now) {
    return closingTime;
  }

  // If closing time has passed today, return tomorrow's closing time
  return getNextOpeningTime(now).plus({ hours: 6 });
}

/**
 * Get hours until next opening
 */
export function getHoursUntilOpen(time?: DateTime): number {
  const now = time || DateTime.now();
  const nextOpen = getNextOpeningTime(now);
  const diff = nextOpen.diff(now, 'hours');
  return Math.ceil(diff.hours);
}

/**
 * Get hours until closing
 */
export function getHoursUntilClose(time?: DateTime): number {
  const now = time || DateTime.now();

  if (!isOperatingHours(now)) {
    return 0;
  }

  const nextClose = getNextClosingTime(now);
  const diff = nextClose.diff(now, 'hours');
  return Math.floor(diff.hours);
}

/**
 * Get predicting status based on business hours
 */
export function getPredictingStatus(time?: DateTime): PredictingStatus {
  const now = time || DateTime.now();
  const isOpen = isOperatingHours(now);

  if (!isOpen) {
    const nextOpen = getNextOpeningTime(now);
    return {
      canPredict: false,
      canAlert: false,
      reason: `Business closed. Predicting paused until ${nextOpen.toFormat('EEEE, h:mm a')}`,
      nextAvailableTime: nextOpen,
    };
  }

  return {
    canPredict: true,
    canAlert: true,
    reason: 'Business open. Predicting active.',
    nextAvailableTime: getNextClosingTime(now),
  };
}

/**
 * Get remaining operating time in minutes
 */
export function getRemainingOperatingMinutes(time?: DateTime): number {
  const now = time || DateTime.now();

  if (!isOperatingHours(now)) {
    return 0;
  }

  const nextClose = getNextClosingTime(now);
  const diff = nextClose.diff(now, 'minutes');
  return Math.floor(diff.minutes);
}

/**
 * Get operating hours for today
 */
export function getTodayOperatingHours(time?: DateTime): OperatingHours | null {
  const now = time || DateTime.now();
  const dayOfWeek = now.weekday % 7;
  return getOperatingHours(dayOfWeek);
}

/**
 * Get operating hours for a specific date
 */
export function getOperatingHoursForDate(date: DateTime): OperatingHours | null {
  const dayOfWeek = date.weekday % 7;
  return getOperatingHours(dayOfWeek);
}

/**
 * Format operating hours for display
 */
export function formatOperatingHours(hours: OperatingHours): string {
  const startTime = DateTime.now().set({ hour: hours.startHour }).toFormat('h:mm a');
  const endTime = DateTime.now().set({ hour: hours.endHour }).toFormat('h:mm a');
  return `${hours.dayName}: ${startTime} - ${endTime}`;
}

/**
 * Get all operating hours for display
 */
export function getAllOperatingHours(): string[] {
  return OPERATING_SCHEDULE.map(hours => formatOperatingHours(hours));
}

/**
 * Check if a specific time is within operating hours
 */
export function isTimeWithinOperatingHours(date: DateTime, hour: number): boolean {
  const dayOfWeek = date.weekday % 7;
  const hours = getOperatingHours(dayOfWeek);

  if (!hours) return false;

  return hour >= hours.startHour && hour < hours.endHour;
}

/**
 * Get business status message for UI
 */
export function getBusinessStatusMessage(time?: DateTime): string {
  const status = getBusinessStatus(time);

  if (status.isOpen) {
    const hoursLeft = status.hoursUntilClose;
    return `Business Open • Closes in ${hoursLeft} hour${hoursLeft !== 1 ? 's' : ''}`;
  }

  const nextOpen = status.nextOpeningTime;
  const hoursUntil = status.hoursUntilOpen;
  return `Business Closed • Opens ${nextOpen.toFormat('EEEE')} at ${nextOpen.toFormat('h:mm a')} (${hoursUntil}h away)`;
}

/**
 * Get predicting disabled message for UI
 */
export function getPredictingDisabledMessage(time?: DateTime): string {
  const status = getPredictingStatus(time);

  if (status.canPredict) {
    return '';
  }

  return `⏸️ ${status.reason}`;
}

/**
 * Validate if predicting should be allowed
 */
export function shouldAllowPredicting(time?: DateTime): boolean {
  const status = getPredictingStatus(time);
  return status.canPredict;
}

/**
 * Validate if alerts should be allowed
 */
export function shouldAllowAlerts(time?: DateTime): boolean {
  const status = getPredictingStatus(time);
  return status.canAlert;
}

/**
 * Validate if predicts should be allowed
 */
export function shouldAllowPredicts(time?: DateTime): boolean {
  const status = getPredictingStatus(time);
  return status.canPredict;
}

export default {
  isOperatingHours,
  getBusinessStatus,
  getNextOpeningTime,
  getNextClosingTime,
  getHoursUntilOpen,
  getHoursUntilClose,
  getPredictingStatus,
  getRemainingOperatingMinutes,
  getTodayOperatingHours,
  getOperatingHoursForDate,
  formatOperatingHours,
  getAllOperatingHours,
  isTimeWithinOperatingHours,
  getBusinessStatusMessage,
  getPredictingDisabledMessage,
  shouldAllowPredicting,
  shouldAllowAlerts,
  shouldAllowPredicts,
};
