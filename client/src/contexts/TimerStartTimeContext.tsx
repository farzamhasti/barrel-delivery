import React, { createContext, useContext, useState, useCallback } from 'react';

interface TimerStartTimeContextType {
  timerStartTimes: Record<number, number>; // driverId -> startTime (in seconds)
  setTimerStartTime: (driverId: number, startTime: number) => void;
  getTimerStartTime: (driverId: number) => number | undefined;
}

const TimerStartTimeContext = createContext<TimerStartTimeContextType | undefined>(undefined);

export function TimerStartTimeProvider({ children }: { children: React.ReactNode }) {
  const [timerStartTimes, setTimerStartTimes] = useState<Record<number, number>>({});

  const setTimerStartTime = useCallback((driverId: number, startTime: number) => {
    setTimerStartTimes(prev => ({
      ...prev,
      [driverId]: startTime,
    }));
  }, []);

  const getTimerStartTime = useCallback((driverId: number) => {
    return timerStartTimes[driverId];
  }, [timerStartTimes]);

  return (
    <TimerStartTimeContext.Provider value={{ timerStartTimes, setTimerStartTime, getTimerStartTime }}>
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
