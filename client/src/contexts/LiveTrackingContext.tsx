'use client';
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface WindowState {
  position: { x: number; y: number };
  size: { width: number; height: number };
  isMinimized: boolean;
}

interface LiveTrackingContextType {
  isVisible: boolean;
  setIsVisible: (visible: boolean) => void;
  windowState: WindowState;
  setWindowState: (state: WindowState) => void;
}

const LiveTrackingContext = createContext<LiveTrackingContextType | undefined>(undefined);

const DEFAULT_WINDOW_STATE: WindowState = {
  position: { x: 20, y: 20 },
  size: { width: 600, height: 500 },
  isMinimized: false,
};

const STORAGE_KEY = 'live-tracking-state';

export function LiveTrackingProvider({ children }: { children: ReactNode }) {
  const [isVisible, setIsVisible] = useState(false);
  const [windowState, setWindowState] = useState<WindowState>(DEFAULT_WINDOW_STATE);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load state from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setWindowState(parsed);
      } catch (e) {
        console.error('Failed to parse stored window state:', e);
      }
    }
    setIsHydrated(true);
  }, []);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(windowState));
    }
  }, [windowState, isHydrated]);

  return (
    <LiveTrackingContext.Provider value={{ isVisible, setIsVisible, windowState, setWindowState }}>
      {children}
    </LiveTrackingContext.Provider>
  );
}

export function useLiveTracking() {
  const context = useContext(LiveTrackingContext);
  if (context === undefined) {
    throw new Error('useLiveTracking must be used within LiveTrackingProvider');
  }
  return context;
}
