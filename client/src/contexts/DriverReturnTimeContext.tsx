import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface DriverReturnTimeContextType {
  driverReturnTimes: Record<number, string>;
  updateDriverReturnTime: (driverId: number, returnTime: string) => void;
}

const DriverReturnTimeContext = createContext<DriverReturnTimeContextType | undefined>(undefined);

export function DriverReturnTimeProvider({ children }: { children: ReactNode }) {
  const [driverReturnTimes, setDriverReturnTimes] = useState<Record<number, string>>({});

  // Load return times from localStorage on mount
  useEffect(() => {
    const times: Record<number, string> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('driver-return-time-')) {
        try {
          const data = JSON.parse(localStorage.getItem(key) || '{}');
          if (data.driverId && data.returnTime) {
            times[data.driverId] = data.returnTime;
          }
        } catch (e) {
          console.error('Failed to parse return time data:', e);
        }
      }
    }
    if (Object.keys(times).length > 0) {
      setDriverReturnTimes(times);
    }
  }, []);

  // Listen for return time updates from driver dashboard
  useEffect(() => {
    const handleReturnTimeUpdate = (event: any) => {
      const { driverId, returnTime } = event.detail;
      setDriverReturnTimes((prev) => ({
        ...prev,
        [driverId]: returnTime,
      }));
    };

    window.addEventListener('driver-return-time-updated', handleReturnTimeUpdate);
    return () => window.removeEventListener('driver-return-time-updated', handleReturnTimeUpdate);
  }, []);

  // Poll for return time updates every second (countdown)
  useEffect(() => {
    const interval = setInterval(() => {
      setDriverReturnTimes((prev) => {
        const updated = { ...prev };
        Object.keys(updated).forEach((driverId) => {
          const time = updated[parseInt(driverId)];
          if (time && time !== '00:00') {
            const [minutes, seconds] = time.split(':').map(Number);
            let totalSeconds = minutes * 60 + seconds - 1;
            if (totalSeconds < 0) totalSeconds = 0;
            const newMinutes = Math.floor(totalSeconds / 60);
            const newSeconds = totalSeconds % 60;
            updated[parseInt(driverId)] = `${String(newMinutes).padStart(2, '0')}:${String(newSeconds).padStart(2, '0')}`;
          }
        });
        return updated;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const updateDriverReturnTime = (driverId: number, returnTime: string) => {
    setDriverReturnTimes((prev) => ({
      ...prev,
      [driverId]: returnTime,
    }));
  };

  return (
    <DriverReturnTimeContext.Provider value={{ driverReturnTimes, updateDriverReturnTime }}>
      {children}
    </DriverReturnTimeContext.Provider>
  );
}

export function useDriverReturnTime() {
  const context = useContext(DriverReturnTimeContext);
  if (context === undefined) {
    throw new Error('useDriverReturnTime must be used within a DriverReturnTimeProvider');
  }
  return context;
}
