/**
 * Push Notification Debug Utility
 * Logs every step of the push notification pipeline for debugging
 */

export interface DebugLog {
  timestamp: string;
  step: string;
  status: 'info' | 'success' | 'error' | 'warning';
  message: string;
  details?: any;
}

class PushDebugger {
  private logs: DebugLog[] = [];
  private maxLogs = 100;

  log(step: string, status: 'info' | 'success' | 'error' | 'warning', message: string, details?: any) {
    const logEntry: DebugLog = {
      timestamp: new Date().toISOString(),
      step,
      status,
      message,
      details,
    };

    this.logs.push(logEntry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Also log to console with color coding
    const colors = {
      info: 'color: #0066cc; font-weight: bold;',
      success: 'color: #00cc00; font-weight: bold;',
      error: 'color: #cc0000; font-weight: bold;',
      warning: 'color: #ff9900; font-weight: bold;',
    };

    console.log(
      `%c[Push Debug ${step}] ${message}`,
      colors[status],
      details ? details : ''
    );
  }

  getLogs(): DebugLog[] {
    return this.logs;
  }

  clearLogs() {
    this.logs = [];
  }

  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  getStatus() {
    return {
      totalLogs: this.logs.length,
      lastLog: this.logs[this.logs.length - 1] || null,
      errorCount: this.logs.filter(l => l.status === 'error').length,
      successCount: this.logs.filter(l => l.status === 'success').length,
    };
  }
}

export const pushDebugger = new PushDebugger();

/**
 * Check if Service Worker is supported
 */
export async function checkServiceWorkerSupport(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) {
    pushDebugger.log('SW-Support', 'error', 'Service Workers not supported in this browser');
    return false;
  }
  pushDebugger.log('SW-Support', 'success', 'Service Workers are supported');
  return true;
}

/**
 * Check if HTTPS is being used
 */
export function checkHTTPS(): boolean {
  const isHTTPS = window.location.protocol === 'https:';
  if (!isHTTPS) {
    pushDebugger.log('HTTPS-Check', 'error', 'App is not served over HTTPS - push notifications require HTTPS', {
      protocol: window.location.protocol,
      url: window.location.href,
    });
    return false;
  }
  pushDebugger.log('HTTPS-Check', 'success', 'App is served over HTTPS');
  return true;
}

/**
 * Check if Service Worker file is accessible
 */
export async function checkServiceWorkerFile(): Promise<boolean> {
  try {
    const response = await fetch('/sw.js');
    if (!response.ok) {
      pushDebugger.log('SW-File', 'error', `Service Worker file returned status ${response.status}`, {
        status: response.statusText,
        url: '/sw.js',
      });
      return false;
    }
    const text = await response.text();
    if (text.length === 0) {
      pushDebugger.log('SW-File', 'error', 'Service Worker file is empty');
      return false;
    }
    pushDebugger.log('SW-File', 'success', `Service Worker file is accessible (${text.length} bytes)`);
    return true;
  } catch (error: any) {
    pushDebugger.log('SW-File', 'error', 'Failed to fetch Service Worker file', {
      error: error.message,
    });
    return false;
  }
}

/**
 * Register Service Worker and log the process
 */
export async function registerServiceWorkerWithDebug(): Promise<ServiceWorkerRegistration | null> {
  try {
    pushDebugger.log('SW-Register', 'info', 'Attempting to register Service Worker...');
    
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });
    
    pushDebugger.log('SW-Register', 'success', 'Service Worker registered successfully', {
      scope: registration.scope,
      active: !!registration.active,
      installing: !!registration.installing,
      waiting: !!registration.waiting,
    });
    
    return registration;
  } catch (error: any) {
    pushDebugger.log('SW-Register', 'error', 'Failed to register Service Worker', {
      error: error.message,
      stack: error.stack,
    });
    return null;
  }
}

/**
 * Check notification permission status
 */
export function checkNotificationPermission(): NotificationPermission {
  const permission = Notification.permission;
  pushDebugger.log('Permission-Check', 'info', `Notification permission is: ${permission}`);
  return permission;
}

/**
 * Request notification permission and log the process
 */
