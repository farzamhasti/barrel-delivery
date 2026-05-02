import { useState, useEffect, useRef } from 'react';
import { useTimerStartTime } from '@/contexts/TimerStartTimeContext';

/**
 * Custom hook for countdown timer with persistent elapsed time tracking
 * @param initialSeconds - Initial time in seconds (only used on first mount)
 * @param driverId - Driver ID to store/retrieve timer data
 * @param timerStartTime - Server-stored timestamp when timer was started (for syncing across tabs)
 * @returns Object with current time in MM:SS format and remaining seconds
 */
export function useCountdownTimer(initialSeconds: number | null | undefined, driverId: number, timerStartTime?: number | null) {
  const { timerData, setTimerStartTime, getRemainingSeconds, clearTimerStartTime } = useTimerStartTime();
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const initializationRef = useRef<Set<number>>(new Set());
  const previousSecondsRef = useRef<number | null | undefined>(initialSeconds);

  // Initialize timer start time ONLY once per driver (on first mount)
  // Also reinitialize if initialSeconds changes (driver clicked Calculate again after Stop)
  useEffect(() => {
    const isInitialized = initializationRef.current.has(driverId);
    const secondsChanged = previousSecondsRef.current !== initialSeconds;
    
    if (initialSeconds && initialSeconds > 0) {
      // If timer was reset (initialSeconds went to 0 and back), reinitialize
      if (secondsChanged && isInitialized) {
        // Clear old timer data and reinitialize
        clearTimerStartTime(driverId);
        initializationRef.current.delete(driverId);
      }
      
      if (!initializationRef.current.has(driverId)) {
        // Use server's timerStartTime if available (for syncing across tabs)
        // Otherwise use current time as the database timestamp (when driver calculated)
        const dbTimestamp = timerStartTime || Date.now();
        setTimerStartTime(driverId, initialSeconds, dbTimestamp);
        initializationRef.current.add(driverId);
      }
    } else if (initialSeconds === 0 || initialSeconds === null) {
      // Timer was cleared (Stop button clicked)
      if (isInitialized) {
        clearTimerStartTime(driverId);
        initializationRef.current.delete(driverId);
      }
    }
    
    previousSecondsRef.current = initialSeconds;
  }, [driverId, initialSeconds, setTimerStartTime, clearTimerStartTime]);

  // Update remaining seconds every second from context
  useEffect(() => {
    // Check if timer data exists for this driver
    if (!timerData[driverId]) {
      setRemainingSeconds(0);
      return;
    }

    // Set initial value
    const remaining = getRemainingSeconds(driverId);
    setRemainingSeconds(remaining);

    // Update every second
    const interval = setInterval(() => {
      const remaining = getRemainingSeconds(driverId);
      setRemainingSeconds(remaining);
      
      // Stop interval when timer reaches 0
      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [driverId, timerData, getRemainingSeconds]);

  // Format seconds to MM:SS
  const formatTime = (seconds: number): string => {
    if (seconds <= 0) return '00:00';
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return {
    displayTime: formatTime(remainingSeconds),
    remainingSeconds,
  };
}
