/**
 * Weather Change Detection Hook
 * Monitors weather data for significant changes and triggers recalculation
 * Phase 91: Live Weather-Driven Recalculation
 */

import { useEffect, useRef, useCallback } from 'react';

interface WeatherData {
  temperature?: number;
  precipitation?: number;
  snowfall?: number;
  wind_speed?: number;
  humidity?: number;
}

interface WeatherChangeThresholds {
  temperatureChange: number; // Degrees Celsius
  precipitationStart: boolean; // Trigger on any precipitation
  snowfallStart: boolean; // Trigger on any snowfall
  windSpeedIncrease: number; // km/h
}

const DEFAULT_THRESHOLDS: WeatherChangeThresholds = {
  temperatureChange: 5, // 5°C change triggers recalculation
  precipitationStart: true, // Any precipitation triggers recalculation
  snowfallStart: true, // Any snowfall triggers recalculation
  windSpeedIncrease: 10, // 10 km/h increase triggers recalculation
};

/**
 * Hook to detect significant weather changes and trigger callbacks
 */
export function useWeatherChangeDetection(
  currentWeather: WeatherData | null | undefined,
  onWeatherChange: (change: string) => void,
  thresholds: Partial<WeatherChangeThresholds> = {}
) {
  const previousWeatherRef = useRef<WeatherData | null>(null);
  const finalThresholds = { ...DEFAULT_THRESHOLDS, ...thresholds };

  const detectChanges = useCallback(() => {
    if (!currentWeather || !previousWeatherRef.current) {
      return;
    }

    const prev = previousWeatherRef.current;
    const curr = currentWeather;

    // Temperature change detection
    if (
      curr.temperature !== undefined &&
      prev.temperature !== undefined &&
      Math.abs(curr.temperature - prev.temperature) >= finalThresholds.temperatureChange
    ) {
      const direction = curr.temperature > prev.temperature ? 'increased' : 'decreased';
      const change = Math.abs(curr.temperature - prev.temperature).toFixed(1);
      onWeatherChange(`Temperature ${direction} by ${change}°C`);
      return;
    }

    // Precipitation start detection
    if (
      finalThresholds.precipitationStart &&
      (prev.precipitation === undefined || prev.precipitation === 0 || prev.precipitation === null) &&
      curr.precipitation !== undefined &&
      curr.precipitation > 0
    ) {
      onWeatherChange(`Precipitation started (${curr.precipitation}mm)`);
      return;
    }

    // Snowfall start detection
    if (
      finalThresholds.snowfallStart &&
      (prev.snowfall === undefined || prev.snowfall === 0 || prev.snowfall === null) &&
      curr.snowfall !== undefined &&
      curr.snowfall > 0
    ) {
      onWeatherChange(`Snowfall started (${curr.snowfall}mm)`);
      return;
    }

    // Wind speed increase detection
    if (
      curr.wind_speed !== undefined &&
      prev.wind_speed !== undefined &&
      curr.wind_speed - prev.wind_speed >= finalThresholds.windSpeedIncrease
    ) {
      const increase = (curr.wind_speed - prev.wind_speed).toFixed(1);
      onWeatherChange(`Wind speed increased by ${increase} km/h to ${curr.wind_speed} km/h`);
      return;
    }

    // Humidity change detection (significant change)
    if (
      curr.humidity !== undefined &&
      prev.humidity !== undefined &&
      Math.abs(curr.humidity - prev.humidity) >= 20
    ) {
      const direction = curr.humidity > prev.humidity ? 'increased' : 'decreased';
      const change = Math.abs(curr.humidity - prev.humidity).toFixed(0);
      onWeatherChange(`Humidity ${direction} by ${change}%`);
      return;
    }
  }, [currentWeather, onWeatherChange, finalThresholds]);

  // Update previous weather and detect changes
  useEffect(() => {
    if (currentWeather) {
      detectChanges();
      previousWeatherRef.current = { ...currentWeather };
    }
  }, [currentWeather, detectChanges]);

  return {
    previousWeather: previousWeatherRef.current,
    hasChanged: previousWeatherRef.current !== null && currentWeather !== null,
  };
}

/**
 * Hook to track weather change history
 */
export function useWeatherChangeHistory(maxEntries: number = 10) {
  const historyRef = useRef<Array<{ change: string; timestamp: Date }>>([]);

  const addChange = useCallback((change: string) => {
    historyRef.current.unshift({
      change,
      timestamp: new Date(),
    });

    // Keep only the most recent entries
    if (historyRef.current.length > maxEntries) {
      historyRef.current = historyRef.current.slice(0, maxEntries);
    }
  }, [maxEntries]);

  const getHistory = useCallback(() => {
    return [...historyRef.current];
  }, []);

  const clearHistory = useCallback(() => {
    historyRef.current = [];
  }, []);

  return {
    addChange,
    getHistory,
    clearHistory,
    count: historyRef.current.length,
  };
}

/**
 * Hook to determine if weather-triggered recalculation is needed
 */
export function useWeatherRecalculationNeeded(
  currentWeather: WeatherData | null | undefined,
  lastRecalculationTime: Date | null
): boolean {
  const weatherChangeHistoryRef = useRef<string | null>(null);

  useEffect(() => {
    if (!currentWeather || !lastRecalculationTime) {
      return;
    }

    // Check if weather data is more recent than last recalculation
    const timeSinceRecalculation = Date.now() - lastRecalculationTime.getTime();

    // If more than 5 minutes since last recalculation, might need update
    if (timeSinceRecalculation > 5 * 60 * 1000) {
      weatherChangeHistoryRef.current = 'Time-based recalculation due (>5 minutes)';
    }
  }, [currentWeather, lastRecalculationTime]);

  return weatherChangeHistoryRef.current !== null;
}
