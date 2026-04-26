import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, drivers, InsertDriver, orders, InsertOrder, orderItems, InsertOrderItem, systemCredentials, systemSessions, orderStatusHistory, InsertOrderStatusHistory, returnTimeHistory, reservations, InsertReservation, Reservation } from "../drizzle/schema";
import { ENV } from './_core/env';
import { eq, and, desc, gte, lt, inArray, gt, isNull, lte } from "drizzle-orm";
import { createHash, timingSafeEqual } from 'crypto';
import { format, startOfWeek, startOfMonth } from 'date-fns';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(users).where(eq(users.openId, openId));
  return result[0] || null;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    }

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }

    const db = await getDb();
    if (!db) throw new Error("Database not available");

    await db
      .insert(users)
      .values(values)
      .onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Error upserting user:", error);
    throw error;
  }
}

// Drivers
export async function getDrivers() {
  const db = await getDb();
  if (!db) return [];
  // Only return active drivers (soft delete support)
  return db.select().from(drivers).where(eq(drivers.isActive, true)).orderBy(drivers.createdAt);
}

export async function createDriver(data: InsertDriver) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(drivers).values(data);
  // Extract insertId from the result
  const insertId = (result as any)[0]?.insertId;
  if (insertId) {
    return db.select().from(drivers).where(eq(drivers.id, insertId)).then(rows => rows[0] || null);
  }
  return result;
}

export async function updateDriver(id: number, data: Partial<InsertDriver>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(drivers).set(data).where(eq(drivers.id, id));
}

export async function deleteDriver(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Soft delete: set isActive to false instead of hard delete to preserve foreign key references
  return db.update(drivers).set({ isActive: false }).where(eq(drivers.id, id));
}

export async function updateDriverStatus(id: number, status: "online" | "offline") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(drivers).set({ status }).where(eq(drivers.id, id));
}

export async function getActiveDrivers() {
  const db = await getDb();
  if (!db) return [];
  // Return only active (not deleted) drivers with online status
  return db.select().from(drivers).where(and(eq(drivers.status, "online"), eq(drivers.isActive, true))).orderBy(drivers.name);
}

// Customers
// Customers removed - using direct address/phone in orders instead
export const getOrderById = getOrder;

// Orders
export async function getOrders(driverId?: number) {
  const db = await getDb();
  if (!db) return [];
  
  let result;
  if (driverId !== undefined) {
    result = await db.select().from(orders)
      .where(eq(orders.driverId, driverId))
      .orderBy(desc(orders.createdAt));
  } else {
    result = await db.select().from(orders).orderBy(desc(orders.createdAt));
  }
  
  // Convert Decimal values to numbers
  return result.map(order => ({
    ...order,
    subtotal: Number(order.subtotal),
    taxPercentage: Number(order.taxPercentage),
    taxAmount: Number(order.taxAmount),
    totalPrice: Number(order.totalPrice),
  }));
}

export async function getOrdersWithCustomer(driverId?: number) {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [];
  if (driverId !== undefined) {
    conditions.push(eq(orders.driverId, driverId));
  }
  
  const result = await db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      driverId: orders.driverId,
      status: orders.status,
      area: orders.area,
      hasDeliveryTime: orders.hasDeliveryTime,
      deliveryTime: orders.deliveryTime,
      createdAt: orders.createdAt,
      updatedAt: orders.updatedAt,
      customerPhone: orders.customerPhone,
    })
    .from(orders)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(orders.createdAt));
  
  // Convert Decimal values to numbers
  return result.map(order => ({
    ...order,
  }));
}

export async function getOrder(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(orders).where(eq(orders.id, id));
  if (!result[0]) return null;
  
  // Convert Decimal values to numbers
  const order = result[0];
  return {
    ...order,
    subtotal: Number(order.subtotal),
    taxPercentage: Number(order.taxPercentage),
    taxAmount: Number(order.taxAmount),
    totalPrice: Number(order.totalPrice),
  };
}

