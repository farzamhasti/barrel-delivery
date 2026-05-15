/**
 * Operating Hours Utility Module
 * 
 * Defines and enforces delivery business operating hours:
 * - Sunday-Thursday: 4:00 PM - 10:00 PM (6 hours)
 * - Friday-Saturday: 4:00 PM - 11:00 PM (7 hours)
 */

/**
 * Operating hours configuration
 * Hours are in 24-hour format (16 = 4 PM, 22 = 10 PM, 23 = 11 PM)
 */
export const OPERATING_HOURS = {
  WEEKDAY: {
    // Sunday (0), Monday (1), Tuesday (2), Wednesday (3), Thursday (4)
    days: [0, 1, 2, 3, 4],
    openHour: 16,      // 4:00 PM
    closeHour: 22,     // 10:00 PM (exclusive, so last order at 21:59)
    durationHours: 6,
  },
  FRIDAY: {
    day: 5,
    openHour: 16,      // 4:00 PM
    closeHour: 23,     // 11:00 PM (exclusive, so last order at 22:59)
    durationHours: 7,
  },
  SATURDAY: {
    day: 6,
    openHour: 16,      // 4:00 PM
    closeHour: 23,     // 11:00 PM (exclusive, so last order at 22:59)
    durationHours: 7,
  },
};

/**
 * Peak hour windows for demand patterns
 */
export const PEAK_HOURS = {
  EARLY_PEAK: { start: 17, end: 19 },      // 5 PM - 7 PM
  MAIN_PEAK: { start: 19, end: 21 },       // 7 PM - 9 PM
  LATE_PEAK: { start: 21, end: 22 },       // 9 PM - 10 PM (weekdays)
  WEEKEND_LATE: { start: 21, end: 23 },    // 9 PM - 11 PM (Fri/Sat)
};

/**
 * Pre-closing surge window (last 30 minutes before close)
 */
export const PRE_CLOSING_SURGE = {
  WEEKDAY_MINUTES: 30,    // 9:30 PM - 10:00 PM
  WEEKEND_MINUTES: 30,    // 10:30 PM - 11:00 PM
};

/**
 * Day category enumeration
 */
export enum DayCategory {
  WEEKDAY = 'weekday',
  FRIDAY = 'friday',
  SATURDAY = 'saturday',
}

/**
 * Check if a given time is within operating hours
 * @param date Date to check (or current time if not provided)
 * @returns true if within operating hours, false otherwise
 */
export function isWithinOperatingHours(date: Date = new Date()): boolean {
  const dayOfWeek = date.getDay();
  const hour = date.getHours();
  const minute = date.getMinutes();
  const totalMinutes = hour * 60 + minute;

  // Check if it's a weekday (Sun-Thu)
  if (OPERATING_HOURS.WEEKDAY.days.includes(dayOfWeek)) {
    const openMinutes = OPERATING_HOURS.WEEKDAY.openHour * 60;
    const closeMinutes = OPERATING_HOURS.WEEKDAY.closeHour * 60;
    return totalMinutes >= openMinutes && totalMinutes < closeMinutes;
  }

  // Check if it's Friday
  if (dayOfWeek === OPERATING_HOURS.FRIDAY.day) {
    const openMinutes = OPERATING_HOURS.FRIDAY.openHour * 60;
    const closeMinutes = OPERATING_HOURS.FRIDAY.closeHour * 60;
    return totalMinutes >= openMinutes && totalMinutes < closeMinutes;
  }

  // Check if it's Saturday
  if (dayOfWeek === OPERATING_HOURS.SATURDAY.day) {
    const openMinutes = OPERATING_HOURS.SATURDAY.openHour * 60;
    const closeMinutes = OPERATING_HOURS.SATURDAY.closeHour * 60;
    return totalMinutes >= openMinutes && totalMinutes < closeMinutes;
  }

  return false;
}

/**
 * Get the day category for a given date
 * @param date Date to categorize
 * @returns DayCategory (WEEKDAY, FRIDAY, or SATURDAY)
 */
export function getDayCategory(date: Date = new Date()): DayCategory {
  const dayOfWeek = date.getDay();

  if (dayOfWeek === OPERATING_HOURS.FRIDAY.day) {
    return DayCategory.FRIDAY;
  }

  if (dayOfWeek === OPERATING_HOURS.SATURDAY.day) {
    return DayCategory.SATURDAY;
  }

  return DayCategory.WEEKDAY;
}

/**
 * Get operating hours for a specific day
 * @param dayOfWeek Day of week (0-6, where 0 = Sunday)
 * @returns Object with openHour and closeHour
 */
export function getOperatingHoursForDay(dayOfWeek: number): { openHour: number; closeHour: number } {
  if (dayOfWeek === OPERATING_HOURS.FRIDAY.day) {
    return {
      openHour: OPERATING_HOURS.FRIDAY.openHour,
      closeHour: OPERATING_HOURS.FRIDAY.closeHour,
    };
  }

  if (dayOfWeek === OPERATING_HOURS.SATURDAY.day) {
    return {
      openHour: OPERATING_HOURS.SATURDAY.openHour,
      closeHour: OPERATING_HOURS.SATURDAY.closeHour,
    };
  }

  return {
    openHour: OPERATING_HOURS.WEEKDAY.openHour,
    closeHour: OPERATING_HOURS.WEEKDAY.closeHour,
  };
}

/**
 * Check if a given time is during peak hours
 * @param date Date to check
 * @returns true if during any peak hour window
 */
