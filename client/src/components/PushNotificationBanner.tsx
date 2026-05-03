import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { registerServiceWorker, requestPushPermission, subscribeToPush } from '@/lib/push-notifications';
import { trpc } from '@/lib/trpc';

interface PushNotificationBannerProps {
  userId: number;
  role: 'admin' | 'kitchen' | 'driver';
}

export function PushNotificationBanner({ userId, role }: PushNotificationBannerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const pushSubscribeMutation = trpc.push.subscribe.useMutation();

  useEffect(() => {
    // Check if user has already dismissed this banner
    const dismissed = localStorage.getItem(`push-banner-dismissed-${userId}`);
    if (dismissed) {
      setIsDismissed(true);
      return;
    }

    // Check if push notifications are supported and not already subscribed
    const checkPushSupport = async () => {
      if (!('serviceWorker' in navigator) || !('Notification' in window)) {
        return;
      }

      if (Notification.permission === 'default') {
        setIsVisible(true);
      }
    };

    checkPushSupport();
  }, [userId]);

  const handleEnable = async () => {
    if (isDismissed) return;

    setIsLoading(true);
    try {
      // Register Service Worker
      const registration = await registerServiceWorker();
      if (!registration) {
        console.error('[Push Banner] Failed to register Service Worker');
        setIsLoading(false);
        return;
      }

      // Request permission
      const permission = await requestPushPermission();
      if (permission !== 'granted') {
        // User denied permission - mark as dismissed so we don't ask again
        localStorage.setItem(`push-banner-dismissed-${userId}`, 'true');
        setIsDismissed(true);
        setIsVisible(false);
        setIsLoading(false);
        return;
      }

      // Subscribe to push notifications
      const subscription = await subscribeToPush(process.env.VITE_FRONTEND_VAPID_PUBLIC_KEY || '');
      if (!subscription) {
        console.error('[Push Banner] Failed to subscribe to push notifications');
        setIsLoading(false);
        return;
      }

      // Store subscription on server
      const result = await pushSubscribeMutation.mutateAsync({
        userId,
        role,
        endpoint: subscription.endpoint,
        auth: subscription.auth,
        p256dh: subscription.p256dh,
        userAgent: navigator.userAgent,
      });

      if (result.success) {
        console.log('[Push Banner] Successfully subscribed to push notifications');
        setIsVisible(false);
        localStorage.setItem(`push-banner-dismissed-${userId}`, 'true');
        setIsDismissed(true);
      }
    } catch (error) {
      console.error('[Push Banner] Error enabling push notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDismiss = () => {
    // Mark as dismissed so we don't ask again
    localStorage.setItem(`push-banner-dismissed-${userId}`, 'true');
    setIsDismissed(true);
    setIsVisible(false);
  };

  if (!isVisible || isDismissed) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 max-w-sm bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-50">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 text-sm">Enable Notifications</h3>
          <p className="text-gray-600 text-xs mt-1">
            Get instant updates on orders, deliveries, and important events
          </p>
        </div>
        <button
          onClick={handleDismiss}
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
          onClick={handleDismiss}
          disabled={isLoading}
          className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium py-2 px-3 rounded transition-colors"
        >
          Not Now
        </button>
      </div>
    </div>
  );
}
