import { useState, useEffect, useRef } from 'react';
import { useTimerStartTime } from '@/contexts/TimerStartTimeContext';

/**
 * Custom hook for countdown timer with persistent elapsed time tracking
 * @param initialSeconds - Initial time in seconds (from driver.estimatedReturnTime)
 * @param driverId - Driver ID to store/retrieve timer data
 * @returns Object with current time in MM:SS format and remaining seconds
 * 
 * PERMANENT FIX: 
 * - Timer runs independently from server data after initialization (prevents stopping on order delivery)
 * - On recalculation (>5 second difference in initialSeconds), reset startTime to NOW
 * - This ensures remaining time = initialSeconds on recalculation, not old elapsed time
 */
export function useCountdownTimer(initialSeconds: number | null | undefined, driverId: number) {
  const { timerData, setTimerStartTime, getRemainingSeconds, clearTimerStartTime } = useTimerStartTime();
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const initializationRef = useRef<Set<number>>(new Set());
  const previousSecondsRef = useRef<number | null | undefined>(initialSeconds);

  useEffect(() => {
    const isInitialized = initializationRef.current.has(driverId);
    const previousSeconds = previousSecondsRef.current;
    
    // First initialization: set timer with current timestamp
    if (initialSeconds && initialSeconds > 0 && !isInitialized) {
      setTimerStartTime(driverId, initialSeconds, Date.now(), false);
      initializationRef.current.add(driverId);
    } 
    // Recalculation detected: initialSeconds changed by >5 seconds
    // Reset startTime to NOW so remaining = initialSeconds (full new time)
    else if (
      isInitialized && 
      initialSeconds && 
      initialSeconds > 0 && 
      previousSeconds && 
      Math.abs(initialSeconds - previousSeconds) > 5
    ) {
      // Force reinitialize with current timestamp
      // This resets the startTime, making remaining = initialSeconds
      setTimerStartTime(driverId, initialSeconds, Date.now(), true);
    }
    // Stop button clicked: initialSeconds = 0
    else if (initialSeconds === 0 && previousSeconds !== null && previousSeconds !== undefined && isInitialized) {
      clearTimerStartTime(driverId);
      initializationRef.current.delete(driverId);
    }
    
    previousSecondsRef.current = initialSeconds;
  }, [driverId, initialSeconds, setTimerStartTime, clearTimerStartTime]);

  // Update remaining seconds every second
  useEffect(() => {
    if (!timerData[driverId]) {
      setRemainingSeconds(0);
      return;
    }

    const remaining = getRemainingSeconds(driverId);
    setRemainingSeconds(remaining);

    const interval = setInterval(() => {
      const remaining = getRemainingSeconds(driverId);
      setRemainingSeconds(remaining);
      
      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [driverId, timerData, getRemainingSeconds]);

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