export async function requestNotificationPermissionWithDebug(): Promise<NotificationPermission> {
  try {
    pushDebugger.log('Permission-Request', 'info', 'Requesting notification permission...');
    
    const permission = await Notification.requestPermission();
    
    pushDebugger.log(
      'Permission-Request',
      permission === 'granted' ? 'success' : 'warning',
      `Notification permission: ${permission}`
    );
    
    return permission;
  } catch (error: any) {
    pushDebugger.log('Permission-Request', 'error', 'Failed to request notification permission', {
      error: error.message,
    });
    return 'denied';
  }
}

/**
 * Get push subscription and log details
 */
export async function getPushSubscriptionWithDebug(
  registration: ServiceWorkerRegistration
): Promise<PushSubscription | null> {
  try {
    pushDebugger.log('Subscription-Get', 'info', 'Checking for existing push subscription...');
    
    const subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      pushDebugger.log('Subscription-Get', 'success', 'Found existing push subscription', {
        endpoint: subscription.endpoint.substring(0, 50) + '...',
        expirationTime: subscription.expirationTime,
      });
    } else {
      pushDebugger.log('Subscription-Get', 'info', 'No existing push subscription found');
    }
    
    return subscription;
  } catch (error: any) {
    pushDebugger.log('Subscription-Get', 'error', 'Failed to get push subscription', {
      error: error.message,
    });
    return null;
  }
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

/**
 * Create push subscription with detailed logging
 */
export async function createPushSubscriptionWithDebug(
  registration: ServiceWorkerRegistration,
  vapidPublicKey: string
): Promise<PushSubscription | null> {
  try {
    pushDebugger.log('Subscription-Create', 'info', 'Creating push subscription...', {
      vapidKeyLength: vapidPublicKey.length,
    });

    // Convert VAPID key
    let applicationServerKey: Uint8Array;
    try {
      applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
      pushDebugger.log('Subscription-Create', 'success', 'VAPID key converted to Uint8Array', {
        keyLength: applicationServerKey.length,
      });
    } catch (error: any) {
      pushDebugger.log('Subscription-Create', 'error', 'Failed to convert VAPID key', {
        error: error.message,
      });
      return null;
    }

    // Subscribe to push
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    });

    pushDebugger.log('Subscription-Create', 'success', 'Push subscription created successfully', {
      endpoint: subscription.endpoint.substring(0, 50) + '...',
      keys: {
        auth: subscription.getKey('auth')?.toString().substring(0, 20) + '...',
        p256dh: subscription.getKey('p256dh')?.toString().substring(0, 20) + '...',
      },
    });

    return subscription;
  } catch (error: any) {
    pushDebugger.log('Subscription-Create', 'error', 'Failed to create push subscription', {
      error: error.message,
      stack: error.stack,
    });
    return null;
  }
}

/**
 * Save subscription to backend with logging
 */
export async function saveSubscriptionToBackendWithDebug(
  subscription: PushSubscription,
  dashboardType: 'admin' | 'kitchen' | 'driver',
  driverId?: number
): Promise<boolean> {
  try {
    pushDebugger.log('Subscription-Save', 'info', 'Saving subscription to backend...', {
      dashboardType,
      driverId,
      endpoint: subscription.endpoint.substring(0, 50) + '...',
    });

    const response = await fetch('/api/trpc/push.subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        json: {
          endpoint: subscription.endpoint,
          auth: subscription.getKey('auth') ? btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(subscription.getKey('auth')!)))) : '',
          p256dh: subscription.getKey('p256dh') ? btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(subscription.getKey('p256dh')!)))) : '',
          dashboardType,
          driverId,
          userAgent: navigator.userAgent,
        },
      }),
    });

    if (!response.ok) {
      pushDebugger.log('Subscription-Save', 'error', `Backend returned status ${response.status}`, {
        status: response.statusText,
      });
      return false;
    }

    const result = await response.json();
    pushDebugger.log('Subscription-Save', 'success', 'Subscription saved to backend', {
      result,
    });

    return true;
  } catch (error: any) {
    pushDebugger.log('Subscription-Save', 'error', 'Failed to save subscription to backend', {
      error: error.message,
    });
    return false;
  }
}
