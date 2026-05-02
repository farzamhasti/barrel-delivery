// In-memory notification store
// In production, this should be persisted to the database

export type NotificationType = 
  | 'order_created'
  | 'order_edited'
  | 'order_ready'
  | 'order_delivered'
  | 'reservation_created'
  | 'reservation_edited'
  | 'reservation_done'
  | 'driver_assignment';

export type RecipientRole = 'admin' | 'kitchen' | 'driver';

export interface Notification {
  id: string;
  recipientRole: RecipientRole;
  recipientId?: number; // For driver-specific notifications
  type: NotificationType;
  message: string;
  orderId?: number;
  reservationId?: number;
  driverId?: number;
  isRead: boolean;
  readAt?: Date;
  createdAt: Date;
}

// In-memory store - notifications are cleared on server restart
const notificationStore: Map<string, Notification> = new Map();
let notificationIdCounter = 0;

function generateNotificationId(): string {
  return `notif_${++notificationIdCounter}_${Date.now()}`;
}

export function createNotification(data: {
  recipientRole: RecipientRole;
  recipientId?: number;
  type: NotificationType;
  message: string;
  orderId?: number;
  reservationId?: number;
  driverId?: number;
}): Notification {
  const notification: Notification = {
    id: generateNotificationId(),
    recipientRole: data.recipientRole,
    recipientId: data.recipientId,
    type: data.type,
    message: data.message,
    orderId: data.orderId,
    reservationId: data.reservationId,
    driverId: data.driverId,
    isRead: false,
    createdAt: new Date(),
  };

  notificationStore.set(notification.id, notification);
  return notification;
}

export function getNotifications(recipientRole: RecipientRole, recipientId?: number): Notification[] {
  const notifications = Array.from(notificationStore.values()).filter(notif => {
    // Match by role
    if (notif.recipientRole !== recipientRole) return false;

    // For driver notifications, also match by recipientId
    if (recipientRole === 'driver' && notif.recipientId && notif.recipientId !== recipientId) {
      return false;
    }

    return true;
  });

  // Sort by creation date (newest first)
  return notifications.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export function getUnreadNotifications(recipientRole: RecipientRole, recipientId?: number): Notification[] {
  return getNotifications(recipientRole, recipientId).filter(n => !n.isRead);
}

export function markNotificationAsRead(notificationId: string): Notification | null {
  const notification = notificationStore.get(notificationId);
  if (!notification) return null;

  notification.isRead = true;
  notification.readAt = new Date();
  notificationStore.set(notificationId, notification);
  return notification;
}

export function markAllNotificationsAsRead(recipientRole: RecipientRole, recipientId?: number): number {
  const notifications = getNotifications(recipientRole, recipientId);
  let count = 0;

  notifications.forEach(notif => {
    if (!notif.isRead) {
      notif.isRead = true;
      notif.readAt = new Date();
      notificationStore.set(notif.id, notif);
      count++;
    }
  });

  return count;
}

export function getUnreadCount(recipientRole: RecipientRole, recipientId?: number): number {
  return getUnreadNotifications(recipientRole, recipientId).length;
}

export function deleteNotification(notificationId: string): boolean {
  return notificationStore.delete(notificationId);
}

export function clearOldNotifications(hoursOld: number = 24): number {
  const cutoffTime = Date.now() - (hoursOld * 60 * 60 * 1000);
  let count = 0;

  for (const [id, notification] of notificationStore.entries()) {
    if (notification.createdAt.getTime() < cutoffTime) {
      notificationStore.delete(id);
      count++;
    }
  }

  return count;
}
