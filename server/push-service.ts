/**
 * Web Push Notifications Service
 * Handles sending push notifications to subscribed users
 */

import webpush from 'web-push';
import { ENV } from './_core/env';
import { getDb } from './db';
import { pushSubscriptions } from '../drizzle/schema';
import { eq, and, inArray } from 'drizzle-orm';

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
 * Send push notification to the currently logged-in user's device
 * Filters by username to ensure only the active user receives notifications
 */
export async function sendPushNotification(
  username: string,
  dashboardType: 'admin' | 'kitchen' | 'driver',
  driverId?: number,
  payload?: PushNotificationPayload
): Promise<number> {
  try {
    const db = await getDb();
    if (!db) {
      console.error('[Push Service] Database connection failed');
      return 0;
    }

    // Build query to filter by username (currently logged-in user)
    let query = db
      .select()
      .from(pushSubscriptions)
      .where(
        and(
          eq(pushSubscriptions.username, username),
          eq(pushSubscriptions.dashboardType, dashboardType),
          eq(pushSubscriptions.isActive, true)
        )
      );

    // If it's a driver notification, also filter by specific driver ID
    if (dashboardType === 'driver' && driverId) {
      query = db
        .select()
        .from(pushSubscriptions)
        .where(
          and(
            eq(pushSubscriptions.username, username),
            eq(pushSubscriptions.dashboardType, 'driver'),
            eq(pushSubscriptions.driverId, driverId),
            eq(pushSubscriptions.isActive, true)
          )
        );
    }

    const subscriptions = await query;

    if (subscriptions.length === 0) {
      console.log(`[Push Service] No active subscriptions found for ${dashboardType}${driverId ? ` driver ${driverId}` : ''}`);
      return 0;
    }

    if (!payload) {
      console.error('[Push Service] No payload provided');
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
        console.log(`[Push Service] Sending notification to endpoint: ${subscription.endpoint.substring(0, 50)}...`);
        
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
        console.log(`[Push Service] ✓ Notification sent successfully to subscription ${subscription.id}`);
      } catch (error: any) {
        console.error(`[Push Service] ✗ Failed to send notification to subscription ${subscription.id}:`, error.message);

        // If subscription is invalid (410 Gone), mark it as inactive
        if (error.statusCode === 410 || error.statusCode === 404) {
          console.log(`[Push Service] Marking subscription ${subscription.id} as inactive (status: ${error.statusCode})`);
          failedSubscriptions.push(subscription.id);
        }
      }
    }

    // Mark invalid subscriptions as inactive
    if (failedSubscriptions.length > 0) {
      await db
        .update(pushSubscriptions)
        .set({ isActive: false })
        .where(inArray(pushSubscriptions.id, failedSubscriptions));
      console.log(`[Push Service] Marked ${failedSubscriptions.length} subscriptions as inactive`);
    }

    console.log(`[Push Service] Successfully sent ${successCount}/${subscriptions.length} notifications for ${dashboardType}${driverId ? ` driver ${driverId}` : ''}`);
    return successCount;
  } catch (error) {
    console.error('[Push Service] Error sending push notification:', error);
    return 0;
  }
}

/**
 * Update a subscription when user switches dashboards
 */
export async function updateSubscriptionDashboard(
  endpoint: string,
  dashboardType: 'admin' | 'kitchen' | 'driver',
  driverId?: number
): Promise<boolean> {
  try {
    const db = await getDb();
    if (!db) {
      console.error('[Push Service] Database connection failed');
      return false;
    }

    // Check if subscription exists
    const existing = await db
      .select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.endpoint, endpoint));

    if (existing.length === 0) {
      console.log('[Push Service] Subscription not found for update');
      return false;
    }

    // Update the subscription with new dashboard type
    await db
      .update(pushSubscriptions)
      .set({
        dashboardType,
        driverId: driverId || null,
        isActive: true,
        updatedAt: new Date(),
      })
      .where(eq(pushSubscriptions.endpoint, endpoint));

    console.log(`[Push Service] Updated subscription to ${dashboardType}${driverId ? ` for driver ${driverId}` : ''}`);
    return true;
  } catch (error) {
    console.error('[Push Service] Error updating subscription dashboard:', error);
    return false;
  }
}

/**
 * Store a push subscription in the database
 * @param username - The currently logged-in username (barrel_admin, barrel_kitchen, driver_name, etc)
 */
export async function storePushSubscription(
  endpoint: string,
  auth: string,
  p256dh: string,
  username: string,
  dashboardType: 'admin' | 'kitchen' | 'driver' = 'admin',
  driverId?: number,
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
          username,
          dashboardType,
          driverId: driverId || null,
          auth,
          p256dh,
          userAgent,
          isActive: true,
          updatedAt: new Date(),
        })
        .where(eq(pushSubscriptions.endpoint, endpoint));
      console.log(`[Push Service] Updated existing subscription for user ${username} to ${dashboardType}`);
    } else {
      // Create new subscription
      await db.insert(pushSubscriptions).values({
        endpoint,
        auth,
        p256dh,
        username,
        dashboardType,
        driverId: driverId || null,
        userAgent,
        isActive: true,
      });
      console.log(`[Push Service] New subscription stored for user ${username} on ${dashboardType}`);
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
 * Get all active subscriptions for a dashboard type
 */
export async function getSubscriptionsByDashboard(
  dashboardType: 'admin' | 'kitchen' | 'driver',
  driverId?: number
): Promise<any[]> {
  try {
    const db = await getDb();
    if (!db) {
      console.error('[Push Service] Database connection failed');
      return [];
    }

    let query = db
      .select()
      .from(pushSubscriptions)
      .where(
        and(
          eq(pushSubscriptions.dashboardType, dashboardType),
          eq(pushSubscriptions.isActive, true)
        )
      );

    if (dashboardType === 'driver' && driverId) {
      query = db
        .select()
        .from(pushSubscriptions)
        .where(
          and(
            eq(pushSubscriptions.dashboardType, 'driver'),
            eq(pushSubscriptions.driverId, driverId),
            eq(pushSubscriptions.isActive, true)
          )
        );
    }

    return await query;
  } catch (error) {
    console.error('[Push Service] Error getting subscriptions:', error);
    return [];
  }
}
