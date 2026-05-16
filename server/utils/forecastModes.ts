/**
 * Unified Forecasting Engine - Forecast Mode Management
 * 
 * Supports three operational forecasting modes:
 * - TODAY_FORECAST: Pre-operation planning (before 4 PM)
 * - LIVE_OPERATION: Realtime during operations (4 PM - 10/11 PM)
 * - TOMORROW_FORECAST: Next-day strategic planning (all day)
 */

import { getOperatingMode } from './operatingModes';

export type ForecastMode = 'TODAY_FORECAST' | 'LIVE_OPERATION' | 'TOMORROW_FORECAST';

export interface ForecastContext {
  mode: ForecastMode;
  targetDate: Date;
  forecastHours: number;
  isWeatherAware: boolean;
  isEventAware: boolean;
  includeHotspots: boolean;
  includeRiskAssessment: boolean;
}

/**
 * Determine the appropriate forecast mode based on current time and user request
 */
export function determineForecastMode(requestedMode?: ForecastMode): ForecastMode {
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
    // Closed mode - default to tomorrow forecast for planning
    return 'TOMORROW_FORECAST';
  }
}

/**
 * Build forecast context based on mode
 */
export function buildForecastContext(mode: ForecastMode): ForecastContext {
  const now = new Date();
  let targetDate = new Date(now);
  let forecastHours = 24;
  
  if (mode === 'TODAY_FORECAST') {
    // Forecast from now until tonight's closing time
    const dayOfWeek = now.getDay();
    const isWeekend = dayOfWeek === 5 || dayOfWeek === 6;
    const closingHour = isWeekend ? 23 : 22;
    
    // Set target date to tonight
    targetDate.setHours(closingHour, 0, 0, 0);
    
    // Calculate hours until closing
    const currentHour = now.getHours();
    forecastHours = Math.max(closingHour - currentHour, 1);
  } else if (mode === 'LIVE_OPERATION') {
    // Forecast for next 15 minutes to 2 hours ahead
    forecastHours = 2;
  } else if (mode === 'TOMORROW_FORECAST') {
    // Forecast for full day tomorrow
    targetDate.setDate(targetDate.getDate() + 1);
    targetDate.setHours(12, 0, 0, 0);
    forecastHours = 24;
  }
  
  return {
    mode,
    targetDate,
    forecastHours,
    isWeatherAware: true,
    isEventAware: true,
    includeHotspots: mode !== 'TOMORROW_FORECAST', // Hotspots less relevant for tomorrow
    includeRiskAssessment: mode !== 'TOMORROW_FORECAST',
  };
}

/**
 * Get forecast mode description for UI display
 */
export function getForecastModeDescription(mode: ForecastMode): string {
  switch (mode) {
    case 'TODAY_FORECAST':
      return 'Tonight\'s Operational Forecast';
    case 'LIVE_OPERATION':
      return 'Live Operational Intelligence';
    case 'TOMORROW_FORECAST':
      return 'Tomorrow\'s Strategic Forecast';
    default:
      return 'Operational Forecast';
  }
}

/**
 * Get refresh interval for each mode (in milliseconds)
 */
export function getRefreshInterval(mode: ForecastMode): number {
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
export function isModeActive(mode: ForecastMode): boolean {
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
