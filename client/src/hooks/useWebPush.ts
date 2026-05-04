import { useEffect, useRef, useState } from 'react';
import { trpc } from '@/lib/trpc';

interface UseWebPushOptions {
  enabled?: boolean;
  username?: string;
  dashboardType?: 'admin' | 'kitchen' | 'driver';
  driverId?: number;
}

/**
 * Hook for Web Push notification subscription and management
 * Handles subscribing to push notifications and sending them via Service Worker
 */
export function useWebPush(options: UseWebPushOptions = {}) {
  const {
    enabled = true,
    username,
    dashboardType = 'admin',
    driverId,
  } = options;

  const [isSupported] = useState(() => {
    if (typeof window === 'undefined') return false;
    return 'serviceWorker' in navigator && 'PushManager' in window;
  });

  const [isSubscribed, setIsSubscribed] = useState(false);
  const subscriptionRef = useRef<PushSubscription | null>(null);

  // Get VAPID public key from server
  const { data: vapidData } = trpc.push.getVapidPublicKey.useQuery(undefined, {
    enabled: enabled && isSupported,
  });

  // Subscribe to push notifications
  const subscribeMutation = trpc.push.subscribe.useMutation();

  const subscribe = async () => {
    if (!isSupported || !vapidData?.publicKey || !username) {
      console.warn('[WebPush] Cannot subscribe - missing requirements');
      return false;
    }

    try {
      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;

      // Check if already subscribed
      const existingSubscription = await registration.pushManager.getSubscription();
      if (existingSubscription) {
        subscriptionRef.current = existingSubscription;
        setIsSubscribed(true);
        console.log('[WebPush] Already subscribed');
        return true;
      }

      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidData.publicKey),
      });

      subscriptionRef.current = subscription;

      // Send subscription to server
      const subscriptionJSON = subscription.toJSON() as any;
      await subscribeMutation.mutateAsync({
        subscription: {
          endpoint: subscription.endpoint,
          keys: {
            auth: subscriptionJSON.keys.auth,
            p256dh: subscriptionJSON.keys.p256dh,
          },
        },
        username,
        dashboardType,
        driverId,
      });

      setIsSubscribed(true);
      console.log('[WebPush] Successfully subscribed');
      return true;
    } catch (error) {
      console.error('[WebPush] Subscription failed:', error);
      return false;
    }
  };

  // Unsubscribe from push notifications
  const unsubscribe = async () => {
    if (!subscriptionRef.current) return false;

    try {
      const endpoint = subscriptionRef.current.endpoint;
      await subscriptionRef.current.unsubscribe();

      // Notify server
      await trpc.push.unsubscribe.mutate({ endpoint });

      subscriptionRef.current = null;
      setIsSubscribed(false);
      console.log('[WebPush] Successfully unsubscribed');
      return true;
    } catch (error) {
      console.error('[WebPush] Unsubscription failed:', error);
      return false;
    }
  };

  // Send notification via Service Worker
  const sendNotification = async (title: string, body: string, tag: string) => {
    if (!subscriptionRef.current) {
      console.warn('[WebPush] Not subscribed - cannot send notification');
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, {
        body,
        tag,
        icon: '/barrel-logo.png',
        badge: '/barrel-logo.png',
        requireInteraction: false,
      });
      console.log('[WebPush] Notification sent:', title);
    } catch (error) {
      console.error('[WebPush] Error sending notification:', error);
    }
  };

  // Auto-subscribe on mount if enabled
  useEffect(() => {
    if (!enabled || !isSupported || !username || !vapidData?.publicKey) return;

    const autoSubscribe = async () => {
      const success = await subscribe();
      if (!success) {
        console.warn('[WebPush] Auto-subscription failed');
      }
    };

    autoSubscribe();
  }, [enabled, isSupported, username, vapidData?.publicKey]);

  return {
    isSupported,
    isSubscribed,
    subscribe,
    unsubscribe,
    sendNotification,
  };
}

/**
 * Convert VAPID public key from base64 to Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}
