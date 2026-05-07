import { useState, useEffect, useRef } from 'react';
import { useTimerStartTime } from '@/contexts/TimerStartTimeContext';

/**
 * Custom hook for countdown timer with persistent elapsed time tracking
 * @param initialSeconds - Initial time in seconds (only used on first mount)
 * @param driverId - Driver ID to store/retrieve timer data
 * @returns Object with current time in MM:SS format and remaining seconds
 * 
 * CRITICAL FIX: Once the timer is initialized, it runs independently from initialSeconds.
 * This prevents the timer from stopping when driver data is refetched from the server.
 * The timer only stops when explicitly cleared (user clicks Stop) or when it reaches 0.
 * 
 * RECALCULATION FIX: When initialSeconds changes significantly (>5 seconds difference),
 * it indicates the driver recalculated. The timer reinitializes to the new value using forceReinit.
 */
export function useCountdownTimer(initialSeconds: number | null | undefined, driverId: number) {
  const { timerData, setTimerStartTime, getRemainingSeconds, clearTimerStartTime } = useTimerStartTime();
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const initializationRef = useRef<Set<number>>(new Set());
  const previousSecondsRef = useRef<number | null | undefined>(initialSeconds);

  // Initialize timer start time ONLY once per driver (on first mount)
  // CRITICAL: Once initialized, the timer runs from context data, NOT from initialSeconds
  // This prevents the timer from stopping when driver data is refetched
  useEffect(() => {
    const isInitialized = initializationRef.current.has(driverId);
    const previousSeconds = previousSecondsRef.current;
    
    // Only initialize if we have a valid initial value and haven't initialized yet
    if (initialSeconds && initialSeconds > 0 && !isInitialized) {
      // First time: initialize the timer with the initial seconds
      setTimerStartTime(driverId, initialSeconds, Date.now(), false);
      initializationRef.current.add(driverId);
    } 
    // Detect recalculation: if initialSeconds changed significantly (more than 5 seconds difference)
    // This indicates the driver clicked "Calculate Return Time" again
    else if (
      isInitialized && 
      initialSeconds && 
      initialSeconds > 0 && 
      previousSeconds && 
      Math.abs(initialSeconds - previousSeconds) > 5
    ) {
      // Driver recalculated: force reinitialize timer with new value
      // forceReinit=true allows the context to override the existing timer data
      setTimerStartTime(driverId, initialSeconds, Date.now(), true);
    }
    // Only clear the timer if it was explicitly set to 0 (user clicked Stop)
    // AND we were previously initialized (not just a data fetch that returned null)
    else if (initialSeconds === 0 && previousSeconds !== null && previousSeconds !== undefined && isInitialized) {
      // User explicitly stopped the timer
      clearTimerStartTime(driverId);
      initializationRef.current.delete(driverId);
    }
    // CRITICAL FIX: If initialSeconds becomes null but we're initialized, DO NOT clear the timer
    // The timer should continue running from the context data
    // This is the key fix that prevents the timer from stopping when orders are delivered
    
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
