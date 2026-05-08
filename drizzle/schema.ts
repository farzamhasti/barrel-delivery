import { mysqlTable, int, varchar, text, timestamp, decimal, mysqlEnum, boolean, unique, foreignKey, bigint } from "drizzle-orm/mysql-core";

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
  status: varchar("status", { length: 20 }).default("offline").notNull(),
  isActive: boolean("is_active").default(true),
  estimatedReturnTime: int("estimated_return_time"),
  estimatedReturnTimeUpdatedAt: timestamp("estimated_return_time_updated_at"),
  timerStartTime: bigint("timer_start_time", { mode: 'number' }), // Milliseconds since epoch when timer was started
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Driver = typeof drivers.$inferSelect;
export type InsertDriver = typeof drivers.$inferInsert;

// Orders table - simplified for scanned receipts
export const orders = mysqlTable("orders", {
  id: int("id").autoincrement().primaryKey(),
  orderNumber: varchar("order_number", { length: 50 }).notNull(),
  customerName: varchar("customer_name", { length: 100 }),
  customerAddress: text("customer_address"),
  customerPhone: varchar("customer_phone", { length: 20 }),
  area: mysqlEnum("area", ["Downtown", "Central Park", "Both"]),
  deliveryTime: varchar("delivery_time", { length: 100 }),
  customerLatitude: decimal("customer_latitude", { precision: 10, scale: 6 }),
  customerLongitude: decimal("customer_longitude", { precision: 10, scale: 6 }),
  receiptImage: text("receipt_image"),
  formattedReceiptImage: text("formatted_receipt_image"),
  receiptText: text("receipt_text"),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }),
  taxAmount: decimal("tax_amount", { precision: 10, scale: 2 }),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }),
  status: varchar("status", { length: 50 }).default("Pending"),
  driverId: int("driver_id"),
  readyAt: timestamp("ready_at"),
  pickedUpAt: timestamp("picked_up_at"),
  deliveredAt: timestamp("delivered_at"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;

// Coordinate type for orders
export interface OrderCoordinates {
  latitude: number;
  longitude: number;
}

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
  eventType: varchar("event_type", { length: 255 }).notNull(),
  numberOfPeople: int("number_of_people").notNull(),
  dateTime: timestamp("date_time").notNull(),
  description: text("description"),
  status: mysqlEnum("status", ["Pending", "Done"]).default("Pending").notNull(),
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

// Notifications table
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  recipientRole: mysqlEnum("recipient_role", ["admin", "kitchen", "driver"]).notNull(), // Who should receive this notification
  recipientId: int("recipient_id"), // For driver notifications, this is the driver ID
  type: mysqlEnum("type", [
    "order_created",
    "order_edited",
    "order_ready",
    "order_delivered",
    "reservation_created",
    "reservation_edited",
    "reservation_done",
    "driver_assignment",
    "admin_message"
  ]).notNull(),
  message: text("message").notNull(),
  orderId: int("order_id"),
  reservationId: int("reservation_id"),
  driverId: int("driver_id"),
  isRead: boolean("is_read").default(false).notNull(),
  readAt: timestamp("read_at"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;


// Message Templates (pre-made messages for admin)
export const messageTemplates = mysqlTable("message_templates", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  templateText: text("template_text").notNull(), // Contains placeholders like [ORDER_NUMBER] or [TEXT]
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MessageTemplate = typeof messageTemplates.$inferSelect;
export type InsertMessageTemplate = typeof messageTemplates.$inferInsert;

// Sent Messages (history of all messages sent by admin)
export const sentMessages = mysqlTable("sent_messages", {
  id: int("id").autoincrement().primaryKey(),
  senderRole: varchar("sender_role", { length: 50 }).notNull().default("admin"),
  recipientRole: varchar("recipient_role", { length: 50 }).notNull(), // "kitchen" or "driver"
  recipientId: int("recipient_id"), // driver ID if sent to a specific driver
  recipientName: varchar("recipient_name", { length: 255 }),
  messageText: text("message_text").notNull(),
  templateId: int("template_id"), // optional reference to template used
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SentMessage = typeof sentMessages.$inferSelect;
export type InsertSentMessage = typeof sentMessages.$inferInsert;


// Geocoded Addresses Cache - for storing geocoding results
export const geocodedAddresses = mysqlTable("geocoded_addresses", {
  id: int("id").autoincrement().primaryKey(),
  address: text("address").notNull().unique(),
  latitude: decimal("latitude", { precision: 10, scale: 6 }).notNull(),
  longitude: decimal("longitude", { precision: 10, scale: 6 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type GeocodedAddress = typeof geocodedAddresses.$inferSelect;
export type InsertGeocodedAddress = typeof geocodedAddresses.$inferInsert;


// ============================================================================
// PHASE 1: COMPETITOR INTEGRATION - MINIMAL SCHEMA
// ============================================================================

// Cached competitor data from OpenStreetMap/Overpass API
export const competitors = mysqlTable("competitors", {
  id: int("id").autoincrement().primaryKey(),
  osmId: varchar("osm_id", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 6 }).notNull(),
  longitude: decimal("longitude", { precision: 10, scale: 6 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(), // "restaurant", "fast_food", "cafe", "bar", "food_court", etc.
  distanceFromRestaurantKm: decimal("distance_from_restaurant_km", { precision: 10, scale: 2 }),
  address: varchar("address", { length: 500 }),
  website: varchar("website", { length: 500 }),
  phone: varchar("phone", { length: 20 }),
  openingHours: varchar("opening_hours", { length: 500 }),
  cachedAt: timestamp("cached_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type Competitor = typeof competitors.$inferSelect;
export type InsertCompetitor = typeof competitors.$inferInsert;

// Competitor cache metadata - tracks refresh status and timing
export const competitorCache = mysqlTable("competitor_cache", {
  id: int("id").autoincrement().primaryKey(),
  restaurantId: varchar("restaurant_id", { length: 50 }).notNull(),
  lastRefreshAt: timestamp("last_refresh_at"),
  nextRefreshAt: timestamp("next_refresh_at"),
  totalCompetitors: int("total_competitors").default(0),
  extractionRadiusKm: decimal("extraction_radius_km", { precision: 10, scale: 2 }).default("2"),
  cacheStatus: varchar("cache_status", { length: 20 }).default("valid"), // "valid", "stale", "refreshing", "error"
  lastErrorMessage: text("last_error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type CompetitorCache = typeof competitorCache.$inferSelect;
export type InsertCompetitorCache = typeof competitorCache.$inferInsert;

// Competitor refresh log - audit trail of refresh operations
export const competitorRefreshLog = mysqlTable("competitor_refresh_log", {
  id: int("id").autoincrement().primaryKey(),
  restaurantId: varchar("restaurant_id", { length: 50 }).notNull(),
  refreshTimestamp: timestamp("refresh_timestamp").defaultNow().notNull(),
  refreshStatus: varchar("refresh_status", { length: 20 }).notNull(), // "success", "partial", "failed"
  competitorCountBefore: int("competitor_count_before"),
  competitorCountAfter: int("competitor_count_after"),
  newCompetitorsAdded: int("new_competitors_added"),
  competitorsRemoved: int("competitors_removed"),
  durationSeconds: int("duration_seconds"),
  errorMessage: text("error_message"),
});

export type CompetitorRefreshLog = typeof competitorRefreshLog.$inferSelect;
export type InsertCompetitorRefreshLog = typeof competitorRefreshLog.$inferInsert;


// ============================================================================
// PHASE 27: ADVANCED GEOMARKETING & SPATIAL COMPETITION ANALYSIS
// ============================================================================

// Spatial clusters - grid-based delivery hotspots
export const spatialClusters = mysqlTable("spatial_clusters", {
  id: int("id").autoincrement().primaryKey(),
  gridCellId: varchar("grid_cell_id", { length: 100 }).notNull().unique(), // e.g., "grid_42.9_-78.9"
  centroidLatitude: decimal("centroid_latitude", { precision: 10, scale: 6 }).notNull(),
  centroidLongitude: decimal("centroid_longitude", { precision: 10, scale: 6 }).notNull(),
  orderCount: int("order_count").default(0).notNull(),
  avgDeliveryTimeMinutes: decimal("avg_delivery_time_minutes", { precision: 10, scale: 2 }),
  zoneType: varchar("zone_type", { length: 50 }), // "underserved", "high_competition", "growing_demand", "efficient", "inefficient"
  competitorCount: int("competitor_count").default(0),
  lastUpdatedAt: timestamp("last_updated_at").defaultNow().onUpdateNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type SpatialCluster = typeof spatialClusters.$inferSelect;
export type InsertSpatialCluster = typeof spatialClusters.$inferInsert;

// Growth analysis - periodic scoring and trend analysis
export const growthAnalysis = mysqlTable("growth_analysis", {
  id: int("id").autoincrement().primaryKey(),
  analysisId: varchar("analysis_id", { length: 100 }).notNull().unique(), // e.g., "growth_2026_05_week"
  periodType: varchar("period_type", { length: 20 }).notNull(), // "daily", "weekly", "monthly"
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  gridCellId: varchar("grid_cell_id", { length: 100 }).notNull(),
  orderCount: int("order_count").default(0),
  growthScore: decimal("growth_score", { precision: 10, scale: 4 }), // 0-1 scale
  trend: varchar("trend", { length: 20 }), // "increasing", "decreasing", "stable"
  competitorDensity: decimal("competitor_density", { precision: 10, scale: 4 }), // competitors per sq km
  efficiencyRating: varchar("efficiency_rating", { length: 20 }), // "excellent", "good", "fair", "poor"
  avgDeliveryTimeMinutes: decimal("avg_delivery_time_minutes", { precision: 10, scale: 2 }),
  insights: text("insights"), // AI-generated insights
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type GrowthAnalysis = typeof growthAnalysis.$inferSelect;
export type InsertGrowthAnalysis = typeof growthAnalysis.$inferInsert;

// Delivery heatmap data - grid-based density and efficiency
export const deliveryHeatmapData = mysqlTable("delivery_heatmap_data", {
  id: int("id").autoincrement().primaryKey(),
  gridCellId: varchar("grid_cell_id", { length: 100 }).notNull().unique(),
  centroidLatitude: decimal("centroid_latitude", { precision: 10, scale: 6 }).notNull(),
  centroidLongitude: decimal("centroid_longitude", { precision: 10, scale: 6 }).notNull(),
  orderDensity: int("order_density").default(0), // orders per grid cell
  avgDeliveryTimeMinutes: decimal("avg_delivery_time_minutes", { precision: 10, scale: 2 }),
  efficiencyScore: decimal("efficiency_score", { precision: 10, scale: 4 }), // 0-1 scale (1 = 20min target)
  competitorCount: int("competitor_count").default(0),
  isUnderserved: boolean("is_underserved").default(false), // avg_delivery_time > 20 min
  isHighCompetition: boolean("is_high_competition").default(false), // >= 3 competitors
  isGrowingDemand: boolean("is_growing_demand").default(false), // 5+ orders, <=2 competitors, score > 0.6
  lastUpdatedAt: timestamp("last_updated_at").defaultNow().onUpdateNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type DeliveryHeatmapData = typeof deliveryHeatmapData.$inferSelect;
export type InsertDeliveryHeatmapData = typeof deliveryHeatmapData.$inferInsert;

// Spatial analysis cache - store latest analysis results
export const spatialAnalysisCache = mysqlTable("spatial_analysis_cache", {
  id: int("id").autoincrement().primaryKey(),
  cacheKey: varchar("cache_key", { length: 100 }).notNull().unique(), // e.g., "spatial_analysis_2026_05_08"
  analysisType: varchar("analysis_type", { length: 50 }).notNull(), // "clusters", "growth", "heatmap", "full"
  analysisData: text("analysis_data").notNull(), // JSON serialized analysis results
  gridCellCount: int("grid_cell_count").default(0),
  competitorCount: int("competitor_count").default(0),
  analysisDurationSeconds: int("analysis_duration_seconds"),
  expiresAt: timestamp("expires_at").notNull(), // 24 hours from creation
  lastUpdatedAt: timestamp("last_updated_at").defaultNow().onUpdateNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type SpatialAnalysisCache = typeof spatialAnalysisCache.$inferSelect;
export type InsertSpatialAnalysisCache = typeof spatialAnalysisCache.$inferInsert;

// Spatial analysis job log - track background job execution
export const spatialAnalysisJobLog = mysqlTable("spatial_analysis_job_log", {
  id: int("id").autoincrement().primaryKey(),
  jobType: varchar("job_type", { length: 50 }).notNull(), // "daily_clustering", "weekly_growth", "monthly_trends", "heatmap_generation"
  jobStatus: varchar("job_status", { length: 20 }).notNull(), // "pending", "running", "completed", "failed"
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  durationSeconds: int("duration_seconds"),
  recordsProcessed: int("records_processed"),
  errorMessage: text("error_message"),
  nextScheduledRun: timestamp("next_scheduled_run"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type SpatialAnalysisJobLog = typeof spatialAnalysisJobLog.$inferSelect;
export type InsertSpatialAnalysisJobLog = typeof spatialAnalysisJobLog.$inferInsert;
