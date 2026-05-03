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
  const [isDismissed, setIsDismissed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const pushSubscribeMutation = trpc.push.subscribe.useMutation();

  // Generate a stable user ID based on role and localStorage data
  const getStableUserId = (): number => {
    if (userId) return userId; // For drivers, use the provided ID
    
    // For admin/kitchen, create a stable hash from role and username
    const username = localStorage.getItem('systemUsername') || 'unknown';
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
      const char = username.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    // Return a positive number between 1000-9999
    return 1000 + (Math.abs(hash) % 9000);
  };

  useEffect(() => {
    // Check if user has already dismissed this banner
    const dismissKey = `push-banner-dismissed-${role}`;
    const dismissed = localStorage.getItem(dismissKey);
    if (dismissed) {
      setIsDismissed(true);
      return;
    }

    // Check if push notifications are supported and not already subscribed
    const checkPushSupport = async () => {
      if (!('serviceWorker' in navigator) || !('Notification' in window)) {
        console.log('[Push Banner] Push notifications not supported');
        return;
      }

      if (Notification.permission === 'default') {
        setIsVisible(true);
      } else if (Notification.permission === 'granted') {
        // Already granted - check if subscription exists
        try {
          const registration = await navigator.serviceWorker.ready;
          const subscription = await registration.pushManager.getSubscription();
          if (!subscription) {
            // Permission granted but not subscribed - subscribe silently
            console.log('[Push Banner] Permission granted but not subscribed - subscribing silently');
            await handleEnable();
          }
        } catch (error) {
          console.error('[Push Banner] Error checking subscription:', error);
        }
      }
    };

    checkPushSupport();
  }, [role]);

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
        localStorage.setItem(`push-banner-dismissed-${role}`, 'true');
        setIsDismissed(true);
        setIsVisible(false);
        setIsLoading(false);
        console.log('[Push Banner] User denied notification permission');
        return;
      }

      // Subscribe to push notifications
      const subscription = await subscribeToPush(import.meta.env.VITE_FRONTEND_VAPID_PUBLIC_KEY || '');
      if (!subscription) {
        console.error('[Push Banner] Failed to subscribe to push notifications');
        setIsLoading(false);
        return;
      }

      // Get stable user ID
      const stableUserId = getStableUserId();
      console.log('[Push Banner] Subscribing with userId:', stableUserId, 'role:', role);

      // Store subscription on server with role-based routing
      const result = await pushSubscribeMutation.mutateAsync({
        userId: stableUserId,
        role,
        endpoint: subscription.endpoint,
        auth: subscription.auth,
        p256dh: subscription.p256dh,
        userAgent: navigator.userAgent,
      });

      if (result.success) {
        console.log('[Push Banner] Successfully subscribed to push notifications for role:', role);
        setIsVisible(false);
        localStorage.setItem(`push-banner-dismissed-${role}`, 'true');
        setIsDismissed(true);
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
    // Mark as dismissed so we don't ask again
    localStorage.setItem(`push-banner-dismissed-${role}`, 'true');
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
