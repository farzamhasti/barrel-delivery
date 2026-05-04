import { drizzle } from 'drizzle-orm/mysql2';
import { notifications as notificationsTable, Notification as DBNotification } from '../drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// In-memory notification store (fallback when database table doesn't exist)
let inMemoryNotifications: Notification[] = [];
const MAX_IN_MEMORY_NOTIFICATIONS = 100;
let serverStartTime = Date.now();

// Clear old notifications on startup
setTimeout(() => {
  serverStartTime = Date.now();
  inMemoryNotifications = [];
}, 100);

async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn('[Notifications] Failed to connect to database:', error);
      _db = null;
    }
  }
  return _db;
}

function addToInMemoryStore(notification: Notification): void {
  inMemoryNotifications.unshift(notification); // Add to front (newest first)
  // Keep only the most recent notifications
  if (inMemoryNotifications.length > MAX_IN_MEMORY_NOTIFICATIONS) {
    inMemoryNotifications.pop();
  }
}

function getFromInMemoryStore(recipientRole: RecipientRole, recipientId?: number): Notification[] {
  return inMemoryNotifications.filter(n => {
    if (n.recipientRole !== recipientRole) return false;
    if (recipientRole === 'driver' && recipientId && n.recipientId !== recipientId) return false;
    // Filter out notifications with undefined order/reservation numbers
    if (n.message && n.message.includes('undefined')) return false;
    // Only return notifications created after server startup
    if (n.createdAt.getTime() < serverStartTime) return false;
    return true;
  });
}

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
  id: number;
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

export async function createNotification(data: {
  recipientRole: RecipientRole;
  recipientId?: number;
  type: NotificationType;
  message: string;
  orderId?: number;
  reservationId?: number;
  driverId?: number;
}): Promise<Notification> {
  const db = await getDb();
  
  if (!db) {
    console.warn('[createNotification] Database not available');
    return createMockNotification(data);
  }
  
  try {
    const result = await db.insert(notificationsTable).values({
      recipientRole: data.recipientRole,
      recipientId: data.recipientId,
      type: data.type,
      message: data.message,
      orderId: data.orderId,
      reservationId: data.reservationId,
      driverId: data.driverId,
      isRead: false,
    });

    const insertedId = result[0]?.insertId;
    if (!insertedId) {
      throw new Error('Failed to create notification');
    }

    const notification = await db
      .select()
      .from(notificationsTable)
      .where(eq(notificationsTable.id, insertedId as number))
      .then(rows => rows[0]);

    console.log('[createNotification] Created notification:', { 
      role: notification?.recipientRole, 
      message: notification?.message, 
      orderId: notification?.orderId, 
      reservationId: notification?.reservationId 
    });

    return notification as Notification;
  } catch (error: any) {
    if (error.message?.includes("doesn't exist") || error.sqlMessage?.includes("doesn't exist")) {
      console.warn('[createNotification] Notifications table does not exist. Using in-memory store.');
      return createMockNotification(data);
    }
    throw error;
  }
}

function createMockNotification(data: any): Notification {
  const notification: Notification = {
    id: Math.floor(Math.random() * 1000000),
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
  // Store in memory for retrieval
  addToInMemoryStore(notification);
  return notification;
}

export async function getNotifications(recipientRole: RecipientRole, recipientId?: number): Promise<Notification[]> {
  const db = await getDb();
  
  if (!db) {
    console.warn('[getNotifications] Database not available, using in-memory store');
    return getFromInMemoryStore(recipientRole, recipientId);
  }
  
  try {
    let query = db
      .select()
      .from(notificationsTable)
      .where(eq(notificationsTable.recipientRole, recipientRole));

    // For driver notifications, also match by recipientId
    if (recipientRole === 'driver' && recipientId) {
      query = db
        .select()
        .from(notificationsTable)
        .where(
          and(
            eq(notificationsTable.recipientRole, recipientRole),
            eq(notificationsTable.recipientId, recipientId)
          )
        );
    }

    const notifications = await query;
    
    console.log(`[getNotifications] Querying for role=${recipientRole}, driverId=${recipientId}, found ${notifications.length} notifications`);

    // Sort by creation date (newest first)
    return (notifications as DBNotification[])
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map(n => ({
        ...n,
        createdAt: new Date(n.createdAt),
        readAt: n.readAt ? new Date(n.readAt) : undefined,
      }));
  } catch (error: any) {
    if (error.message?.includes("doesn't exist") || error.sqlMessage?.includes("doesn't exist")) {
      console.warn('[getNotifications] Notifications table does not exist. Using in-memory store.');
      return getFromInMemoryStore(recipientRole, recipientId);
    }
    throw error;
  }
}

export async function getUnreadNotifications(recipientRole: RecipientRole, recipientId?: number): Promise<Notification[]> {
  const notifications = await getNotifications(recipientRole, recipientId);
  return notifications.filter(n => !n.isRead);
}

export async function markNotificationAsRead(notificationId: number): Promise<Notification | null> {
  const db = await getDb();
  
  if (!db) {
    console.warn('[markNotificationAsRead] Database not available');
    return null;
  }
  
  try {
    await db
      .update(notificationsTable)
      .set({ isRead: true, readAt: new Date() })
      .where(eq(notificationsTable.id, notificationId));

    const notification = await db
      .select()
      .from(notificationsTable)
      .where(eq(notificationsTable.id, notificationId))
      .then(rows => rows[0]);

    return notification ? ({
      ...notification,
      createdAt: new Date(notification.createdAt),
      readAt: notification.readAt ? new Date(notification.readAt) : undefined,
    } as Notification) : null;
  } catch (error: any) {
    if (error.message?.includes("doesn't exist") || error.sqlMessage?.includes("doesn't exist")) {
      console.warn('[markNotificationAsRead] Notifications table does not exist.');
      return null;
    }
    throw error;
  }
}

export async function markAllNotificationsAsRead(recipientRole: RecipientRole, recipientId?: number): Promise<number> {
  const db = await getDb();
  
  if (!db) {
    console.warn('[markAllNotificationsAsRead] Database not available');
    return 0;
  }
  
  try {
    let query = db
      .update(notificationsTable)
      .set({ isRead: true, readAt: new Date() })
      .where(eq(notificationsTable.recipientRole, recipientRole));

    // For driver notifications, also match by recipientId
    if (recipientRole === 'driver' && recipientId) {
      query = db
        .update(notificationsTable)
        .set({ isRead: true, readAt: new Date() })
        .where(
          and(
            eq(notificationsTable.recipientRole, recipientRole),
            eq(notificationsTable.recipientId, recipientId)
          )
        );
    }

    const result = await query;
      // @ts-ignore - result type from Drizzle ORM
    return result?.rowsAffected || 0;
      // @ts-ignore - result type is from Drizzle ORM
  } catch (error: any) {
    if (error.message?.includes("doesn't exist") || error.sqlMessage?.includes("doesn't exist")) {
      console.warn('[markAllNotificationsAsRead] Notifications table does not exist.');
      return 0;
    }
    throw error;
  }
}

export async function getUnreadCount(recipientRole: RecipientRole, recipientId?: number): Promise<number> {
  const unread = await getUnreadNotifications(recipientRole, recipientId);
  return unread.length;
}