export function isDuringPeakHours(date: Date = new Date()): boolean {
  const hour = date.getHours();
  const dayOfWeek = date.getDay();
  const isWeekend = dayOfWeek === OPERATING_HOURS.FRIDAY.day || dayOfWeek === OPERATING_HOURS.SATURDAY.day;

  // Check early peak (5-7 PM)
  if (hour >= PEAK_HOURS.EARLY_PEAK.start && hour < PEAK_HOURS.EARLY_PEAK.end) {
    return true;
  }

  // Check main peak (7-9 PM)
  if (hour >= PEAK_HOURS.MAIN_PEAK.start && hour < PEAK_HOURS.MAIN_PEAK.end) {
    return true;
  }

  // Check late peak (9-10 PM weekdays, 9-11 PM Fri/Sat)
  if (isWeekend) {
    if (hour >= PEAK_HOURS.WEEKEND_LATE.start && hour < PEAK_HOURS.WEEKEND_LATE.end) {
      return true;
    }
  } else {
    if (hour >= PEAK_HOURS.LATE_PEAK.start && hour < PEAK_HOURS.LATE_PEAK.end) {
      return true;
    }
  }

  return false;
}

/**
 * Check if a given time is during pre-closing surge window
 * @param date Date to check
 * @returns true if within 30 minutes before closing
 */
export function isDuringPreClosingSurge(date: Date = new Date()): boolean {
  const hour = date.getHours();
  const minute = date.getMinutes();
  const dayOfWeek = date.getDay();

  // Weekday: 9:30 PM - 10:00 PM
  if (OPERATING_HOURS.WEEKDAY.days.includes(dayOfWeek)) {
    const closingHour = OPERATING_HOURS.WEEKDAY.closeHour - 1; // 21 (9 PM)
    const closingMinute = 60 - PRE_CLOSING_SURGE.WEEKDAY_MINUTES; // 30
    return hour === closingHour && minute >= closingMinute;
  }

  // Friday/Saturday: 10:30 PM - 11:00 PM
  if (dayOfWeek === OPERATING_HOURS.FRIDAY.day || dayOfWeek === OPERATING_HOURS.SATURDAY.day) {
    const closingHour = OPERATING_HOURS.FRIDAY.closeHour - 1; // 22 (10 PM)
    const closingMinute = 60 - PRE_CLOSING_SURGE.WEEKEND_MINUTES; // 30
    return hour === closingHour && minute >= closingMinute;
  }

  return false;
}

/**
 * Get minutes until next operating period
 * @param date Current date/time
 * @returns Minutes until next opening, or 0 if currently open
 */
export function getMinutesUntilNextOpen(date: Date = new Date()): number {
  if (isWithinOperatingHours(date)) {
    return 0;
  }

  const dayOfWeek = date.getDay();
  const hour = date.getHours();
  const minute = date.getMinutes();
  const currentMinutes = hour * 60 + minute;

  // Get today's opening time
  const todayOpen = OPERATING_HOURS.WEEKDAY.openHour * 60;

  // If before today's opening, return minutes until today's opening
  if (currentMinutes < todayOpen) {
    return todayOpen - currentMinutes;
  }

  // Otherwise, calculate minutes until tomorrow's opening
  const minutesUntilMidnight = 24 * 60 - currentMinutes;
  return minutesUntilMidnight + todayOpen;
}

/**
 * Get current business status
 * @param date Current date/time
 * @returns Object with status and next event info
 */
export function getBusinessStatus(date: Date = new Date()): {
  isOpen: boolean;
  dayCategory: DayCategory;
  currentHour: number;
  minutesUntilClose?: number;
  minutesUntilOpen?: number;
} {
  const isOpen = isWithinOperatingHours(date);
  const dayCategory = getDayCategory(date);
  const hour = date.getHours();
  const minute = date.getMinutes();

  if (isOpen) {
    const { closeHour } = getOperatingHoursForDay(date.getDay());
    const minutesUntilClose = (closeHour - hour) * 60 - minute;
    return {
      isOpen: true,
      dayCategory,
      currentHour: hour,
      minutesUntilClose,
    };
  } else {
    const minutesUntilOpen = getMinutesUntilNextOpen(date);
    return {
      isOpen: false,
      dayCategory,
      currentHour: hour,
      minutesUntilOpen,
    };
  }
}

/**
 * Extract temporal features for ML model training
 * @param date Date to extract features from
 * @returns Object with temporal features
 */
export function extractTemporalFeatures(date: Date = new Date()): {
  dayOfWeek: number;
  dayCategory: DayCategory;
  hour: number;
  minute: number;
  isWithinOperatingHours: boolean;
  isPeakHour: boolean;
  isPreClosingSurge: boolean;
  hoursSinceOpen: number;
  minutesUntilClose: number;
} {
  const dayOfWeek = date.getDay();
  const hour = date.getHours();
  const minute = date.getMinutes();
  const dayCategory = getDayCategory(date);
  const isOpen = isWithinOperatingHours(date);
  const isPeak = isDuringPeakHours(date);
  const isPreClosing = isDuringPreClosingSurge(date);

  const { openHour, closeHour } = getOperatingHoursForDay(dayOfWeek);
  const hoursSinceOpen = isOpen ? hour - openHour : -1;
  const minutesUntilClose = isOpen ? (closeHour - hour) * 60 - minute : -1;

  return {
    dayOfWeek,
    dayCategory,
    hour,
    minute,
    isWithinOperatingHours: isOpen,
    isPeakHour: isPeak,
    isPreClosingSurge: isPreClosing,
    hoursSinceOpen,
    minutesUntilClose,
  };
}
