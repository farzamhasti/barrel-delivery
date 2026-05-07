import { useState, useEffect, useRef } from 'react';
import { useTimerStartTime } from '@/contexts/TimerStartTimeContext';

/**
 * Custom hook for countdown timer with persistent elapsed time tracking
 * @param initialSeconds - Initial time in seconds (from driver.estimatedReturnTime)
 * @param driverId - Driver ID to store/retrieve timer data
 * @returns Object with current time in MM:SS format and remaining seconds
 * 
 * PERMANENT FIX: 
 * - Timer runs independently from server data after initialization
 * - When Stop is clicked (initialSeconds=0), clear context and reset initialization flag
 * - When recalculation happens after Stop, properly reinitialize with new time
 */
export function useCountdownTimer(initialSeconds: number | null | undefined, driverId: number) {
  const { timerData, setTimerStartTime, getRemainingSeconds, clearTimerStartTime } = useTimerStartTime();
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const initializationRef = useRef<Set<number>>(new Set());
  const previousSecondsRef = useRef<number | null | undefined>(initialSeconds);

  useEffect(() => {
    const isInitialized = initializationRef.current.has(driverId);
    const previousSeconds = previousSecondsRef.current;
    
    // Stop button clicked: initialSeconds = 0
    // Clear timer and reset initialization flag so next calculation can reinitialize
    if (initialSeconds === 0 && previousSeconds !== null && previousSeconds !== undefined && isInitialized) {
      clearTimerStartTime(driverId);
      initializationRef.current.delete(driverId); // CRITICAL: Reset flag so next calculation reinitializes
    }
    // First initialization OR recalculation after Stop
    // Initialize if: not initialized yet, OR was initialized but then cleared (Stop clicked)
    else if (initialSeconds && initialSeconds > 0) {
      if (!isInitialized) {
        // First time: initialize the timer
        setTimerStartTime(driverId, initialSeconds, Date.now(), false);
        initializationRef.current.add(driverId);
      } else if (previousSeconds === 0 || previousSeconds === null || previousSeconds === undefined) {
        // Recalculation after Stop: reinitialize with new time
        setTimerStartTime(driverId, initialSeconds, Date.now(), true);
      }
      // Otherwise timer is running normally, don't reinitialize
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
