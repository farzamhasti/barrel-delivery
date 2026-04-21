import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, menuCategories, InsertMenuCategory, menuItems, InsertMenuItem, drivers, InsertDriver, customers, InsertCustomer, orders, InsertOrder, orderItems, InsertOrderItem, systemCredentials, systemSessions } from "../drizzle/schema";
import { ENV } from './_core/env';
import { eq, and, desc, gte, lt, inArray, gt } from "drizzle-orm";
import { createHash, timingSafeEqual } from 'crypto';

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

// Menu Categories
export async function getMenuCategories() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(menuCategories).where(eq(menuCategories.isActive, true)).orderBy(menuCategories.displayOrder);
}

export async function createMenuCategory(data: InsertMenuCategory) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(menuCategories).values(data);
}

export async function updateMenuCategory(id: number, data: Partial<InsertMenuCategory>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(menuCategories).set(data).where(eq(menuCategories.id, id));
}

export async function deleteMenuCategory(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Soft delete
  return db.update(menuCategories).set({ isActive: false }).where(eq(menuCategories.id, id));
}

// Menu Items
export async function getMenuItems(categoryId?: number) {
  const db = await getDb();
  if (!db) return [];
  
  let result;
  if (categoryId !== undefined) {
    result = await db.select().from(menuItems)
      .where(and(eq(menuItems.isAvailable, true), eq(menuItems.categoryId, categoryId)))
      .orderBy(menuItems.displayOrder);
  } else {
    result = await db.select().from(menuItems)
      .where(eq(menuItems.isAvailable, true))
      .orderBy(menuItems.displayOrder);
  }
  
  // Convert Decimal prices to numbers
  return result.map(item => ({
    ...item,
    price: Number(item.price),
  }));
}

export async function createMenuItem(data: InsertMenuItem) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(menuItems).values(data);
}

export async function updateMenuItem(id: number, data: Partial<InsertMenuItem>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(menuItems).set(data).where(eq(menuItems.id, id));
}

export async function deleteMenuItem(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Soft delete
  return db.update(menuItems).set({ isAvailable: false }).where(eq(menuItems.id, id));
}

// Drivers
export async function getDrivers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(drivers).orderBy(drivers.createdAt);
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
  return db.delete(drivers).where(eq(drivers.id, id));
}

// Customers
export async function createCustomer(data: InsertCustomer) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // If no coordinates provided but address exists, attempt to geocode
  let finalData = { ...data };
  if ((!data.latitude || !data.longitude) && data.address) {
    try {
      const { geocodeAddress } = await import('./_core/map');
      const coords = await geocodeAddress(data.address);
      if (coords) {
        finalData.latitude = coords.lat as any;
        finalData.longitude = coords.lng as any;
      }
    } catch (error) {
      console.warn('[Database] Geocoding failed for address:', data.address, error);
      // Continue without coordinates if geocoding fails
    }
  }
  
  const result = await db.insert(customers).values(finalData);
  // Extract insertId from the result
  const insertId = (result as any)[0]?.insertId;
  if (insertId) {
    return db.select().from(customers).where(eq(customers.id, insertId)).then(rows => rows[0] || null);
  }
  return result;
}

export async function getCustomer(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(customers).where(eq(customers.id, id));
  return result[0] || null;
}

// Alias for backwards compatibility
export const getCustomerById = getCustomer;
export const getOrderById = getOrder;