export async function getOrderWithItems(orderId: number) {
  const db = await getDb();
  if (!db) return null;

  const order = await db
    .select({
      id: orders.id,
      driverId: orders.driverId,
      status: orders.status,
      subtotal: orders.subtotal,
      taxPercentage: orders.taxPercentage,
      taxAmount: orders.taxAmount,
      totalPrice: orders.totalPrice,
      area: orders.area,
      orderNumber: orders.orderNumber,
      customerAddress: orders.customerAddress,
      hasDeliveryTime: orders.hasDeliveryTime,
      deliveryTime: orders.deliveryTime,
      createdAt: orders.createdAt,
      updatedAt: orders.updatedAt,
      customerPhone: orders.customerPhone,
    })
    .from(orders)
    .where(eq(orders.id, orderId));
  if (!order.length) return null;

  const items = await db
    .select({
      id: orderItems.id,
      orderId: orderItems.orderId,
      menuItemId: orderItems.menuItemId,
      quantity: orderItems.quantity,
      priceAtOrder: orderItems.priceAtOrder,
    })
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId));

  // Convert Decimal values to numbers
  const orderData = order[0];
  return {
    ...orderData,
    subtotal: Number(orderData.subtotal),
    taxPercentage: Number(orderData.taxPercentage),
    taxAmount: Number(orderData.taxAmount),
    totalPrice: Number(orderData.totalPrice),
    customerLatitude: orderData.customerLatitude ? Number(orderData.customerLatitude) : null,
    customerLongitude: orderData.customerLongitude ? Number(orderData.customerLongitude) : null,
    items: items.map(item => ({
      ...item,
      priceAtOrder: Number(item.priceAtOrder),
    })),
  };
}

export async function getTodayOrdersWithItems() {
  const db = await getDb();
  if (!db) {
    console.error('[getTodayOrdersWithItems] Database not available');
    return [];
  }
  
  // Get today's date in America/Toronto timezone using a more reliable method
  const now = new Date();
  
  // Create formatter for full date/time in Toronto timezone
  const torontoFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Toronto",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  
  const torontoParts = torontoFormatter.formatToParts(now);
  const year = parseInt(torontoParts.find((p) => p.type === "year")?.value || "2024");
  const month = parseInt(torontoParts.find((p) => p.type === "month")?.value || "1");
  const day = parseInt(torontoParts.find((p) => p.type === "day")?.value || "1");
  const hour = parseInt(torontoParts.find((p) => p.type === "hour")?.value || "0");
  const minute = parseInt(torontoParts.find((p) => p.type === "minute")?.value || "0");
  const second = parseInt(torontoParts.find((p) => p.type === "second")?.value || "0");
  
  // Calculate offset: difference between current UTC time and current Toronto time
  // When we format 'now' in Toronto timezone, we get the Toronto local time
  // The offset is how much we need to add to Toronto time to get UTC
  const torontoTimeMs = new Date(year, month - 1, day, hour, minute, second).getTime();
  const offsetMs = now.getTime() - torontoTimeMs;
  
  // Start of day in UTC: midnight Toronto time + offset
  const midnightTorontoMs = new Date(year, month - 1, day, 0, 0, 0, 0).getTime();
  const startOfDay = new Date(midnightTorontoMs + offsetMs);
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
  
  console.log('[getTodayOrdersWithItems] Timezone calculation:', {
    torontoDate: `${year}-${month}-${day}`,
    torontoTime: `${hour}:${minute}:${second}`,
    offsetMs,
    nowUTC: now.toISOString(),
  });
  
  console.log('[getTodayOrdersWithItems] Date range:', {
    startOfDay: startOfDay.toISOString(),
    endOfDay: endOfDay.toISOString(),
  });
  
  console.log('[getTodayOrdersWithItems] Querying orders between', startOfDay.toISOString(), 'and', endOfDay.toISOString());
  
  const todayOrders = await db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      driverId: orders.driverId,
      status: orders.status,
      subtotal: orders.subtotal,
      taxPercentage: orders.taxPercentage,
      taxAmount: orders.taxAmount,
      totalPrice: orders.totalPrice,
      notes: orders.notes,
      area: orders.area,
      deliveryTime: orders.deliveryTime,
      hasDeliveryTime: orders.hasDeliveryTime,
      createdAt: orders.createdAt,
      updatedAt: orders.updatedAt,
      customerPhone: orders.customerPhone,
    })
    .from(orders)
    .where(and(gte(orders.createdAt, startOfDay), lt(orders.createdAt, endOfDay)))
    .orderBy(desc(orders.createdAt));
  
  console.log('[getTodayOrdersWithItems] Found', todayOrders.length, 'orders');
  
  console.log('[getTodayOrdersWithItems] Processing', todayOrders.length, 'orders with items');
  
  const ordersWithItems = await Promise.all(
    todayOrders.map(async (order) => {
      const items = await db
        .select({
          id: orderItems.id,
          orderId: orderItems.orderId,
          menuItemId: orderItems.menuItemId,
          quantity: orderItems.quantity,
          priceAtOrder: orderItems.priceAtOrder,
        })
        .from(orderItems)
        .where(eq(orderItems.orderId, order.id));
      
      return {
        ...order,
        subtotal: Number(order.subtotal),
        taxPercentage: Number(order.taxPercentage),
        taxAmount: Number(order.taxAmount),
        totalPrice: Number(order.totalPrice),
        items: items.map(item => ({
          ...item,
          priceAtOrder: Number(item.priceAtOrder),
        })),
      };
    })
  );
  
  return ordersWithItems;
}

