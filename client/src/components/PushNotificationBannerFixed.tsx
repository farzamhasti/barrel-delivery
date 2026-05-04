'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { trpc } from '@/lib/trpc';

interface PushNotificationBannerProps {
  role: 'admin' | 'kitchen' | 'driver';
  userId?: number;
}

export function PushNotificationBannerFixed({ role, userId }: PushNotificationBannerProps) {
  const [showBanner, setShowBanner] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const pushSubscribeMutation = trpc.push.subscribe.useMutation();
  const { data: authData } = trpc.auth.me.useQuery();

  useEffect(() => {
    // Check if notifications are supported and permission status
    if ('Notification' in window && Notification.permission === 'default') {
      setShowBanner(true);
    }
  }, []);

  const handleEnable = async () => {
    if (!authData?.username) {
      alert('Not authenticated');
      return;
    }

    setIsLoading(true);

    try {
      // Request notification permission
      const permission = await Notification.requestPermission();
      
      if (permission !== 'granted') {
        setShowBanner(false);
        setIsLoading(false);
        return;
      }

      // Register service worker
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        });

        // Get or create push subscription
        let subscription = await registration.pushManager.getSubscription();
        
        if (!subscription) {
          const vapidPublicKey = import.meta.env.VITE_FRONTEND_VAPID_PUBLIC_KEY;
          if (!vapidPublicKey) {
            console.error('VAPID public key not configured');
            setIsLoading(false);
            return;
          }

          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: vapidPublicKey,
          });
        }

        // Extract subscription details
        const subscriptionJSON = subscription.toJSON();
        const auth = subscriptionJSON.keys?.auth;
        const p256dh = subscriptionJSON.keys?.p256dh;

        if (!auth || !p256dh) {
          console.error('Missing subscription keys');
          setIsLoading(false);
          return;
        }

        // Send to server
        await pushSubscribeMutation.mutateAsync({
          endpoint: subscription.endpoint,
          auth: auth,
          p256dh: p256dh,
          dashboardType: role,
          driverId: userId,
          userAgent: navigator.userAgent,
        });

        setShowBanner(false);
      }
    } catch (error) {
      console.error('Error enabling notifications:', error);
      alert('Failed to enable notifications: ' + (error instanceof Error ? error.message : 'Unknown error'));
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
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 text-sm">Enable Notifications</h3>
          <p className="text-gray-600 text-xs mt-1">
            Get instant updates on orders, deliveries, and important events
          </p>
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
