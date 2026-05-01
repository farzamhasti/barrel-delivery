import { useState, useEffect } from 'react';
import { useTimerStartTime } from '@/contexts/TimerStartTimeContext';

/**
 * Custom hook for countdown timer with persistent start time
 * @param initialSeconds - Initial time in seconds
 * @param driverId - Driver ID to store/retrieve start time
 * @returns Object with current time in MM:SS format and remaining seconds
 */
export function useCountdownTimer(initialSeconds: number | null | undefined, driverId: number) {
  const { timerStartTimes, setTimerStartTime } = useTimerStartTime();
  const [remainingSeconds, setRemainingSeconds] = useState<number>(initialSeconds || 0);

  // Get stored start time for this driver
  const storedStartTime = timerStartTimes[driverId];

  // Initialize or update stored start time when initialSeconds changes
  useEffect(() => {
    if (initialSeconds && initialSeconds > 0) {
      // If no stored start time, create one
      if (storedStartTime === undefined) {
        setTimerStartTime(driverId, initialSeconds);
        setRemainingSeconds(initialSeconds);
      } else {
        // Start time already exists, calculate remaining time from it
        setRemainingSeconds(storedStartTime);
      }
    } else {
      // Reset if no initial seconds
      setRemainingSeconds(0);
    }
  }, [initialSeconds, driverId, storedStartTime, setTimerStartTime]);

  // Countdown effect - decrements every second
  useEffect(() => {
    // Don't start timer if no time or time is 0
    if (!remainingSeconds || remainingSeconds <= 0) {
      return;
    }

    // Set up interval to decrement every second
    const interval = setInterval(() => {
      setRemainingSeconds(prev => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Cleanup interval on unmount or when timer reaches 0
    return () => clearInterval(interval);
  }, [remainingSeconds]);

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
