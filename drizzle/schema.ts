import { mysqlTable, int, varchar, text, timestamp, decimal, mysqlEnum, boolean, unique, foreignKey } from "drizzle-orm/mysql-core";

// Users table (for admin/kitchen/driver login)
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 255 }).unique(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 255 }),
  loginMethod: varchar("loginMethod", { length: 50 }),
  role: mysqlEnum("role", ["admin", "user"]).default("user"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn"),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;



// Drivers
export const drivers = mysqlTable("drivers", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  licenseNumber: varchar("license_number", { length: 50 }).unique(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Driver = typeof drivers.$inferSelect;
export type InsertDriver = typeof drivers.$inferInsert;

// NEW: Orders table - simplified for scanned receipts
export const orders = mysqlTable("orders", {
  id: int("id").autoincrement().primaryKey(),
  // Order number from scanned check (e.g., "CHK-12345")
  orderNumber: varchar("order_number", { length: 50 }).unique().notNull(),
  // Customer info
  customerAddress: text("customer_address"),
  customerPhone: varchar("customer_phone", { length: 20 }).notNull(),
  // Delivery info
  area: mysqlEnum("area", ["DN", "CP", "B"]),
  deliveryTime: timestamp("delivery_time"),
  hasDeliveryTime: boolean("has_delivery_time").default(false),
  // Receipt info - store extracted text from OCR
  receiptText: text("receipt_text"),
  receiptImage: text("receipt_image"),
  // Order totals
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull().default("0"),
  taxPercentage: decimal("tax_percentage", { precision: 5, scale: 2 }).default("13").notNull(),
  taxAmount: decimal("tax_amount", { precision: 10, scale: 2 }).default("0").notNull(),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
  // Status and driver
  status: mysqlEnum("status", ["Pending", "Ready", "On the Way", "Delivered"]).default("Pending").notNull(),
  driverId: int("driver_id"),
  // Timestamps
  pickedUpAt: timestamp("picked_up_at"),
  deliveredAt: timestamp("delivered_at"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;

// Order Items (items within an order)
export const orderItems = mysqlTable("order_items", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("order_id").notNull(),
  menuItemId: int("menu_item_id"),
  // For scanned items, store the item name directly
  itemName: varchar("item_name", { length: 255 }),
  quantity: int("quantity").notNull(),
  priceAtOrder: decimal("price_at_order", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = typeof orderItems.$inferInsert;

// Order Status History
export const orderStatusHistory = mysqlTable("order_status_history", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("order_id").notNull(),
  status: mysqlEnum("status", ["Pending", "Ready", "On the Way", "Delivered"]).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type OrderStatusHistory = typeof orderStatusHistory.$inferSelect;
export type InsertOrderStatusHistory = typeof orderStatusHistory.$inferInsert;

// Return Time History
export const returnTimeHistory = mysqlTable("return_time_history", {
  id: int("id").autoincrement().primaryKey(),
  driverId: int("driver_id").notNull(),
  estimatedReturnTime: timestamp("estimated_return_time"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// Reservations
export const reservations = mysqlTable("reservations", {
  id: int("id").autoincrement().primaryKey(),
  customerName: varchar("customer_name", { length: 255 }).notNull(),
  customerPhone: varchar("customer_phone", { length: 20 }).notNull(),
  customerEmail: varchar("customer_email", { length: 255 }),
  reservationDate: timestamp("reservation_date").notNull(),
  partySize: int("party_size").notNull(),
  specialRequests: text("special_requests"),
  status: mysqlEnum("status", ["Pending", "Confirmed", "Cancelled"]).default("Pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Reservation = typeof reservations.$inferSelect;
export type InsertReservation = typeof reservations.$inferInsert;

// System Credentials (for fixed login)
export const systemCredentials = mysqlTable("system_credentials", {
  id: int("id").autoincrement().primaryKey(),
  username: varchar("username", { length: 255 }).unique().notNull(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  role: varchar("role", { length: 50 }).notNull(), // "admin", "kitchen", "driver"
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// System Sessions (for login sessions)
export const systemSessions = mysqlTable("system_sessions", {
  id: int("id").autoincrement().primaryKey(),
  credentialId: int("credential_id").notNull(),
  sessionToken: varchar("session_token", { length: 255 }).unique().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
