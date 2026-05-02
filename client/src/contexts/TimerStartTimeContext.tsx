import React, { createContext, useContext, useState, useCallback } from 'react';

interface TimerData {
  startTime: number; // Timestamp (milliseconds) when timer was started in database
  initialSeconds: number; // Original seconds when timer was created
}

interface TimerStartTimeContextType {
  timerData: Record<number, TimerData>; // driverId -> TimerData
  setTimerStartTime: (driverId: number, initialSeconds: number, dbTimestamp?: number) => void;
  getRemainingSeconds: (driverId: number, currentDbTimestamp?: number) => number;
  clearTimerStartTime: (driverId: number) => void;
}

const TimerStartTimeContext = createContext<TimerStartTimeContextType | undefined>(undefined);

export function TimerStartTimeProvider({ children }: { children: React.ReactNode }) {
  const [timerData, setTimerData] = useState<Record<number, TimerData>>({});

  const setTimerStartTime = useCallback((driverId: number, initialSeconds: number, dbTimestamp?: number) => {
    setTimerData(prev => {
      // Only set if not already set for this driver
      if (prev[driverId]) {
        return prev;
      }
      return {
        ...prev,
        [driverId]: {
          startTime: dbTimestamp || Date.now(),
          initialSeconds,
        },
      };
    });
  }, []);

  const getRemainingSeconds = useCallback((driverId: number, currentDbTimestamp?: number): number => {
    const data = timerData[driverId];
    if (!data) return 0;
    
    // Use provided timestamp or current time
    const now = currentDbTimestamp || Date.now();
    
    // Calculate elapsed time since timer started
    const elapsedMs = now - data.startTime;
    const elapsedSeconds = Math.floor(elapsedMs / 1000);
    
    // Calculate remaining time
    const remaining = Math.max(0, data.initialSeconds - elapsedSeconds);
    return remaining;
  }, [timerData]);

  const clearTimerStartTime = useCallback((driverId: number) => {
    setTimerData(prev => {
      const newData = { ...prev };
      delete newData[driverId];
      return newData;
    });
  }, []);

  return (
    <TimerStartTimeContext.Provider value={{ timerData, setTimerStartTime, getRemainingSeconds, clearTimerStartTime }}>
      {children}
    </TimerStartTimeContext.Provider>
  );
}

export function useTimerStartTime() {
  const context = useContext(TimerStartTimeContext);
  if (!context) {
    throw new Error('useTimerStartTime must be used within TimerStartTimeProvider');
  }
  return context;
}
