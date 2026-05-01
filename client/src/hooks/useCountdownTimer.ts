import { useState, useEffect, useRef } from 'react';
import { useTimerStartTime } from '@/contexts/TimerStartTimeContext';

/**
 * Custom hook for countdown timer with persistent elapsed time tracking
 * @param initialSeconds - Initial time in seconds
 * @param driverId - Driver ID to store/retrieve timer data
 * @returns Object with current time in MM:SS format and remaining seconds
 */
export function useCountdownTimer(initialSeconds: number | null | undefined, driverId: number) {
  const { setTimerStartTime, getRemainingSeconds } = useTimerStartTime();
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const isInitializedRef = useRef(false);

  // Initialize timer start time on first mount
  useEffect(() => {
    if (!isInitializedRef.current && initialSeconds && initialSeconds > 0) {
      setTimerStartTime(driverId, initialSeconds);
      isInitializedRef.current = true;
    }
  }, [driverId, initialSeconds, setTimerStartTime]);

  // Update remaining seconds from context every second
  useEffect(() => {
    if (!initialSeconds || initialSeconds <= 0) {
      setRemainingSeconds(0);
      return;
    }

    // Set initial value from context
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
  }, [driverId, initialSeconds, getRemainingSeconds]);

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
