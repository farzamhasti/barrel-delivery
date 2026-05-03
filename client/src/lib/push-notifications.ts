/**
 * Web Push Notifications utility
 * Handles Service Worker registration and push subscription management
 */

export interface PushSubscriptionData {
  endpoint: string;
  auth: string;
  p256dh: string;
}

/**
 * Register the Service Worker for push notifications
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.log('[Push Notifications] Service Workers not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });
    console.log('[Push Notifications] Service Worker registered:', registration);
    return registration;
  } catch (error) {
    console.error('[Push Notifications] Service Worker registration failed:', error);
    return null;
  }
}

/**
 * Request push notification permission from the user
 */
export async function requestPushPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.log('[Push Notifications] Notifications not supported');
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    console.log('[Push Notifications] Permission already granted');
    return 'granted';
  }

  if (Notification.permission === 'denied') {
    console.log('[Push Notifications] Permission denied by user');
    return 'denied';
  }

  try {
    const permission = await Notification.requestPermission();
    console.log('[Push Notifications] Permission result:', permission);
    return permission;
  } catch (error) {
    console.error('[Push Notifications] Error requesting permission:', error);
    return 'denied';
  }
}

/**
 * Subscribe to push notifications
 */
export async function subscribeToPush(
  vapidPublicKey: string
): Promise<PushSubscriptionData | null> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.log('[Push Notifications] Push notifications not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    
    // Check if already subscribed
    let subscription = await registration.pushManager.getSubscription();
    
    if (!subscription) {
      // Create new subscription
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });
      console.log('[Push Notifications] New subscription created:', subscription);
    } else {
      console.log('[Push Notifications] Already subscribed:', subscription);
    }

    // Extract subscription data
    if (subscription && subscription.getKey) {
      const key = subscription.getKey('auth');
      const p256dh = subscription.getKey('p256dh');
      
      return {
        endpoint: subscription.endpoint,
        auth: key ? arrayBufferToBase64(key) : '',
        p256dh: p256dh ? arrayBufferToBase64(p256dh) : '',
      };
    }

    return null;
  } catch (error) {
    console.error('[Push Notifications] Error subscribing to push:', error);
    return null;
  }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPush(): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      await subscription.unsubscribe();
      console.log('[Push Notifications] Unsubscribed from push');
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('[Push Notifications] Error unsubscribing from push:', error);
    return false;
  }
}

/**
 * Check if push notifications are supported and enabled
 */
export async function isPushNotificationsSupported(): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return subscription !== null;
  } catch {
    return false;
  }
}

/**
 * Get current push subscription
 */
export async function getPushSubscription(): Promise<PushSubscriptionData | null> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    if (!subscription) {
      return null;
    }

    const key = subscription.getKey('auth');
    const p256dh = subscription.getKey('p256dh');
    
    return {
      endpoint: subscription.endpoint,
      auth: key ? arrayBufferToBase64(key) : '',
      p256dh: p256dh ? arrayBufferToBase64(p256dh) : '',
    };
  } catch (error) {
    console.error('[Push Notifications] Error getting subscription:', error);
    return null;
  }
}

/**
 * Convert URL-safe Base64 to Uint8Array
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

/**
 * Convert ArrayBuffer to Base64 string
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}
