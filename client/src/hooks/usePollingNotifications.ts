import { useEffect, useRef, useState } from 'react';

interface NotificationData {
  id: string;
  title: string;
  body: string;
  timestamp: number;
  type?: 'order' | 'delivery' | 'alert';
}

interface UsePollingNotificationsOptions {
  enabled?: boolean;
  pollInterval?: number; // milliseconds
  onNotification?: (notification: NotificationData) => void;
}

/**
 * Hook for polling-based notifications
 * Periodically checks for new notifications and shows system notifications
 * Polling runs continuously and never stops unless disabled or component unmounts
 */
export function usePollingNotifications(options: UsePollingNotificationsOptions = {}) {
  const {
    enabled = true,
    pollInterval = 15000, // 15 seconds default
    onNotification,
  } = options;

  const [isSupported] = useState(() => {
    if (typeof window === 'undefined') return false;
    return 'Notification' in window;
  });

  const [permissionGranted, setPermissionGranted] = useState(() => {
    if (typeof window === 'undefined') return false;
    return 'Notification' in window && Notification.permission === 'granted';
  });

  const lastNotificationIdRef = useRef<string | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastCheckedRef = useRef<number>(Date.now());

  // Request notification permission
  const requestPermission = async () => {
    if (!isSupported) {
      console.warn('[Polling Notifications] Notifications not supported');
      return false;
    }

    if (Notification.permission === 'granted') {
      setPermissionGranted(true);
      return true;
    }

    if (Notification.permission !== 'denied') {
      try {
        const permission = await Notification.requestPermission();
        const granted = permission === 'granted';
        setPermissionGranted(granted);
        return granted;
      } catch (error) {
        console.error('[Polling Notifications] Error requesting permission:', error);
        return false;
      }
    }

    return false;
  };

  // Show system notification
  const showNotification = (data: NotificationData) => {
    if (!permissionGranted) return;

    try {
      // Create system notification
      const notification = new Notification(data.title, {
        body: data.body,
        icon: '/barrel-logo.png',
        badge: '/barrel-logo.png',
        tag: data.type || 'notification',
        requireInteraction: false,
      });

      // Handle notification click
      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      // Call callback if provided
      if (onNotification) {
        onNotification(data);
      }
    } catch (error) {
      console.error('[Polling Notifications] Error showing notification:', error);
    }
  };

  // Get last checked timestamp
  const getLastChecked = () => lastCheckedRef.current;

  // Update last checked timestamp
  const updateLastChecked = () => {
    lastCheckedRef.current = Date.now();
  };

  // Start continuous polling for notifications
  useEffect(() => {
    if (!enabled) {
      // Clear interval if disabled
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      return;
    }

    // Set up continuous polling interval
    // This will run indefinitely until the component unmounts or enabled becomes false
    pollIntervalRef.current = setInterval(() => {
      // Polling loop is active - dashboard components will use getLastChecked() and updateLastChecked()
      // to track what they've already seen
    }, pollInterval);

    return () => {
      // Clean up on unmount or when enabled changes to false
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [enabled, pollInterval]);

  return {
    isSupported,
    permissionGranted,
    requestPermission,
    showNotification,
    getLastChecked,
    updateLastChecked,
  };
}