export async function updateCustomer(id: number, data: Partial<InsertCustomer>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(customers).set(data).where(eq(customers.id, id));
}

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
      customerId: orders.customerId,
      driverId: orders.driverId,
      status: orders.status,
      subtotal: orders.subtotal,
      taxPercentage: orders.taxPercentage,
      taxAmount: orders.taxAmount,
      totalPrice: orders.totalPrice,
      notes: orders.notes,
      area: orders.area,
      hasDeliveryTime: orders.hasDeliveryTime,
      deliveryTime: orders.deliveryTime,
      createdAt: orders.createdAt,
      updatedAt: orders.updatedAt,
      customerName: customers.name,
      customerPhone: customers.phone,
      customerAddress: customers.address,
      customerLatitude: customers.latitude,
      customerLongitude: customers.longitude,
    })
    .from(orders)
    .innerJoin(customers, eq(orders.customerId, customers.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(orders.createdAt));
  
  // Convert Decimal values to numbers
  return result.map(order => ({
    ...order,
    subtotal: Number(order.subtotal),
    taxPercentage: Number(order.taxPercentage),
    taxAmount: Number(order.taxAmount),
    totalPrice: Number(order.totalPrice),
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
      customerId: orders.customerId,
      driverId: orders.driverId,
      status: orders.status,
      subtotal: orders.subtotal,
      taxPercentage: orders.taxPercentage,
      taxAmount: orders.taxAmount,
      totalPrice: orders.totalPrice,
      notes: orders.notes,
      area: orders.area,
      hasDeliveryTime: orders.hasDeliveryTime,
      deliveryTime: orders.deliveryTime,
      createdAt: orders.createdAt,
      updatedAt: orders.updatedAt,
      customerName: customers.name,
      customerPhone: customers.phone,
      customerAddress: customers.address,
      customerLatitude: customers.latitude,
      customerLongitude: customers.longitude,
    })
    .from(orders)
    .innerJoin(customers, eq(orders.customerId, customers.id))
    .where(eq(orders.id, orderId));
  if (!order.length) return null;

  const items = await db
    .select({
      id: orderItems.id,
      orderId: orderItems.orderId,
      menuItemId: orderItems.menuItemId,
      quantity: orderItems.quantity,
      priceAtOrder: orderItems.priceAtOrder,
      menuItemName: menuItems.name,
    })
    .from(orderItems)
    .innerJoin(menuItems, eq(orderItems.menuItemId, menuItems.id))
    .where(eq(orderItems.orderId, orderId));

  // Convert Decimal values to numbers
  const orderData = order[0];
  return {
    ...orderData,
    subtotal: Number(orderData.subtotal),
    taxPercentage: Number(orderData.taxPercentage),
    taxAmount: Number(orderData.taxAmount),
    totalPrice: Number(orderData.totalPrice),
    items: items.map(item => ({
      ...item,
      priceAtOrder: Number(item.priceAtOrder),
    })),
  };
}

export async function getTodayOrdersWithItems() {
  const db = await getDb();
  if (!db) return [];
  
  const today = new Date();
  const startOfDay = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 0, 0, 0, 0));
  const endOfDay = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + 1, 0, 0, 0, 0));
  
  const todayOrders = await db
    .select({
      id: orders.id,
      customerId: orders.customerId,
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
      customerName: customers.name,
      customerPhone: customers.phone,
      customerAddress: customers.address,
      customerLatitude: customers.latitude,
      customerLongitude: customers.longitude,
    })
    .from(orders)
    .innerJoin(customers, eq(orders.customerId, customers.id))
    .where(and(gte(orders.createdAt, startOfDay), lt(orders.createdAt, endOfDay)))
    .orderBy(desc(orders.createdAt))
  
  const ordersWithItems = await Promise.all(
    todayOrders.map(async (order) => {
      const items = await db
        .select({
          id: orderItems.id,
          orderId: orderItems.orderId,
          menuItemId: orderItems.menuItemId,
          quantity: orderItems.quantity,
          priceAtOrder: orderItems.priceAtOrder,
          menuItemName: menuItems.name,
        })
        .from(orderItems)
        .innerJoin(menuItems, eq(orderItems.menuItemId, menuItems.id))
        .where(eq(orderItems.orderId, order.id));
      
      return {
        ...order,
        subtotal: Number(order.subtotal),
        taxPercentage: Number(order.taxPercentage),
        taxAmount: Number(order.taxAmount),
        totalPrice: Number(order.totalPrice),
        customer: {
          name: order.customerName,
          phone: order.customerPhone,
          address: order.customerAddress,
          latitude: order.customerLatitude,
          longitude: order.customerLongitude,
        },
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
      customerId: orders.customerId,
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
      customerName: customers.name,
      customerPhone: customers.phone,
      customerAddress: customers.address,
    })
    .from(orders)
    .innerJoin(customers, eq(orders.customerId, customers.id))
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
  return db.update(orders).set({ status }).where(eq(orders.id, orderId));
}

export async function assignOrderToDriver(orderId: number, driverId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(orders).set({ driverId }).where(eq(orders.id, orderId));
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
      menuItemName: menuItems.name,
    })
    .from(orderItems)
    .innerJoin(menuItems, eq(orderItems.menuItemId, menuItems.id))
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
  const orderData = {
    ...data,
    subtotal: data.subtotal ? String(data.subtotal) : "0",
    taxPercentage: data.taxPercentage ? String(data.taxPercentage) : "13",
    taxAmount: data.taxAmount ? String(data.taxAmount) : "0",
    totalPrice: data.totalPrice ? String(data.totalPrice) : "0",
  };
  
  const result = await db.insert(orders).values(orderData as any);
  
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
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Import the driverSessions table
  const { driverSessions } = await import("../drizzle/schema");
  
  return db.insert(driverSessions).values({
    driverId,
    sessionToken,
    expiresAt,
  });
}

export async function getDriverSession(sessionToken: string) {
  const db = await getDb();
  if (!db) return null;
  
  const { driverSessions } = await import("../drizzle/schema");
  
  const result = await db
    .select()
    .from(driverSessions)
    .where(and(
      eq(driverSessions.sessionToken, sessionToken),
      gt(driverSessions.expiresAt, new Date())
    ));
  
  return result[0] || null;
}

export async function deleteDriverSession(sessionToken: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const { driverSessions } = await import("../drizzle/schema");
  
  return db.delete(driverSessions).where(eq(driverSessions.sessionToken, sessionToken));
}

export async function getDriverBySessionToken(sessionToken: string) {
  const db = await getDb();
  if (!db) return null;
  
  const { driverSessions } = await import("../drizzle/schema");
  
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


// Geocode all customers without coordinates
export async function geocodeAllCustomers() {
  const db = await getDb();
  if (!db) return { geocodedCount: 0, totalCustomers: 0 };

  try {
    const { geocodeAddress } = await import('./_core/map');
    const allCustomers = await db.select().from(customers);
    let geocodedCount = 0;

    for (const customer of allCustomers) {
      if (!customer.latitude && !customer.longitude && customer.address) {
        try {
          const coords = await geocodeAddress(customer.address);
          if (coords) {
            await db.update(customers).set({
              latitude: coords.lat as any,
              longitude: coords.lng as any,
            }).where(eq(customers.id, customer.id));
            geocodedCount++;
          }
        } catch (error) {
          console.warn(`[Database] Failed to geocode customer ${customer.id}:`, error);
        }
      }
    }

    return { geocodedCount, totalCustomers: allCustomers.length };
  } catch (error) {
    console.error('[Database] Error geocoding customers:', error);
    return { geocodedCount: 0, totalCustomers: 0 };
  }
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
    isActive: true,
  });
  
  return result;
}
