/**
 * Global Countdown Manager
 * Manages return time countdowns that persist across component unmounts/remounts
 * Broadcasts updates to all listeners via custom events
 */

interface CountdownData {
  driverId: number;
  totalSeconds: number;
  ordersCount: number;
  breakdown: {
    pickupMinutes: number;
    deliveryMinutes: number;
    travelMinutes: number;
  };
  startTime: number; // timestamp when countdown started
  elapsedSeconds: number; // track how much time has passed
}

class CountdownManager {
  private countdowns: Map<number, CountdownData> = new Map();
  private timers: Map<number, NodeJS.Timeout> = new Map();
  private listeners: Set<(data: any) => void> = new Set();

  constructor() {
    // Restore any existing countdowns from localStorage on initialization
    this.restoreCountdownsFromStorage();
  }

  /**
   * Restore countdowns from localStorage on initialization
   */
  private restoreCountdownsFromStorage() {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('countdown-')) {
        try {
          const data = JSON.parse(localStorage.getItem(key) || '{}') as CountdownData;
          const driverId = data.driverId;
          
          // Calculate how much time has actually elapsed since this was saved
          const realElapsedMs = Date.now() - data.startTime;
          const realElapsedSeconds = Math.floor(realElapsedMs / 1000);
          
          // Calculate remaining time
          const remainingSeconds = Math.max(0, data.totalSeconds - realElapsedSeconds);
          
          if (remainingSeconds > 0) {
            // Restore the countdown with updated elapsed time
            data.elapsedSeconds = realElapsedSeconds;
            this.countdowns.set(driverId, data);
            
            // Restart the countdown timer from the correct position
            this.startCountdownTimer(driverId, remainingSeconds, data);
          } else {
            // Countdown has expired, clean it up
            localStorage.removeItem(key);
          }
        } catch (e) {
          console.error('Failed to restore countdown from storage:', e);
        }
      }
    }
  }

  /**
   * Start a countdown for a driver
   */
  startCountdown(
    driverId: number,
    totalSeconds: number,
    ordersCount: number,
    breakdown: any
  ) {
    // Clear existing countdown for this driver
    this.stopCountdown(driverId);

    const countdownData: CountdownData = {
      driverId,
      totalSeconds,
      ordersCount,
      breakdown,
      startTime: Date.now(),
      elapsedSeconds: 0,
    };

    this.countdowns.set(driverId, countdownData);

    // Save to localStorage for persistence
    localStorage.setItem(
      `countdown-${driverId}`,
      JSON.stringify(countdownData)
    );

    // Broadcast initial countdown
    this.broadcastCountdown(driverId);

    // Start countdown timer
    this.startCountdownTimer(driverId, totalSeconds, countdownData);
  }

  /**
   * Start the countdown timer for a driver
   */
  private startCountdownTimer(
    driverId: number,
    remainingSeconds: number,
    countdownData: CountdownData
  ) {
    const timer = setInterval(() => {
      const data = this.countdowns.get(driverId);
      if (!data) {
        clearInterval(timer);
        return;
      }

      // Decrement remaining seconds
      remainingSeconds--;
      data.elapsedSeconds++;

      // Update countdown data
      data.totalSeconds = Math.max(0, remainingSeconds);
      this.countdowns.set(driverId, data);

      // Save updated countdown to localStorage
      localStorage.setItem(
        `countdown-${driverId}`,
        JSON.stringify(data)
      );

      // Broadcast update
      this.broadcastCountdown(driverId);

      // Stop if countdown finished
      if (remainingSeconds <= 0) {
        this.stopCountdown(driverId);
      }
    }, 1000);

    this.timers.set(driverId, timer);
  }

  /**
   * Stop countdown for a driver
   */
  stopCountdown(driverId: number) {
    const timer = this.timers.get(driverId);
    if (timer) {
      clearInterval(timer);
      this.timers.delete(driverId);
    }

    this.countdowns.delete(driverId);
    localStorage.removeItem(`countdown-${driverId}`);
    localStorage.removeItem(`driver-return-time-${driverId}`);
  }

  /**
   * Get current countdown for a driver
   */
  getCountdown(driverId: number): CountdownData | null {
    // First check in-memory
    const inMemory = this.countdowns.get(driverId);
    if (inMemory) {
      return inMemory;
    }

    // Try to load from localStorage
    const stored = localStorage.getItem(`countdown-${driverId}`);
    if (stored) {
      try {
        const data = JSON.parse(stored) as CountdownData;
        
        // Recalculate remaining seconds based on elapsed time
        const realElapsedMs = Date.now() - data.startTime;
        const realElapsedSeconds = Math.floor(realElapsedMs / 1000);
        const remainingSeconds = Math.max(0, data.totalSeconds - realElapsedSeconds);

        if (remainingSeconds > 0) {
          // Restore countdown in memory
          data.elapsedSeconds = realElapsedSeconds;
          this.countdowns.set(driverId, data);
          
          // Restart the timer from the correct position
          this.startCountdownTimer(driverId, remainingSeconds, data);
          return data;
        } else {
          // Countdown expired
          localStorage.removeItem(`countdown-${driverId}`);
          return null;
        }
      } catch (e) {
        console.error('Failed to parse countdown data:', e);
        return null;
      }
    }

    return null;
  }

  /**
   * Broadcast countdown update to all listeners
   */
  private broadcastCountdown(driverId: number) {
    const data = this.countdowns.get(driverId);
    if (!data) return;

    const displayTime = this.formatTime(data.totalSeconds);
    const broadcastData = {
      driverId,
      returnTime: displayTime,
      totalSeconds: data.totalSeconds,
      timestamp: Date.now(),
    };

    // Notify all listeners
    this.listeners.forEach((listener) => {
      try {
        listener(broadcastData);
      } catch (e) {
        console.error('Error in countdown listener:', e);
      }
    });

    // Also dispatch custom event for components
    window.dispatchEvent(
      new CustomEvent('driver-return-time-updated', { detail: broadcastData })
    );

    // Update localStorage for cross-tab communication
    localStorage.setItem(
      `driver-return-time-${driverId}`,
      JSON.stringify(broadcastData)
    );
  }

  /**
   * Subscribe to countdown updates
   */
  subscribe(callback: (data: any) => void): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Format seconds to MM:SS
   */
  private formatTime(seconds: number): string {
    const minutes = Math.floor(Math.max(0, seconds) / 60);
    const secs = Math.max(0, seconds) % 60;
    return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  /**
   * Clear all countdowns
   */
  clearAll() {
    this.timers.forEach((timer) => clearInterval(timer));
    this.timers.clear();
    this.countdowns.clear();
    this.listeners.clear();
    
    // Clear all countdown-related localStorage entries
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('countdown-') || key.startsWith('driver-return-time-'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
  }
}

// Export singleton instance
export const countdownManager = new CountdownManager();
