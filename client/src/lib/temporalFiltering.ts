/**
 * Temporal Filtering Utilities
 * Provides filtering capabilities for delivery data by time periods
 */

export type TimePeriodType = 'daily' | 'weekly' | 'monthly';

export interface TimeFilterOptions {
  periodType: TimePeriodType;
  startDate: Date;
  endDate: Date;
  startHour?: number; // 0-23
  endHour?: number; // 0-23
  daysOfWeek?: number[]; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
}

export interface DeliveryPoint {
  id: number;
  latitude: number;
  longitude: number;
  timestamp: number; // Unix timestamp in milliseconds
}

/**
 * Get date range for a daily filter
 */
export function getDailyDateRange(date: Date): { start: Date; end: Date } {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);

  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

/**
 * Get date range for a weekly filter (Monday to Sunday)
 */
export function getWeeklyDateRange(date: Date): { start: Date; end: Date } {
  const start = new Date(date);
  const day = start.getDay();
  const diff = start.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
  start.setDate(diff);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

/**
 * Get date range for a monthly filter
 */
export function getMonthlyDateRange(date: Date): { start: Date; end: Date } {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  start.setHours(0, 0, 0, 0);

  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

/**
 * Get date range based on period type
 */
export function getDateRange(
  date: Date,
  periodType: TimePeriodType
): { start: Date; end: Date } {
  switch (periodType) {
    case 'daily':
      return getDailyDateRange(date);
    case 'weekly':
      return getWeeklyDateRange(date);
    case 'monthly':
      return getMonthlyDateRange(date);
    default:
      return getDailyDateRange(date);
  }
}

/**
 * Filter delivery points by date range
 */
export function filterByDateRange(
  points: DeliveryPoint[],
  startDate: Date,
  endDate: Date
): DeliveryPoint[] {
  const startTime = startDate.getTime();
  const endTime = endDate.getTime();

  return points.filter((point) => point.timestamp >= startTime && point.timestamp <= endTime);
}

/**
 * Filter delivery points by hour range
 */
export function filterByHourRange(
  points: DeliveryPoint[],
  startHour: number,
  endHour: number
): DeliveryPoint[] {
  return points.filter((point) => {
    const hour = new Date(point.timestamp).getHours();
    if (startHour <= endHour) {
      return hour >= startHour && hour < endHour;
    } else {
      // Handle ranges that cross midnight (e.g., 22:00 to 06:00)
      return hour >= startHour || hour < endHour;
    }
  });
}

/**
 * Filter delivery points by day of week
 */
export function filterByDayOfWeek(
  points: DeliveryPoint[],
  daysOfWeek: number[]
): DeliveryPoint[] {
  return points.filter((point) => {
    const dayOfWeek = new Date(point.timestamp).getDay();
    return daysOfWeek.includes(dayOfWeek);
  });
}

/**
 * Apply all temporal filters at once
 */
export function applyTemporalFilters(
  points: DeliveryPoint[],
  options: TimeFilterOptions
): DeliveryPoint[] {
  let filtered = points;

  // Filter by date range
  filtered = filterByDateRange(filtered, options.startDate, options.endDate);

  // Filter by hour range if specified
  if (options.startHour !== undefined && options.endHour !== undefined) {
    filtered = filterByHourRange(filtered, options.startHour, options.endHour);
  }

  // Filter by day of week if specified
  if (options.daysOfWeek && options.daysOfWeek.length > 0) {
    filtered = filterByDayOfWeek(filtered, options.daysOfWeek);
  }

  return filtered;
}

/**
 * Get common time period presets
 */
export const TIME_PRESETS = {
  BREAKFAST: { startHour: 7, endHour: 11, label: 'Breakfast (7 AM - 11 AM)' },
  LUNCH: { startHour: 11, endHour: 14, label: 'Lunch (11 AM - 2 PM)' },
  AFTERNOON: { startHour: 14, endHour: 17, label: 'Afternoon (2 PM - 5 PM)' },
  DINNER: { startHour: 17, endHour: 21, label: 'Dinner (5 PM - 9 PM)' },
  LATE_NIGHT: { startHour: 21, endHour: 23, label: 'Late Night (9 PM - 11 PM)' },
  BUSINESS_HOURS: { startHour: 9, endHour: 17, label: 'Business Hours (9 AM - 5 PM)' },
  PEAK_HOURS: { startHour: 11, endHour: 14, label: 'Peak Hours (11 AM - 2 PM)' },
};

/**
 * Get day of week names
 */
export const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

/**
 * Get weekdays (Monday-Friday)
 */
export function getWeekdays(): number[] {
  return [1, 2, 3, 4, 5];
}

/**
 * Get weekends (Saturday-Sunday)
 */
export function getWeekends(): number[] {
  return [0, 6];
}

/**
 * Format date range for display
 */
export function formatDateRange(startDate: Date, endDate: Date): string {
  const start = startDate.toLocaleDateString();
  const end = endDate.toLocaleDateString();
  return `${start} - ${end}`;
}

/**
 * Format hour range for display
 */
export function formatHourRange(startHour: number, endHour: number): string {
  const formatHour = (hour: number) => {
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour} ${ampm}`;
  };

  return `${formatHour(startHour)} - ${formatHour(endHour)}`;
}

/**
 * Calculate statistics for a time period
 */
export interface TimeStatistics {
  totalPoints: number;
  dateRange: string;
  hourRange?: string;
  daysIncluded: string[];
  averagePointsPerDay: number;
}

export function calculateTimeStatistics(
  points: DeliveryPoint[],
  options: TimeFilterOptions
): TimeStatistics {
  const dateRange = formatDateRange(options.startDate, options.endDate);

  const daysIncluded = options.daysOfWeek
    ? options.daysOfWeek.map((day) => DAY_NAMES[day])
    : DAY_NAMES;

  const daysDiff =
    (options.endDate.getTime() - options.startDate.getTime()) / (1000 * 60 * 60 * 24) + 1;
  const averagePointsPerDay = points.length / daysDiff;

  const hourRange =
    options.startHour !== undefined && options.endHour !== undefined
      ? formatHourRange(options.startHour, options.endHour)
      : undefined;

  return {
    totalPoints: points.length,
    dateRange,
    hourRange,
    daysIncluded,
    averagePointsPerDay,
  };
}
