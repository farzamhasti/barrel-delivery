/**
 * Web Push Notifications Service
 * Handles sending push notifications to subscribed users
 */

import webpush from 'web-push';
import { ENV } from './_core/env';
import { getDb } from './db';
import { pushSubscriptions } from '../drizzle/schema';
import { eq, and } from 'drizzle-orm';

// Configure web-push with VAPID keys
if (ENV.vapidPublicKey && ENV.vapidPrivateKey && ENV.vapidSubject) {
  webpush.setVapidDetails(
    ENV.vapidSubject,
    ENV.vapidPublicKey,
    ENV.vapidPrivateKey
  );
  console.log('[Push Service] VAPID keys configured');
} else {
  console.warn('[Push Service] VAPID keys not configured - push notifications will not work');
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  url?: string;
  data?: Record<string, any>;
}

/**
 * Send push notification to a specific user
 */
export async function sendPushNotification(
  userId: number,
  role: 'admin' | 'kitchen' | 'driver',
  payload: PushNotificationPayload
): Promise<number> {
  try {
    const db = await getDb();
    if (!db) {
      console.error('[Push Service] Database connection failed');
      return 0;
    }

    // Get all active subscriptions for this user
    const subscriptions = await db
      .select()
      .from(pushSubscriptions)
      .where(
        and(
          eq(pushSubscriptions.userId, userId),
          eq(pushSubscriptions.role, role),
          eq(pushSubscriptions.isActive, true)
        )
      );

    if (subscriptions.length === 0) {
      console.log(`[Push Service] No active subscriptions found for user ${userId} (${role})`);
      return 0;
    }

    const notificationData = {
      title: payload.title,
      body: payload.body,
      icon: payload.icon || '/barrel-logo.png',
      badge: payload.badge || '/barrel-logo.png',
      tag: payload.tag || 'barrel-delivery',
      data: {
        url: payload.url || '/',
        ...payload.data,
      },
    };

    let successCount = 0;
    const failedSubscriptions: number[] = [];

    // Send notification to each subscription
    for (const subscription of subscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              auth: subscription.auth,
              p256dh: subscription.p256dh,
            },
          },
          JSON.stringify(notificationData)
        );
        successCount++;
        console.log(`[Push Service] Notification sent to subscription ${subscription.id}`);
      } catch (error: any) {
        console.error(`[Push Service] Failed to send notification to subscription ${subscription.id}:`, error.message);

        // If subscription is invalid (410 Gone), mark it as inactive
        if (error.statusCode === 410 || error.statusCode === 404) {
          failedSubscriptions.push(subscription.id);
        }
      }
    }

    // Mark invalid subscriptions as inactive
    if (failedSubscriptions.length > 0) {
      await db
        .update(pushSubscriptions)
        .set({ isActive: false })
        .where((col) => failedSubscriptions.includes(col.id as any));
      console.log(`[Push Service] Marked ${failedSubscriptions.length} subscriptions as inactive`);
    }

    return successCount;
  } catch (error) {
    console.error('[Push Service] Error sending push notification:', error);
    return 0;
  }
}

/**
 * Send push notification to all users with a specific role
 */
export async function broadcastPushNotification(
  role: 'admin' | 'kitchen' | 'driver',
  payload: PushNotificationPayload
): Promise<number> {
  try {
    const db = await getDb();
    if (!db) {
      console.error('[Push Service] Database connection failed');
      return 0;
    }

    // Get all active subscriptions for this role
    const subscriptions = await db
      .select()
      .from(pushSubscriptions)
      .where(
        and(
          eq(pushSubscriptions.role, role),
          eq(pushSubscriptions.isActive, true)
        )
      );

    if (subscriptions.length === 0) {
      console.log(`[Push Service] No active subscriptions found for role ${role}`);
      return 0;
    }

    const notificationData = {
      title: payload.title,
      body: payload.body,
      icon: payload.icon || '/barrel-logo.png',
      badge: payload.badge || '/barrel-logo.png',
      tag: payload.tag || 'barrel-delivery',
      data: {
        url: payload.url || '/',
        ...payload.data,
      },
    };

    let successCount = 0;
    const failedSubscriptions: number[] = [];

    // Send notification to each subscription
    for (const subscription of subscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              auth: subscription.auth,
              p256dh: subscription.p256dh,
            },
          },
          JSON.stringify(notificationData)
        );
        successCount++;
      } catch (error: any) {
        if (error.statusCode === 410 || error.statusCode === 404) {
          failedSubscriptions.push(subscription.id);
        }
      }
    }

    // Mark invalid subscriptions as inactive
    if (failedSubscriptions.length > 0) {
      await db
        .update(pushSubscriptions)
        .set({ isActive: false })
        .where((col) => failedSubscriptions.includes(col.id as any));
    }

    console.log(`[Push Service] Broadcast sent to ${successCount}/${subscriptions.length} subscriptions`);
    return successCount;
  } catch (error) {
    console.error('[Push Service] Error broadcasting push notification:', error);
    return 0;
  }
}

/**
 * Store a push subscription in the database
 */
export async function storePushSubscription(
  userId: number,
  role: 'admin' | 'kitchen' | 'driver',
  endpoint: string,
  auth: string,
  p256dh: string,
  userAgent?: string
): Promise<boolean> {
  try {
    const db = await getDb();
    if (!db) {
      console.error('[Push Service] Database connection failed');
      return false;
    }

    // Check if subscription already exists
    const existing = await db
      .select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.endpoint, endpoint));

    if (existing.length > 0) {
      // Update existing subscription
      await db
        .update(pushSubscriptions)
        .set({
          userId,
          role,
          auth,
          p256dh,
          userAgent,
          isActive: true,
          updatedAt: new Date(),
        })
        .where(eq(pushSubscriptions.endpoint, endpoint));
      console.log('[Push Service] Updated existing subscription');
    } else {
      // Create new subscription
      await db.insert(pushSubscriptions).values({
        userId,
        role,
        endpoint,
        auth,
        p256dh,
        userAgent,
        isActive: true,
      });
      console.log('[Push Service] New subscription stored');
    }

    return true;
  } catch (error) {
    console.error('[Push Service] Error storing push subscription:', error);
    return false;
  }
}

/**
 * Remove a push subscription from the database
 */
export async function removePushSubscription(endpoint: string): Promise<boolean> {
  try {
    const db = await getDb();
    if (!db) {
      console.error('[Push Service] Database connection failed');
      return false;
    }

    await db
      .delete(pushSubscriptions)
      .where(eq(pushSubscriptions.endpoint, endpoint));

    console.log('[Push Service] Subscription removed');
    return true;
  } catch (error) {
    console.error('[Push Service] Error removing push subscription:', error);
    return false;
  }
}

/**
 * Get all active subscriptions for a user
 */
export async function getUserSubscriptions(
  userId: number,
  role: 'admin' | 'kitchen' | 'driver'
): Promise<any[]> {
  try {
    const db = await getDb();
    if (!db) {
      console.error('[Push Service] Database connection failed');
      return [];
    }

    const subs = await db
      .select()
      .from(pushSubscriptions)
      .where(
        and(
          eq(pushSubscriptions.userId, userId),
          eq(pushSubscriptions.role, role),
          eq(pushSubscriptions.isActive, true)
        )
      );

    return subs;
  } catch (error) {
    console.error('[Push Service] Error getting user subscriptions:', error);
    return [];
  }
}