export async function getOrdersByDateRange(startDate: Date | string, endDate: Date | string, driverId?: number) {
  const db = await getDb();
  if (!db) return [];
  
  // Parse dates - handle both Date objects and ISO strings
  let start: Date;
  let end: Date;
  
  if (typeof startDate === 'string') {
    // Parse ISO date string (YYYY-MM-DD) as UTC
    const parts = startDate.split('-');
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    start = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  } else {
    start = new Date(startDate);
  }
  
  if (typeof endDate === 'string') {
    // Parse ISO date string (YYYY-MM-DD) as UTC
    const parts = endDate.split('-');
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    end = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
  } else {
    end = new Date(endDate);
  }
  
  // Create date range for the entire day
  const rangeStart = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate(), 0, 0, 0, 0));
  const rangeEnd = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate() + 1, 0, 0, 0, 0));
  
  const conditions = [gte(orders.createdAt, rangeStart), lt(orders.createdAt, rangeEnd)];
  
  if (driverId) {
    conditions.push(eq(orders.driverId, driverId));
  }
  
  const result = await db
    .select({
      id: orders.id,
      driverId: orders.driverId,
      status: orders.status,
      subtotal: orders.subtotal,
      taxPercentage: orders.taxPercentage,
      taxAmount: orders.taxAmount,
      totalPrice: orders.totalPrice,
      area: orders.area,
      orderNumber: orders.orderNumber,
      customerAddress: orders.customerAddress,
      deliveryTime: orders.deliveryTime,
      hasDeliveryTime: orders.hasDeliveryTime,
      createdAt: orders.createdAt,
      updatedAt: orders.updatedAt,
      customerPhone: orders.customerPhone,
    })
    .from(orders)
    .where(and(...conditions))
    .orderBy(desc(orders.createdAt));
  
  // Convert Decimal values to numbers
  return result.map(order => ({
    ...order,
    subtotal: Number(order.subtotal),
    taxPercentage: Number(order.taxPercentage),
    taxAmount: Number(order.taxAmount),
    totalPrice: Number(order.totalPrice),
  }))
}

export async function updateOrderStatus(orderId: number, status: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Set timestamps based on status changes
  const updateData: any = { status };
  
  if (status === "On the Way") {
    updateData.pickedUpAt = new Date();
  } else if (status === "Delivered") {
    updateData.deliveredAt = new Date();
  }
  
  return db.update(orders).set(updateData).where(eq(orders.id, orderId));
}

export async function assignOrderToDriver(orderId: number, driverId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(orders).set({ 
    driverId,
    status: "On the Way",
    pickedUpAt: new Date()
  }).where(eq(orders.id, orderId));
}

// Order Items
export async function createOrderItem(data: InsertOrderItem) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(orderItems).values(data);
}

export async function getOrderItems(orderId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
}

export async function getOrderItemsWithMenuNames(orderId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: orderItems.id,
      orderId: orderItems.orderId,
      menuItemId: orderItems.menuItemId,
      quantity: orderItems.quantity,
      priceAtOrder: orderItems.priceAtOrder,
    })
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId));
}

export async function updateOrderItem(id: number, data: Partial<InsertOrderItem> | number, priceAtOrder?: string | number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Handle both old signature (id, quantity, priceAtOrder) and new signature (id, { quantity?, priceAtOrder? })
  let updateData: any = {};
  if (typeof data === 'number') {
    // Old signature: updateOrderItem(id, quantity, priceAtOrder)
    updateData = { quantity: data };
    if (priceAtOrder !== undefined) {
      updateData.priceAtOrder = String(priceAtOrder);
    }
  } else {
    // New signature: updateOrderItem(id, { quantity?, priceAtOrder? })
    if (data.quantity !== undefined) {
      updateData.quantity = data.quantity;
    }
    if (data.priceAtOrder !== undefined) {
      updateData.priceAtOrder = data.priceAtOrder;
    }
  }
  
  return db.update(orderItems).set(updateData).where(eq(orderItems.id, id));
}

