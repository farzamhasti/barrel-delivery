import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { registerServiceWorker, requestPushPermission, subscribeToPush } from '@/lib/push-notifications';
import { trpc } from '@/lib/trpc';

interface PushNotificationBannerProps {
  role: 'admin' | 'kitchen' | 'driver';
  userId?: number;  // Optional - for driver dashboard
}

export function PushNotificationBannerFixed({ role, userId }: PushNotificationBannerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [username, setUsername] = useState<string | null>(null);

  const pushSubscribeMutation = trpc.push.subscribe.useMutation();
  const { data: authData } = trpc.auth.me.useQuery();

  useEffect(() => {
    // Check if push notifications are supported
    const checkPushSupport = async () => {
      if (!('serviceWorker' in navigator) || !('Notification' in window)) {
        console.log('[Push Banner] Push notifications not supported');
        return;
      }

      // Get the current username from auth data
      if (authData?.username) {
        setUsername(authData.username);
        console.log('[Push Banner] Current user:', authData.username);
      }

      // Show banner if permission is not yet granted
      if (Notification.permission === 'default') {
        console.log('[Push Banner] Showing permission request banner');
        setIsVisible(true);
      } else if (Notification.permission === 'granted') {
        // Already granted - check if subscription exists and update if needed
        try {
          const registration = await navigator.serviceWorker.ready;
          const subscription = await registration.pushManager.getSubscription();
          if (subscription && authData?.username) {
            // Permission granted and subscribed - update subscription with current username
            console.log('[Push Banner] Permission granted, updating subscription with username:', authData.username);
            await handleEnable();
          }
        } catch (error) {
          console.error('[Push Banner] Error checking subscription:', error);
        }
      }
    };

    checkPushSupport();
  }, [authData?.username, role]);

  const handleEnable = async () => {
    if (!authData?.username) {
      console.error('[Push Banner] Username not available');
      return;
    }

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
        console.log('[Push Banner] User denied notification permission');
        setIsVisible(false);
        setIsLoading(false);
        return;
      }

      // Subscribe to push notifications
      const subscription = await subscribeToPush(import.meta.env.VITE_FRONTEND_VAPID_PUBLIC_KEY || '');
      if (!subscription) {
        console.error('[Push Banner] Failed to subscribe to push notifications');
        setIsLoading(false);
        return;
      }

      console.log('[Push Banner] Subscribing with username:', authData.username, 'role:', role, 'userId:', userId);

      // Store subscription on server with username
      const result = await pushSubscribeMutation.mutateAsync({
        endpoint: subscription.endpoint,
        auth: subscription.auth,
        p256dh: subscription.p256dh,
        dashboardType: role,
        driverId: userId,
        userAgent: navigator.userAgent,
      });

      if (result.success) {
        console.log('[Push Banner] Successfully subscribed to push notifications');
        console.log('[Push Banner] Subscription stored with username:', authData.username);
        setIsVisible(false);
      } else {
        console.error('[Push Banner] Server rejected subscription');
      }
    } catch (error) {
      console.error('[Push Banner] Error enabling push notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
  };

  if (!isVisible) {
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
