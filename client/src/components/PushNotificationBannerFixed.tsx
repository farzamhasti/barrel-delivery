'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useSystemSession } from '@/_core/hooks/useSystemSession';
import {
  pushDebugger,
  checkHTTPS,
  checkServiceWorkerSupport,
  checkServiceWorkerFile,
  registerServiceWorkerWithDebug,
  checkNotificationPermission,
  requestNotificationPermissionWithDebug,
  getPushSubscriptionWithDebug,
  createPushSubscriptionWithDebug,
  saveSubscriptionToBackendWithDebug,
} from '@/lib/push-debug';

interface PushNotificationBannerProps {
  role: 'admin' | 'kitchen' | 'driver';
  userId?: number;
}

export function PushNotificationBannerFixed({ role, userId }: PushNotificationBannerProps) {
  const [showBanner, setShowBanner] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const pushSubscribeMutation = trpc.push.subscribe.useMutation();
  const { data: authData, isLoading: authLoading } = trpc.auth.me.useQuery();
  const { systemSession, isLoading: systemLoading } = useSystemSession();

  useEffect(() => {
    // Wait for both auth systems to load
    if (authLoading || systemLoading) return;
    
    // Get username from either regular auth or system session (for kitchen/admin)
    const username = authData?.username || systemSession?.username;
    
    if ('Notification' in window && Notification.permission === 'default' && username) {
      pushDebugger.log('Banner-Init', 'info', 'Auth loaded, showing banner', {
        username,
        role,
        source: authData?.username ? 'auth' : 'systemSession',
      });
      setShowBanner(true);
    }
  }, [authLoading, systemLoading, authData?.username, systemSession?.username]);

  const handleEnable = async () => {
    const username = authData?.username || systemSession?.username;
    if (!username) {
      pushDebugger.log('Banner-Enable', 'error', 'Username not available', { authData, systemSession });
      alert('Error: Username not available');
      return;
    }

    setIsLoading(true);
    pushDebugger.log('Banner-Enable', 'info', 'Starting notification setup', {
      username,
      role,
      userId,
    });

    try {
      // Step 1: Check HTTPS
      if (!checkHTTPS()) {
        alert('Error: HTTPS is required for push notifications');
        setShowBanner(false);
        setIsLoading(false);
        return;
      }

      // Step 2: Check Service Worker support
      if (!(await checkServiceWorkerSupport())) {
        alert('Error: Service Workers not supported');
        setShowBanner(false);
        setIsLoading(false);
        return;
      }

      // Step 3: Check Service Worker file is accessible
      if (!(await checkServiceWorkerFile())) {
        alert('Error: Service Worker file not accessible at /sw.js');
        setShowBanner(false);
        setIsLoading(false);
        return;
      }

      // Step 4: Request notification permission
      const permission = await requestNotificationPermissionWithDebug();
      
      if (permission !== 'granted') {
        pushDebugger.log('Banner-Enable', 'warning', 'Permission denied or dismissed');
        alert('Notifications permission denied. Please enable in browser settings.');
        setShowBanner(false);
        setIsLoading(false);
        return;
      }

      // Step 5: Register service worker
      const registration = await registerServiceWorkerWithDebug();
      if (!registration) {
        alert('Error: Failed to register Service Worker');
        setShowBanner(false);
        setIsLoading(false);
        return;
      }

      // Step 6: Get or create push subscription
      let subscription = await getPushSubscriptionWithDebug(registration);
      
      if (!subscription) {
        const vapidPublicKey = import.meta.env.VITE_FRONTEND_VAPID_PUBLIC_KEY;
        if (!vapidPublicKey) {
          pushDebugger.log('Banner-Enable', 'error', 'VAPID public key not configured');
          alert('Error: VAPID public key not configured');
          setIsLoading(false);
          return;
        }

        pushDebugger.log('Banner-Enable', 'info', 'Creating new push subscription', {
          vapidKeyLength: vapidPublicKey.length,
        });

        subscription = await createPushSubscriptionWithDebug(registration, vapidPublicKey);
        
        if (!subscription) {
          alert('Error: Failed to create push subscription');
          setShowBanner(false);
          setIsLoading(false);
          return;
        }
      }

      // Step 7: Save subscription to backend
      const saved = await saveSubscriptionToBackendWithDebug(
        subscription,
        role as 'admin' | 'kitchen' | 'driver',
        userId
      );

      if (saved) {
        pushDebugger.log('Banner-Enable', 'success', 'Notification setup complete');
        setShowBanner(false);
      } else {
        alert('Error: Failed to save subscription to backend');
      }
    } catch (error: any) {
      pushDebugger.log('Banner-Enable', 'error', 'Unexpected error during setup', {
        error: error.message,
        stack: error.stack,
      });
      alert('Error: ' + error.message);
      setShowBanner(false);
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
