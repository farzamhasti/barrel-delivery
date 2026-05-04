/**
 * Notification Deduplication Utility
 * Prevents duplicate notifications when both polling and Web Push fire simultaneously
 */

const DEDUP_WINDOW_MS = 2000; // 2 second window to consider notifications as duplicates
const recentNotifications = new Map<string, number>();

/**
 * Generate a deduplication key for a notification
 */
export function generateNotificationKey(title: string, body: string): string {
  return `${title}::${body}`;
}

/**
 * Check if a notification was recently sent (within dedup window)
 */
export function isDuplicate(key: string): boolean {
  const lastSent = recentNotifications.get(key);
  if (!lastSent) return false;

  const timeSinceLastSend = Date.now() - lastSent;
  return timeSinceLastSend < DEDUP_WINDOW_MS;
}

/**
 * Mark a notification as sent
 */
export function markNotificationSent(key: string): void {
  recentNotifications.set(key, Date.now());

  // Cleanup old entries after dedup window
  setTimeout(() => {
    recentNotifications.delete(key);
  }, DEDUP_WINDOW_MS);
}

/**
 * Send notification with deduplication
 * Returns true if notification was sent, false if it was a duplicate
 */
export function sendNotificationWithDedup(
  title: string,
  body: string,
  tag: string,
  sendFn: (title: string, body: string, tag: string) => void
): boolean {
  const key = generateNotificationKey(title, body);

  if (isDuplicate(key)) {
    console.log('[Notification Dedup] Skipping duplicate notification:', title);
    return false;
  }

  markNotificationSent(key);
  sendFn(title, body, tag);
  return true;
}
