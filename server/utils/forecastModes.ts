/**
 * Unified Predicting Engine - Predict Mode Management
 * 
 * Supports three operational predicting modes:
 * - TODAY_FORECAST: Pre-operation planning (before 4 PM)
 * - LIVE_OPERATION: Realtime during operations (4 PM - 10/11 PM)
 * - TOMORROW_FORECAST: Next-day strategic planning (all day)
 */

import { getOperatingMode } from './operatingModes';

export type PredictMode = 'TODAY_FORECAST' | 'LIVE_OPERATION' | 'TOMORROW_FORECAST';

export interface PredictContext {
  mode: PredictMode;
  targetDate: Date;
  predictHours: number;
  isWeatherAware: boolean;
  isEventAware: boolean;
  includeHotspots: boolean;
  includeRiskAssessment: boolean;
}

/**
 * Determine the appropriate predict mode based on current time and user request
 */
export function determinePredictMode(requestedMode?: PredictMode): PredictMode {
  const operatingMode = getOperatingMode();
  
  // If user explicitly requests a mode, respect it
  if (requestedMode) {
    return requestedMode;
  }
  
  // Otherwise, determine based on operating mode
  if (operatingMode === 'pre-operation') {
    return 'TODAY_FORECAST';
  } else if (operatingMode === 'active-operations') {
    return 'LIVE_OPERATION';
  } else {
    // Closed mode - default to tomorrow predict for planning
    return 'TOMORROW_FORECAST';
  }
}

/**
 * Build predict context based on mode
 */
export function buildPredictContext(mode: PredictMode): PredictContext {
  const now = new Date();
  let targetDate = new Date(now);
  let predictHours = 24;
  
  if (mode === 'TODAY_FORECAST') {
    // Predict from now until tonight's closing time
    const dayOfWeek = now.getDay();
    const isWeekend = dayOfWeek === 5 || dayOfWeek === 6;
    const closingHour = isWeekend ? 23 : 22;
    
    // Set target date to tonight
    targetDate.setHours(closingHour, 0, 0, 0);
    
    // Calculate hours until closing
    const currentHour = now.getHours();
    predictHours = Math.max(closingHour - currentHour, 1);
  } else if (mode === 'LIVE_OPERATION') {
    // Predict for next 15 minutes to 2 hours ahead
    predictHours = 2;
  } else if (mode === 'TOMORROW_FORECAST') {
    // Predict for full day tomorrow
    targetDate.setDate(targetDate.getDate() + 1);
    targetDate.setHours(12, 0, 0, 0);
    predictHours = 24;
  }
  
  return {
    mode,
    targetDate,
    predictHours,
    isWeatherAware: true,
    isEventAware: true,
    includeHotspots: mode !== 'TOMORROW_FORECAST', // Hotspots less relevant for tomorrow
    includeRiskAssessment: mode !== 'TOMORROW_FORECAST',
  };
}

/**
 * Get predict mode description for UI display
 */
export function getPredictModeDescription(mode: PredictMode): string {
  switch (mode) {
    case 'TODAY_FORECAST':
      return 'Tonight\'s Operational Predict';
    case 'LIVE_OPERATION':
      return 'Live Operational Intelligence';
    case 'TOMORROW_FORECAST':
      return 'Tomorrow\'s Strategic Predict';
    default:
      return 'Operational Predict';
  }
}

/**
 * Get refresh interval for each mode (in milliseconds)
 */
export function getRefreshInterval(mode: PredictMode): number {
  switch (mode) {
    case 'TODAY_FORECAST':
      return 5 * 60 * 1000; // 5 minutes
    case 'LIVE_OPERATION':
      return 15 * 60 * 1000; // 15 minutes
    case 'TOMORROW_FORECAST':
      return 60 * 60 * 1000; // 1 hour
    default:
      return 10 * 60 * 1000; // 10 minutes
  }
}

/**
 * Determine if a mode should be active based on current time
 */
export function isModeActive(mode: PredictMode): boolean {
  const operatingMode = getOperatingMode();
  
  if (mode === 'TODAY_FORECAST') {
    return operatingMode === 'pre-operation';
  } else if (mode === 'LIVE_OPERATION') {
    return operatingMode === 'active-operations';
  } else if (mode === 'TOMORROW_FORECAST') {
    return true; // Always available
  }
  
  return false;
}