export async function deleteOrderItem(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.delete(orderItems).where(eq(orderItems.id, id));
}

export async function deleteAllOrderItems(orderId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.delete(orderItems).where(eq(orderItems.orderId, orderId));
}

export async function updateOrder(id: number, data: { status?: string; notes?: string; totalPrice?: number; subtotal?: number; taxPercentage?: number; taxAmount?: number; deliveryTime?: Date | null; hasDeliveryTime?: boolean }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const updateData: any = {};
  if (data.status) updateData.status = data.status;
  if (data.notes !== undefined) updateData.notes = data.notes;
  if (data.totalPrice !== undefined) updateData.totalPrice = data.totalPrice;
  if (data.subtotal !== undefined) updateData.subtotal = data.subtotal;
  if (data.taxPercentage !== undefined) updateData.taxPercentage = data.taxPercentage;
  if (data.taxAmount !== undefined) updateData.taxAmount = data.taxAmount;
  if (data.deliveryTime !== undefined) updateData.deliveryTime = data.deliveryTime;
  if (data.hasDeliveryTime !== undefined) updateData.hasDeliveryTime = data.hasDeliveryTime;
  return db.update(orders).set(updateData).where(eq(orders.id, id));
}

export async function deleteOrder(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // First delete all order items (cascade delete)
  await db.delete(orderItems).where(eq(orderItems.orderId, id));
  
  // Then delete the order
  return db.delete(orders).where(eq(orders.id, id));
}

export async function createOrder(data: InsertOrder) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Ensure numeric values are properly formatted for Decimal columns
  const orderData: any = {
    subtotal: data.subtotal ? String(data.subtotal) : "0",
    taxPercentage: data.taxPercentage ? String(data.taxPercentage) : "13",
    taxAmount: data.taxAmount ? String(data.taxAmount) : "0",
    totalPrice: data.totalPrice ? String(data.totalPrice) : "0",
    deliveryTime: data.deliveryTime || null,
    hasDeliveryTime: data.hasDeliveryTime,
    driverId: data.driverId,
    status: data.status,
  };
  
  if (data.orderNumber) orderData.orderNumber = data.orderNumber;
  if (data.customerAddress) orderData.customerAddress = data.customerAddress;
  if (data.customerPhone) orderData.customerPhone = data.customerPhone;
  
  // Only include area if it's not undefined and not empty
  if (data.area && typeof data.area === 'string' && data.area.trim()) {
    orderData.area = data.area.trim();
  }
  
  let result;
  try {
    result = await db.insert(orders).values(orderData as any);
  } catch (error: any) {
    console.error('[createOrder] Database error:', error.message);
    console.error('[createOrder] Error details:', error);
    throw error;
  }
  
  // Extract the inserted ID from the result
  const insertId = (result as any)?.[0]?.insertId || (result as any)?.insertId;
  
  if (!insertId) {
    console.error('[createOrder] Failed to extract insertId from result:', result);
    return result; // Return raw result if we can't extract ID
  }
  
  // Fetch and return the created order
  const createdOrder = await db.select().from(orders).where(eq(orders.id, insertId));
  if (createdOrder[0]) {
    // Convert Decimal values to numbers for the response
    const order = createdOrder[0];
    return {
      ...order,
      subtotal: Number(order.subtotal),
      taxPercentage: Number(order.taxPercentage),
      taxAmount: Number(order.taxAmount),
      totalPrice: Number(order.totalPrice),
    };
  }
  return { id: insertId, ...data }; // Return the created order or a fallback
}

export async function getOrdersByStatus(statuses?: string[]) {
  const db = await getDb();
  if (!db) return [];
  
  let result;
  if (statuses && statuses.length > 0) {
    // Filter by statuses
    result = await db.select().from(orders).where(inArray(orders.status, statuses as any)).orderBy(desc(orders.createdAt));
  } else {
    result = await db.select().from(orders).orderBy(desc(orders.createdAt));
  }
  
  // Convert Decimal values to numbers
  return result.map(order => ({
    ...order,
    subtotal: Number(order.subtotal),
    taxPercentage: Number(order.taxPercentage),
    taxAmount: Number(order.taxAmount),
    totalPrice: Number(order.totalPrice),
  }));
}


// Driver Authentication
export async function getDriverByNameAndLicense(name: string, licenseNumber: string) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db
    .select()
    .from(drivers)
    .where(and(
      eq(drivers.name, name),
      eq(drivers.licenseNumber, licenseNumber),
      eq(drivers.isActive, true)
    ));
  
  return result[0] || null;
}

