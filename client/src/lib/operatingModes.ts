/**
 * Client-side Operating Modes Utility
 * Mirrors server-side logic for dual-mode operation
 */

export type OperatingMode = 'pre-operation' | 'active-operations' | 'closed';

/**
 * Get current operating mode
 */
export function getOperatingMode(now: Date = new Date()): OperatingMode {
  const hour = now.getHours();
  const dayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday

  const isFridayOrSaturday = dayOfWeek === 5 || dayOfWeek === 6;
  const closingHour = isFridayOrSaturday ? 23 : 22;

  if (hour >= 16 && hour < closingHour) {
    return 'active-operations';
  } else if (hour >= closingHour || hour < 4) {
    return 'closed';
  } else {
    return 'pre-operation';
  }
}

/**
 * Check if currently in pre-operation mode
 */
export function isPreOperationMode(now: Date = new Date()): boolean {
  return getOperatingMode(now) === 'pre-operation';
}

/**
 * Check if currently in active operations mode
 */
export function isActiveOperationsMode(now: Date = new Date()): boolean {
  return getOperatingMode(now) === 'active-operations';
}

/**
 * Check if currently in closed mode
 */
export function isClosedMode(now: Date = new Date()): boolean {
  return getOperatingMode(now) === 'closed';
}

/**
 * Get mode info
 */
export function getModeInfo(now: Date = new Date()): {
  mode: OperatingMode;
  isPreOperation: boolean;
  isActiveOperations: boolean;
  isClosed: boolean;
  forecastingActive: boolean;
  liveMetricsActive: boolean;
} {
  const mode = getOperatingMode(now);

  return {
    mode,
    isPreOperation: mode === 'pre-operation',
    isActiveOperations: mode === 'active-operations',
    isClosed: mode === 'closed',
    forecastingActive: mode !== 'closed',
    liveMetricsActive: mode === 'active-operations',
  };
}

/**
 * Get mode badge info
 */
export function getModeBadgeInfo(now: Date = new Date()): {
  mode: OperatingMode;
  label: string;
  emoji: string;
  color: string;
  bgColor: string;
} {
  const mode = getOperatingMode(now);

  if (mode === 'pre-operation') {
    return {
      mode: 'pre-operation',
      label: 'Pre-Operation Forecasting',
      emoji: '🔵',
      color: 'text-blue-900',
      bgColor: 'bg-blue-100',
    };
  } else if (mode === 'active-operations') {
    return {
      mode: 'active-operations',
      label: 'Active Operations',
      emoji: '🟢',
      color: 'text-green-900',
      bgColor: 'bg-green-100',
    };
  } else {
    return {
      mode: 'closed',
      label: 'Business Closed',
      emoji: '🔴',
      color: 'text-red-900',
      bgColor: 'bg-red-100',
    };
  }
}

/**
 * Get time until next mode
 */
export function getTimeUntilNextMode(now: Date = new Date()): {
  hours: number;
  minutes: number;
  formatted: string;
} {
  const hour = now.getHours();
  const minutes = now.getMinutes();
  const dayOfWeek = now.getDay();
  const isFridayOrSaturday = dayOfWeek === 5 || dayOfWeek === 6;
  const closingHour = isFridayOrSaturday ? 23 : 22;

  let nextHour: number;
  let nextDay: number = 0;

  if (hour < 16) {
    // Before 4 PM - next mode is active operations at 4 PM
    nextHour = 16;
  } else if (hour < closingHour) {
    // During operations - next mode is closed at closing hour
    nextHour = closingHour;
  } else {
    // After closing - next mode is pre-operation at 4 AM tomorrow
    nextHour = 4;
    nextDay = 1;
  }

  const nextModeTime = new Date(now);
  nextModeTime.setDate(nextModeTime.getDate() + nextDay);
  nextModeTime.setHours(nextHour, 0, 0, 0);

  const diff = nextModeTime.getTime() - now.getTime();
  const totalMinutes = Math.floor(diff / 60000);
  const diffHours = Math.floor(totalMinutes / 60);
  const diffMinutes = totalMinutes % 60;

  return {
    hours: diffHours,
    minutes: diffMinutes,
    formatted: `${diffHours}h ${diffMinutes}m`,
  };
}

/**
 * Should forecasting be active
 */
export function shouldForecastingBeActive(now: Date = new Date()): boolean {
  const mode = getOperatingMode(now);
  return mode !== 'closed';
}

/**
 * Should live metrics be active
 */
export function shouldLiveMetricsBeActive(now: Date = new Date()): boolean {
  return getOperatingMode(now) === 'active-operations';
}
