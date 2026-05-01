import { useState, useEffect, useRef } from 'react';
import { useTimerStartTime } from '@/contexts/TimerStartTimeContext';

/**
 * Custom hook for countdown timer with persistent elapsed time tracking
 * @param initialSeconds - Initial time in seconds (only used on first mount)
 * @param driverId - Driver ID to store/retrieve timer data
 * @returns Object with current time in MM:SS format and remaining seconds
 */
export function useCountdownTimer(initialSeconds: number | null | undefined, driverId: number) {
  const { timerData, setTimerStartTime, getRemainingSeconds } = useTimerStartTime();
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const initializationRef = useRef<Set<number>>(new Set());

  // Initialize timer start time ONLY once per driver (on first mount)
  useEffect(() => {
    const isInitialized = initializationRef.current.has(driverId);
    
    if (!isInitialized && initialSeconds && initialSeconds > 0) {
      setTimerStartTime(driverId, initialSeconds);
      initializationRef.current.add(driverId);
    }
  }, [driverId]); // Only depend on driverId, NOT on initialSeconds

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