export async function createDriverSession(driverId: number, sessionToken: string, expiresAt: Date) {
  // Driver sessions not implemented in new schema
  return null;
}

export async function getDriverSession(sessionToken: string) {
  // Driver sessions not implemented in new schema
  return null;
  
  /*
  const result = await db
    .select()
    .from(driverSessions)
    .where(and(
      eq(driverSessions.sessionToken, sessionToken),
      gt(driverSessions.expiresAt, new Date())
    ));
  
  return result[0] || null;
  */
}

export async function deleteDriverSession(sessionToken: string) {
  // Driver sessions not implemented in new schema
  return null;
}

export async function getDriverBySessionToken(sessionToken: string) {
  // Driver sessions not implemented in new schema
  return null;
  
  /*
  const session = await db
    .select({
      driverId: driverSessions.driverId,
      driver: drivers,
    })
    .from(driverSessions)
    .innerJoin(drivers, eq(driverSessions.driverId, drivers.id))
    .where(and(
      eq(driverSessions.sessionToken, sessionToken),
      gt(driverSessions.expiresAt, new Date())
    ));
  
  return session[0]?.driver || null;
  */
}


// System Credentials Functions
export async function getSystemCredentials(username: string) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(systemCredentials).where(eq(systemCredentials.username, username));
  return result[0] || null;
}

export async function verifySystemPassword(password: string, passwordHash: string): Promise<boolean> {
  try {
    // Simple hash verification using SHA-256
    // Format: algorithm$salt$hash
    const parts = passwordHash.split('$');
    if (parts.length !== 3 || parts[0] !== 'sha256') {
      return false;
    }
    
    const [, salt, storedHash] = parts;
    const computedHash = createHash('sha256').update(salt + password).digest('hex');
    
    // Use timing-safe comparison to prevent timing attacks
    try {
      return timingSafeEqual(Buffer.from(computedHash), Buffer.from(storedHash));
    } catch {
      return false;
    }
  } catch (error) {
    console.error("Password verification error:", error);
    return false;
  }
}

export async function createSystemSession(credentialId: number, sessionToken: string, expiresAt: Date) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.insert(systemSessions).values({
    credentialId,
    sessionToken,
    expiresAt,
  });
  
  return result;
}

export async function getSystemSessionByToken(sessionToken: string) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db
    .select({
      username: systemCredentials.username,
      role: systemCredentials.role,
      sessionToken: systemSessions.sessionToken,
    })
    .from(systemSessions)
    .innerJoin(systemCredentials, eq(systemSessions.credentialId, systemCredentials.id))
    .where(and(
      eq(systemSessions.sessionToken, sessionToken),
      gt(systemSessions.expiresAt, new Date())
    ));
  
  return result[0] || null;
}

export async function deleteSystemSession(sessionToken: string) {
  const db = await getDb();
  if (!db) return null;
  
  return await db.delete(systemSessions).where(eq(systemSessions.sessionToken, sessionToken));
}



export async function createSystemCredentials(username: string, password: string, role: "admin" | "kitchen") {
  const db = await getDb();
  if (!db) return null;
  
  // Check if user already exists
  const existing = await db.select().from(systemCredentials).where(eq(systemCredentials.username, username));
  if (existing.length > 0) {
    return existing[0];
  }
  
  // Hash password: sha256$salt$hash
  const salt = `${username}_salt_${Date.now()}`;
  const hash = createHash("sha256").update(salt + password).digest("hex");
  const passwordHash = `sha256$${salt}$${hash}`;
  
  const result = await db.insert(systemCredentials).values({
    username,
    passwordHash,
    role,
  });
  
  return result;
}


