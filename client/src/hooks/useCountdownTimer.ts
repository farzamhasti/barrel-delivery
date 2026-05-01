import { useState, useEffect } from 'react';

/**
 * Custom hook for countdown timer
 * @param initialSeconds - Initial time in seconds
 * @returns Object with current time in MM:SS format and remaining seconds
 */
export function useCountdownTimer(initialSeconds: number | null | undefined) {
  const [remainingSeconds, setRemainingSeconds] = useState<number>(initialSeconds || 0);

  useEffect(() => {
    // Reset timer when initialSeconds changes
    setRemainingSeconds(initialSeconds || 0);
  }, [initialSeconds]);

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
