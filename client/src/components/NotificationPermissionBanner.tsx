import { useState, useEffect } from 'react';
import { X, Bell } from 'lucide-react';

interface NotificationPermissionBannerProps {
  onEnable?: () => void;
}

/**
 * Banner to request notification permission for polling-based notifications
 * Shows only once per session if permission is not granted
 */
export function NotificationPermissionBanner({ onEnable }: NotificationPermissionBannerProps) {
  const [showBanner, setShowBanner] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Only show banner if notifications are supported and permission is not granted
    if ('Notification' in window && Notification.permission === 'default') {
      setShowBanner(true);
    }
  }, []);

  const handleEnable = async () => {
    setIsLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setShowBanner(false);
        if (onEnable) {
          onEnable();
        }
      }
    } catch (error) {
      console.error('[Notification Banner] Error requesting permission:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!showBanner) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 max-w-sm bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-50">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1">
          <Bell className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-gray-900 text-sm">Enable Notifications</h3>
            <p className="text-gray-600 text-xs mt-1">
              Get instant updates on orders, deliveries, and important events
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowBanner(false)}
          className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
          aria-label="Dismiss"
        >
          <X size={16} />
        </button>
      </div>
      <div className="flex gap-2 mt-3">
        <button
          onClick={handleEnable}
          disabled={isLoading}
          className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white text-xs font-medium py-2 px-3 rounded transition-colors"
        >
          {isLoading ? 'Enabling...' : 'Enable'}
        </button>
        <button
          onClick={() => setShowBanner(false)}
          disabled={isLoading}
          className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium py-2 px-3 rounded transition-colors"
        >
          Not Now
        </button>
      </div>
    </div>
  );
}
