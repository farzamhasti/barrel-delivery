import { useState, useEffect, useRef } from 'react';

/**
 * Custom hook for countdown timer that works with absolute future timestamps
 * @param estimatedReturnTime - Absolute future timestamp (Date) when driver will return
 * @param driverId - Driver ID for logging/debugging
 * @returns Object with current time in MM:SS format and remaining seconds
 */
export function useCountdownTimer(estimatedReturnTime: Date | null | undefined, driverId: number) {
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const previousTimestampRef = useRef<Date | null | undefined>(estimatedReturnTime);

  // Calculate remaining seconds from absolute timestamp
  const calculateRemaining = (timestamp: Date | null | undefined): number => {
    if (!timestamp) return 0;
    const now = new Date();
    const remaining = Math.max(0, Math.floor((timestamp.getTime() - now.getTime()) / 1000));
    return remaining;
  };

  // Initialize and update remaining seconds
  useEffect(() => {
    // Check if timestamp changed (driver clicked Calculate again)
    const timestampChanged = previousTimestampRef.current !== estimatedReturnTime;
    if (timestampChanged) {
      previousTimestampRef.current = estimatedReturnTime;
    }

    // Calculate initial remaining seconds
    const remaining = calculateRemaining(estimatedReturnTime);
    setRemainingSeconds(remaining);

    // If no timestamp or already expired, don't set up interval
    if (!estimatedReturnTime || remaining <= 0) {
      return;
    }

    // Update every second from the absolute timestamp
    const interval = setInterval(() => {
      const remaining = calculateRemaining(estimatedReturnTime);
      setRemainingSeconds(remaining);
      
      // Stop interval when timer reaches 0
      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [estimatedReturnTime]);

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
