import type { ReactNode } from 'react';
import { useState, useEffect, useCallback, useRef } from 'react';

export interface ReturnTimeState {
  totalSeconds: number;
  totalMinutes: number;
  displayTime: string; // formatted as "MM:SS"
  isActive: boolean;
  ordersCount: number;
  breakdown: {
    pickupMinutes: number;
    deliveryMinutes: number;
    travelMinutes: number;
  };
}

/**
 * Hook to manage return time countdown
 * Automatically decrements the timer every second
 */
export function useReturnTimeCalculator() {
  const [returnTime, setReturnTime] = useState<ReturnTimeState | null>(null);
  const timerRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const remainingSecondsRef = useRef<number>(0);

  // Format seconds to MM:SS
  const formatTime = useCallback((seconds: number): string => {
    const minutes = Math.floor(Math.max(0, seconds) / 60);
    const secs = Math.max(0, seconds) % 60;
    return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }, []);

  // Start countdown timer
  const startCountdown = useCallback((initialSeconds: number, ordersCount: number, breakdown: any) => {
    remainingSecondsRef.current = initialSeconds;

    // Clear any existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    // Update display immediately
    setReturnTime({
      totalSeconds: initialSeconds,
      totalMinutes: Math.ceil(initialSeconds / 60),
      displayTime: formatTime(initialSeconds),
      isActive: true,
      ordersCount,
      breakdown,
    });

    // Start countdown
    timerRef.current = setInterval(() => {
      remainingSecondsRef.current -= 1;

      if (remainingSecondsRef.current <= 0) {
        // Timer finished
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
        setReturnTime((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            totalSeconds: 0,
            totalMinutes: 0,
            displayTime: '00:00',
            isActive: false,
          };
        });
        return;
      }

      // Update display
      setReturnTime((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          totalSeconds: remainingSecondsRef.current,
          totalMinutes: Math.ceil(remainingSecondsRef.current / 60),
          displayTime: formatTime(remainingSecondsRef.current),
        };
      });
    }, 1000);
  }, [formatTime]);

  // Set new return time calculation
  const setCalculation = useCallback((calculation: ReturnTimeState) => {
    setReturnTime(calculation);
    startCountdown(calculation.totalSeconds, calculation.ordersCount, calculation.breakdown);
  }, [startCountdown]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  return {
    returnTime,
    setCalculation,
    startCountdown,
    clearTimer: () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      setReturnTime(null);
    },
  };
}
