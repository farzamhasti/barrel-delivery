/**
 * Operating Modes Utility
 * Phase 97: Dual-mode operation (Pre-Operation Predicting vs Active Operations)
 * 
 * Distinguishes between:
 * 1. Pre-Operation Predicting Mode (before 4 PM): Predicting active, live metrics inactive
 * 2. Active Operations Mode (4 PM - 10/11 PM): Both predicting and live metrics active
 * 3. Closed Mode (after 10/11 PM): All metrics paused, next-day planning available
 */

export type OperatingMode = 'pre-operation' | 'active-operations' | 'closed';

interface ModeInfo {
  mode: OperatingMode;
  isPreOperation: boolean;
  isActiveOperations: boolean;
  isClosed: boolean;
  predictingActive: boolean;
  liveMetricsActive: boolean;
  nextModeTime: Date;
  nextModeLabel: string;
  modeDescription: string;
}

/**
 * Get current operating mode
 */
export function getOperatingMode(now: Date = new Date()): OperatingMode {
  const hour = now.getHours();
  const dayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday

  // Check if it's Friday (5) or Saturday (6)
  const isFridayOrSaturday = dayOfWeek === 5 || dayOfWeek === 6;
  const closingHour = isFridayOrSaturday ? 23 : 22; // 11 PM for Fri/Sat, 10 PM for others

  // Operating hours: 4 PM (16:00) to 10 PM (22:00) or 11 PM (23:00)
  if (hour >= 16 && hour < closingHour) {
    return 'active-operations';
  } else if (hour >= closingHour || hour < 4) {
    return 'closed';
  } else {
    // 4 AM to 4 PM
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
 * Get detailed mode information
 */
export function getModeInfo(now: Date = new Date()): ModeInfo {
  const mode = getOperatingMode(now);
  const hour = now.getHours();
  const dayOfWeek = now.getDay();
  const isFridayOrSaturday = dayOfWeek === 5 || dayOfWeek === 6;
  const closingHour = isFridayOrSaturday ? 23 : 22;

  let nextModeTime: Date;
  let nextModeLabel: string;
  let modeDescription: string;
  let predictingActive: boolean;
  let liveMetricsActive: boolean;

  if (mode === 'pre-operation') {
    // Next mode is active operations at 4 PM
    nextModeTime = new Date(now);
    nextModeTime.setHours(16, 0, 0, 0);
    if (nextModeTime <= now) {
      nextModeTime.setDate(nextModeTime.getDate() + 1);
    }
    nextModeLabel = 'Active Operations';
    modeDescription = 'Pre-Operation Predicting Mode - Planning for tonight\'s delivery service';
    predictingActive = true;
    liveMetricsActive = false;
  } else if (mode === 'active-operations') {
    // Next mode is closed at closing hour
    nextModeTime = new Date(now);
    nextModeTime.setHours(closingHour, 0, 0, 0);
    nextModeLabel = 'Business Closed';
    modeDescription = `Active Operations Mode - Live delivery tracking and predicting (closes at ${closingHour}:00)`;
    predictingActive = true;
    liveMetricsActive = true;
  } else {
    // Closed mode - next mode is pre-operation at 4 AM (or active at 4 PM if after 4 AM)
    const nextDay = new Date(now);
    nextDay.setDate(nextDay.getDate() + 1);
    nextDay.setHours(4, 0, 0, 0);
    nextModeTime = nextDay;
    nextModeLabel = 'Pre-Operation Predicting';
    modeDescription = 'Business Closed - Next-day planning available';
    predictingActive = false;
    liveMetricsActive = false;
  }

  return {
    mode,
    isPreOperation: mode === 'pre-operation',
    isActiveOperations: mode === 'active-operations',
    isClosed: mode === 'closed',
    predictingActive,
    liveMetricsActive,
    nextModeTime,
    nextModeLabel,
    modeDescription,
  };
}

/**
 * Get time until next mode transition
 */
export function getTimeUntilNextMode(now: Date = new Date()): {
  hours: number;
  minutes: number;
  seconds: number;
  totalSeconds: number;
  formatted: string;
} {
  const modeInfo = getModeInfo(now);
  const diff = modeInfo.nextModeTime.getTime() - now.getTime();
  const totalSeconds = Math.floor(diff / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const formatted = `${hours}h ${minutes}m`;

  return {
    hours,
    minutes,
    seconds,
    totalSeconds,
    formatted,
  };
}

/**
 * Get mode badge info for UI display
 */
export function getModeBadgeInfo(now: Date = new Date()): {
  mode: OperatingMode;
  label: string;
  emoji: string;
  color: string;
  bgColor: string;
  description: string;
} {
  const modeInfo = getModeInfo(now);

  if (modeInfo.isPreOperation) {
    return {
      mode: 'pre-operation',
      label: 'Pre-Operation Predicting',
      emoji: '🔵',
      color: 'text-blue-900',
      bgColor: 'bg-blue-100',
      description: 'Planning for tonight\'s delivery service',
    };
  } else if (modeInfo.isActiveOperations) {
    return {
      mode: 'active-operations',
      label: 'Active Operations',
      emoji: '🟢',
      color: 'text-green-900',
      bgColor: 'bg-green-100',
      description: 'Live delivery tracking and predicting',
    };
  } else {
    return {
      mode: 'closed',
      label: 'Business Closed',
      emoji: '🔴',
      color: 'text-red-900',
      bgColor: 'bg-red-100',
      description: 'Service paused - Next-day planning available',
    };
  }
}

/**
 * Validate if predicting should be active
 */
export function shouldPredictingBeActive(now: Date = new Date()): boolean {
  const modeInfo = getModeInfo(now);
  return modeInfo.predictingActive;
}

/**
 * Validate if live metrics should be active
 */
export function shouldLiveMetricsBeActive(now: Date = new Date()): boolean {
  const modeInfo = getModeInfo(now);
  return modeInfo.liveMetricsActive;
}

/**
 * Get operating hours description for current mode
 */
export function getOperatingHoursDescription(now: Date = new Date()): string {
  const dayOfWeek = now.getDay();
  const isFridayOrSaturday = dayOfWeek === 5 || dayOfWeek === 6;

  if (isFridayOrSaturday) {
    return 'Friday/Saturday: 4:00 PM - 11:00 PM';
  } else {
    return 'Sunday-Thursday: 4:00 PM - 10:00 PM';
  }
}

/**
 * Get next operating window start time
 */
export function getNextOperatingWindowStart(now: Date = new Date()): Date {
  const modeInfo = getModeInfo(now);

  if (modeInfo.isPreOperation || modeInfo.isClosed) {
    // Next operating window starts at 4 PM today or tomorrow
    const nextWindow = new Date(now);
    nextWindow.setHours(16, 0, 0, 0);

    if (nextWindow <= now) {
      nextWindow.setDate(nextWindow.getDate() + 1);
    }

    return nextWindow;
  } else {
    // Currently in active operations, next window is tomorrow at 4 PM
    const nextWindow = new Date(now);
    nextWindow.setDate(nextWindow.getDate() + 1);
    nextWindow.setHours(16, 0, 0, 0);
    return nextWindow;
  }
}

/**
 * Get current operating window end time
 */
export function getCurrentOperatingWindowEnd(now: Date = new Date()): Date | null {
  const modeInfo = getModeInfo(now);

  if (!modeInfo.isActiveOperations) {
    return null; // No active window
  }

  const dayOfWeek = now.getDay();
  const isFridayOrSaturday = dayOfWeek === 5 || dayOfWeek === 6;
  const closingHour = isFridayOrSaturday ? 23 : 22;

  const windowEnd = new Date(now);
  windowEnd.setHours(closingHour, 0, 0, 0);

  return windowEnd;
}