// Driver Performance Metrics
export async function getDriverPerformanceMetrics(driverId: number) {
  try {
    // Get today's orders using the same method as getAssignedOrders
    const todayDateStr = new Date().toISOString().split("T")[0];
    const todayOrders = await getOrdersByDateRange(todayDateStr, todayDateStr, driverId);

    // Count delivered orders
    const deliveredOrders = todayOrders.filter((order: any) => order.status === "Delivered");
    const todayDeliveryCount = deliveredOrders.length;

    // Calculate real average delivery time (in minutes)
    let averageDeliveryTime = 0;
    if (todayDeliveryCount > 0) {
      // Get the raw order data with timestamps from database
      const db = await getDb();
      if (db) {
        const ordersWithTimestamps = await db
          .select({
            id: orders.id,
            pickedUpAt: orders.pickedUpAt,
            deliveredAt: orders.deliveredAt,
          })
          .from(orders)
          .where(and(
            eq(orders.driverId, driverId),
            eq(orders.status, "Delivered"),
            gte(orders.createdAt, new Date(todayDateStr)),
            lt(orders.createdAt, new Date(new Date(todayDateStr).getTime() + 24 * 60 * 60 * 1000))
          ));

        // Calculate average delivery time from actual timestamps
        let totalDeliveryTime = 0;
        let ordersWithValidTimestamps = 0;

        for (const order of ordersWithTimestamps) {
          if (order.pickedUpAt && order.deliveredAt) {
            const deliveryTimeMs = new Date(order.deliveredAt).getTime() - new Date(order.pickedUpAt).getTime();
            const deliveryTimeMinutes = Math.round(deliveryTimeMs / (1000 * 60));
            totalDeliveryTime += deliveryTimeMinutes;
            ordersWithValidTimestamps++;
          }
        }

        if (ordersWithValidTimestamps > 0) {
          averageDeliveryTime = Math.round(totalDeliveryTime / ordersWithValidTimestamps);
        } else {
          // Fallback to 15 minutes if no valid timestamps
          averageDeliveryTime = 15;
        }
      }
    }

    // Calculate completion rate
    const totalOrders = todayOrders.length;
    const completionRate = totalOrders > 0 ? Math.round((deliveredOrders.length / totalOrders) * 100) : 0;

    return {
      todayDeliveryCount,
      averageDeliveryTime,
      completionRate,
    };
  } catch (error) {
    console.error("[Database] Error calculating driver performance metrics:", error);
    return {
      todayDeliveryCount: 0,
      averageDeliveryTime: 0,
      completionRate: 0,
    };
  }
}


// Order Status History tracking
export async function logOrderStatusChange(orderId: number, previousStatus: string | null, newStatus: string) {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db.insert(orderStatusHistory).values({
      orderId,
      status: newStatus as any,
    });
    return result;
  } catch (error) {
    console.error("[Database] Error logging order status change:", error);
    return null;
  }
}

export async function getOrderStatusTimeline(orderId: number) {
  const db = await getDb();
  if (!db) return [];

  try {
    const timeline = await db
      .select()
      .from(orderStatusHistory)
      .where(eq(orderStatusHistory.orderId, orderId))
      .orderBy(desc(orderStatusHistory.createdAt));
    
    return timeline;
  } catch (error) {
    console.error("[Database] Error fetching order status timeline:", error);
    return [];
  }
}

export async function getDeliveryReportMetrics(startDate: Date, endDate: Date) {
  const db = await getDb();
  if (!db) return null;

  try {
    // Get all delivered orders in the date range
    const deliveredOrders = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.status, "Delivered"),
          gte(orders.updatedAt, startDate),
          lt(orders.updatedAt, endDate)
        )
      );

    // Get all orders in the date range
    const totalOrders = await db
      .select()
      .from(orders)
      .where(
        and(
          gte(orders.createdAt, startDate),
          lt(orders.createdAt, endDate)
        )
      );

    // Calculate metrics
    const totalCount = totalOrders.length;
    const deliveredCount = deliveredOrders.length;
    const deliveryRate = totalCount > 0 ? Math.round((deliveredCount / totalCount) * 100) : 0;

    // Calculate average delivery time
    let totalDeliveryTime = 0;
    let ordersWithTime = 0;

    for (const order of deliveredOrders) {
      if (order.pickedUpAt && order.deliveredAt) {
        const timeMs = new Date(order.deliveredAt).getTime() - new Date(order.pickedUpAt).getTime();
        const timeMinutes = Math.round(timeMs / (1000 * 60));
        totalDeliveryTime += timeMinutes;
        ordersWithTime++;
      }
    }

    const averageDeliveryTime = ordersWithTime > 0 ? Math.round(totalDeliveryTime / ordersWithTime) : 0;

    return {
      totalOrders: totalCount,
      deliveredOrders: deliveredCount,
      deliveryRate,
      averageDeliveryTime,
      dateRange: {
        start: startDate,
        end: endDate,
      },
    };
  } catch (error) {
    console.error("[Database] Error calculating delivery report metrics:", error);
    return null;
  }
}


export async function getOrderTimelinesForReport(startDate: Date, endDate: Date) {
  const db = await getDb();
  if (!db) return null;

  try {
    // Get all orders in the date range with customer info
    const orderList = await db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        status: orders.status,
        createdAt: orders.createdAt,
        updatedAt: orders.updatedAt,
        pickedUpAt: orders.pickedUpAt,
        deliveredAt: orders.deliveredAt,
        customerAddress: orders.customerAddress,
        customerPhone: orders.customerPhone,
      })
      .from(orders)
      .where(
        and(
          gte(orders.createdAt, startDate),
          lt(orders.createdAt, endDate)
        )
      );

    // Customer info is now stored directly in orders table
    const customerMap = new Map();

    // Get status history for each order
    const orderIds = orderList.map(o => o.id);
    const statusHistories = await db
      .select()
      .from(orderStatusHistory)
      .where(inArray(orderStatusHistory.orderId, orderIds));

    // Group status histories by order
    const historyMap = new Map<number, typeof statusHistories>();
    for (const history of statusHistories) {
      if (!historyMap.has(history.orderId)) {
        historyMap.set(history.orderId, []);
      }
      historyMap.get(history.orderId)!.push(history);
    }

    // Build timeline data for each order
    const timelines = orderList.map(order => {
      const history = historyMap.get(order.id) || [];

      // Sort history by timestamp
      history.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

      // Extract timestamps for each status
      const statusTimes: Record<string, Date | null> = {
        pending: null,
        ready: null,
        onTheWay: null,
        delivered: null,
      };

      for (const entry of history) {
        if (entry.status === "Pending") statusTimes.pending = entry.createdAt;
        if (entry.status === "Ready") statusTimes.ready = entry.createdAt;
        if (entry.status === "On the Way") statusTimes.onTheWay = entry.createdAt;
        if (entry.status === "Delivered") statusTimes.delivered = entry.createdAt;
      }

      // Calculate durations between statuses
      const calculateDuration = (from: Date | null, to: Date | null) => {
        if (!from || !to) return null;
        const ms = new Date(to).getTime() - new Date(from).getTime();
        const totalSeconds = Math.round(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return {
          totalSeconds,
          minutes,
          seconds,
          formatted: `${minutes}:${String(seconds).padStart(2, '0')}`,
        };
      };

      return {
        orderId: order.id,
        orderNumber: order.orderNumber,
        customerAddress: order.customerAddress,
        customerPhone: order.customerPhone,
        status: order.status,
        timestamps: {
          pending: statusTimes.pending,
          ready: statusTimes.ready,
          onTheWay: statusTimes.onTheWay,
          delivered: statusTimes.delivered,
        },
        durations: {
          pending: calculateDuration(statusTimes.pending, statusTimes.ready),
          ready: calculateDuration(statusTimes.ready, statusTimes.onTheWay),
          onTheWay: calculateDuration(statusTimes.onTheWay, statusTimes.delivered),
          delivered: statusTimes.delivered ? new Date(statusTimes.delivered).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }) : null,
        },
      };
    });

    return timelines;
  } catch (error) {
    console.error("[Database] Error fetching order timelines:", error);
    return null;
  }
}


// Get aggregated delivery report by time period (daily, weekly, monthly)
export async function getAggregatedDeliveryReport(
  startDate: Date,
  endDate: Date,
  reportType: "daily" | "weekly" | "monthly"
) {
  const db = await getDb();
  if (!db) return [];

  const ordersList = await db
    .select({
      id: orders.id,
      customerId: orders.customerId,
      status: orders.status,
      createdAt: orders.createdAt,
      pickedUpAt: orders.pickedUpAt,
      deliveredAt: orders.deliveredAt,
    })
    .from(orders)
    .where(
      and(
        gte(orders.createdAt, startDate),
        lte(orders.createdAt, endDate)
      )
    );

  // Group orders by time period
  const groupedByPeriod = new Map<
    string,
    {
      date: string;
      totalOrders: number;
      deliveredOrders: number;
      avgDeliveryTime: number;
      completionRate: number;
    }
  >();

  for (const order of ordersList) {
    const orderDate = new Date(order.createdAt);
    let periodKey: string;

    if (reportType === "daily") {
      periodKey = format(orderDate, "yyyy-MM-dd");
    } else if (reportType === "weekly") {
      const weekStart = startOfWeek(orderDate, { weekStartsOn: 0 });
      periodKey = format(weekStart, "yyyy-MM-dd");
    } else {
      // monthly
      const monthStart = startOfMonth(orderDate);
      periodKey = format(monthStart, "yyyy-MM");
    }

    if (!groupedByPeriod.has(periodKey)) {
      groupedByPeriod.set(periodKey, {
        date: periodKey,
        totalOrders: 0,
        deliveredOrders: 0,
        avgDeliveryTime: 0,
        completionRate: 0,
      });
    }

    const period = groupedByPeriod.get(periodKey)!;
    period.totalOrders += 1;

    if (order.status === "Delivered" && order.pickedUpAt && order.deliveredAt) {
      period.deliveredOrders += 1;
      const deliveryTime =
        (new Date(order.deliveredAt).getTime() -
          new Date(order.pickedUpAt).getTime()) /
        60000; // minutes
      period.avgDeliveryTime =
        (period.avgDeliveryTime * (period.deliveredOrders - 1) + deliveryTime) /
        period.deliveredOrders;
    }

    period.completionRate =
      period.totalOrders > 0
        ? Math.round((period.deliveredOrders / period.totalOrders) * 100)
        : 0;
  }

  return Array.from(groupedByPeriod.values()).sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
}

// Get detailed order timelines for a specific date range with aggregation
export async function getDetailedOrderTimelinesForPeriod(
  startDate: Date,
  endDate: Date,
  reportType: "daily" | "weekly" | "monthly"
) {
  const timelines = await getOrderTimelinesForReport(startDate, endDate) || [];

  // Group timelines by period
  const groupedByPeriod = new Map<string, typeof timelines>();

  for (const timeline of timelines) {
    // Use the first timestamp available for grouping
    const orderDate = timeline.timestamps.pending || new Date();
    let periodKey: string;

    if (reportType === "daily") {
      periodKey = format(orderDate, "yyyy-MM-dd");
    } else if (reportType === "weekly") {
      const weekStart = startOfWeek(orderDate, { weekStartsOn: 0 });
      periodKey = format(weekStart, "yyyy-MM-dd");
    } else {
      // monthly
      const monthStart = startOfMonth(orderDate);
      periodKey = format(monthStart, "yyyy-MM");
    }

    if (!groupedByPeriod.has(periodKey)) {
      groupedByPeriod.set(periodKey, []);
    }

    groupedByPeriod.get(periodKey)!.push(timeline);
  }

  return Array.from(groupedByPeriod.entries()).map(([period, ordersList]) => ({
    period,
    orders: ordersList,
    count: ordersList.length,
  }));
}


// Return Time Management Functions
export async function saveReturnTime(driverId: number, totalSeconds: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const startTimestamp = new Date();
  
  // Update driver with return time
  await db.update(drivers).set({
    returnTimeTotalSeconds: totalSeconds,
    returnTimeStartTimestamp: startTimestamp,
  }).where(eq(drivers.id, driverId));

  // Record in history
  await db.insert(returnTimeHistory).values({
    driverId,
    estimatedReturnTime: new Date(startTimestamp.getTime() + totalSeconds * 1000),
  } as any);

  return {
    driverId,
    totalSeconds,
    startTimestamp,
    remainingSeconds: totalSeconds,
    isExpired: false,
  };
}

export async function getReturnTime(driverId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Return time tracking moved to returnTimeHistory table
  return null;
}

export async function clearReturnTime(driverId: number, reason?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get current return time before clearing
  const current = await getReturnTime(driverId);

  // Return time tracking moved to returnTimeHistory table

  // Record in history
  if (current) {
    await db.insert(returnTimeHistory).values({
      driverId,
      estimatedReturnTime: new Date(),
    });
  }
}

export async function getReturnTimeHistory(driverId: number, limit: number = 10) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const results = await db.select()
    .from(returnTimeHistory)
    .where(eq(returnTimeHistory.driverId, driverId))
    .orderBy(desc(returnTimeHistory.createdAt))
    .limit(limit);

  return results;
}


// Reservation Functions
export async function createReservation(data: InsertReservation) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(reservations).values(data);
  return result;
}

export async function getReservations() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const results = await db.select()
    .from(reservations)
    .orderBy(desc(reservations.reservationDate));

  return results;
}

export async function getReservationById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.select()
    .from(reservations)
    .where(eq(reservations.id, id));

  return result[0] || null;
}

export async function updateReservationStatus(id: number, status: "Pending" | "Confirmed" | "Cancelled") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.update(reservations)
    .set({ status })
    .where(eq(reservations.id, id));

  return result;
}

export async function deleteReservation(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.delete(reservations)
    .where(eq(reservations.id, id));

  return result;
}
