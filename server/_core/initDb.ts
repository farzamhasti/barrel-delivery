import mysql from "mysql2/promise";
import { ENV } from "./env";
import { createHash } from "crypto";

let initialized = false;

export async function initializeDatabase() {
  if (initialized) return;

  try {
    const connection = await mysql.createConnection(ENV.databaseUrl);

    // Create tables if they don't exist - column names and types match drizzle/schema.ts exactly
    const statements = [
      // users table (backing OAuth auth flow)
      `CREATE TABLE IF NOT EXISTS users (
        id int AUTO_INCREMENT NOT NULL,
        openId varchar(64) NOT NULL,
        name text,
        email varchar(320),
        loginMethod varchar(64),
        role enum('user','admin','driver') NOT NULL DEFAULT 'user',
        createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        lastSignedIn timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY(id),
        UNIQUE KEY(openId)
      )`,

      `CREATE TABLE IF NOT EXISTS authorized_emails (
        id int AUTO_INCREMENT NOT NULL,
        email varchar(320) NOT NULL,
        role enum('admin','kitchen','driver') NOT NULL,
        is_active boolean DEFAULT true,
        createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY(id),
        UNIQUE KEY(email)
      )`,

      `CREATE TABLE IF NOT EXISTS menu_categories (
        id int AUTO_INCREMENT NOT NULL,
        name varchar(255) NOT NULL,
        description text,
        display_order int DEFAULT 0,
        is_active boolean DEFAULT true,
        createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY(id)
      )`,

      // menu_items includes image_url, is_available, and display_order to match schema.ts
      `CREATE TABLE IF NOT EXISTS menu_items (
        id int AUTO_INCREMENT NOT NULL,
        category_id int NOT NULL,
        name varchar(255) NOT NULL,
        description text,
        price decimal(10,2) NOT NULL,
        image_url text,
        is_available boolean DEFAULT true,
        display_order int DEFAULT 0,
        createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY(id),
        FOREIGN KEY(category_id) REFERENCES menu_categories(id)
      )`,

      // drivers: column names match schema.ts (snake_case, includes user_id and location fields)
      `CREATE TABLE IF NOT EXISTS drivers (
        id int AUTO_INCREMENT NOT NULL,
        user_id int,
        name varchar(255) NOT NULL,
        phone varchar(20),
        license_number varchar(50),
        vehicle_type varchar(100),
        is_active boolean DEFAULT true,
        status enum('online','offline') NOT NULL DEFAULT 'offline',
        current_latitude decimal(10,8),
        current_longitude decimal(11,8),
        last_location_update timestamp NULL,
        createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY(id)
      )`,

      `CREATE TABLE IF NOT EXISTS driver_sessions (
        id int AUTO_INCREMENT NOT NULL,
        driver_id int NOT NULL,
        session_token varchar(255) NOT NULL,
        expires_at timestamp NOT NULL,
        createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY(id),
        UNIQUE KEY(session_token),
        FOREIGN KEY(driver_id) REFERENCES drivers(id)
      )`,

      `CREATE TABLE IF NOT EXISTS customers (
        id int AUTO_INCREMENT NOT NULL,
        name varchar(255) NOT NULL,
        phone varchar(20),
        address text NOT NULL,
        latitude decimal(10,8),
        longitude decimal(11,8),
        createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY(id)
      )`,

      // orders: all columns from schema.ts including subtotal, tax fields, delivery tracking
      `CREATE TABLE IF NOT EXISTS orders (
        id int AUTO_INCREMENT NOT NULL,
        customer_id int NOT NULL,
        driver_id int,
        status enum('Pending','Ready','On the Way','Delivered') NOT NULL DEFAULT 'Pending',
        subtotal decimal(10,2) NOT NULL DEFAULT 0,
        tax_percentage decimal(5,2) NOT NULL DEFAULT 13,
        tax_amount decimal(10,2) NOT NULL DEFAULT 0,
        total_price decimal(10,2) NOT NULL,
        delivery_time timestamp NULL,
        has_delivery_time boolean DEFAULT false,
        notes text,
        area varchar(50),
        picked_up_at timestamp NULL,
        delivered_at timestamp NULL,
        createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY(id),
        FOREIGN KEY(customer_id) REFERENCES customers(id),
        FOREIGN KEY(driver_id) REFERENCES drivers(id)
      )`,

      `CREATE TABLE IF NOT EXISTS order_items (
        id int AUTO_INCREMENT NOT NULL,
        order_id int NOT NULL,
        menu_item_id int NOT NULL,
        quantity int NOT NULL,
        price_at_order decimal(10,2) NOT NULL,
        createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY(id),
        FOREIGN KEY(order_id) REFERENCES orders(id),
        FOREIGN KEY(menu_item_id) REFERENCES menu_items(id)
      )`,

      `CREATE TABLE IF NOT EXISTS order_status_history (
        id int AUTO_INCREMENT NOT NULL,
        order_id int NOT NULL,
        previous_status enum('Pending','Ready','On the Way','Delivered'),
        new_status enum('Pending','Ready','On the Way','Delivered') NOT NULL,
        transition_time timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY(id)
      )`,

      `CREATE TABLE IF NOT EXISTS system_credentials (
        id int AUTO_INCREMENT NOT NULL,
        username varchar(255) NOT NULL UNIQUE,
        password_hash text NOT NULL,
        role enum('admin','kitchen') NOT NULL,
        is_active boolean DEFAULT true,
        createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY(id)
      )`,

      `CREATE TABLE IF NOT EXISTS system_sessions (
        id int AUTO_INCREMENT NOT NULL,
        credential_id int NOT NULL,
        session_token varchar(255) NOT NULL UNIQUE,
        expires_at timestamp NOT NULL,
        createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY(id),
        FOREIGN KEY(credential_id) REFERENCES system_credentials(id)
      )`,

      `CREATE TABLE IF NOT EXISTS reservations (
        id int AUTO_INCREMENT NOT NULL,
        event_type varchar(255) NOT NULL,
        number_of_people int NOT NULL,
        details text,
        event_date varchar(10) NOT NULL,
        event_time varchar(5) NOT NULL,
        status enum('pending','completed') NOT NULL DEFAULT 'pending',
        createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY(id)
      )`,

      // ALTER statements to add columns to pre-existing tables that may have been
      // created before the schema was updated (errors for duplicate columns are caught below)
      `ALTER TABLE menu_items ADD COLUMN image_url text`,
      `ALTER TABLE menu_items ADD COLUMN is_available boolean DEFAULT true`,
      `ALTER TABLE menu_items ADD COLUMN display_order int DEFAULT 0`,
      `ALTER TABLE drivers ADD COLUMN user_id int`,
      `ALTER TABLE drivers ADD COLUMN license_number varchar(50)`,
      `ALTER TABLE drivers ADD COLUMN vehicle_type varchar(100)`,
      `ALTER TABLE drivers ADD COLUMN status enum('online','offline') NOT NULL DEFAULT 'offline'`,
      `ALTER TABLE drivers ADD COLUMN current_latitude decimal(10,8)`,
      `ALTER TABLE drivers ADD COLUMN current_longitude decimal(11,8)`,
      `ALTER TABLE drivers ADD COLUMN last_location_update timestamp NULL`,
      `ALTER TABLE orders ADD COLUMN area varchar(50)`,
      `ALTER TABLE orders ADD COLUMN subtotal decimal(10,2) NOT NULL DEFAULT 0`,
      `ALTER TABLE orders ADD COLUMN tax_percentage decimal(5,2) NOT NULL DEFAULT 13`,
      `ALTER TABLE orders ADD COLUMN tax_amount decimal(10,2) NOT NULL DEFAULT 0`,
      `ALTER TABLE orders ADD COLUMN delivery_time timestamp NULL`,
      `ALTER TABLE orders ADD COLUMN has_delivery_time boolean DEFAULT false`,
      `ALTER TABLE orders ADD COLUMN picked_up_at timestamp NULL`,
      `ALTER TABLE orders ADD COLUMN delivered_at timestamp NULL`,
    ];

    // Execute each statement
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await connection.execute(statement);
        } catch (error: any) {
          // Table/column might already exist, which is fine
          if (!error.message.includes('already exists') && !error.message.includes('Duplicate column name')) {
            console.error('[Database] Error creating table:', error.message);
          }
        }
      }
    }

    // Insert default system credentials if they don't exist
    try {
      const generatePasswordHash = (password: string): string => {
        const salt = Math.random().toString(36).substring(2, 15);
        const hash = createHash('sha256').update(salt + password).digest('hex');
        return `sha256$${salt}$${hash}`;
      };
      
      // Admin credentials
      const adminHash = generatePasswordHash('Barrel_1981@');
      await connection.execute(
        'INSERT IGNORE INTO system_credentials (username, password_hash, role) VALUES (?, ?, ?)',
        ['barrel_admin', adminHash, 'admin']
      );
      
      // Kitchen credentials
      const kitchenHash = generatePasswordHash('1111');
      await connection.execute(
        'INSERT IGNORE INTO system_credentials (username, password_hash, role) VALUES (?, ?, ?)',
        ['barrel_kitchen', kitchenHash, 'kitchen']
      );
      
      console.log('[Database] System credentials initialized');
    } catch (error: any) {
      console.error('[Database] Error initializing system credentials:', error.message);
    }

    await connection.end();
    initialized = true;
    console.log('[Database] Initialization complete');
  } catch (error) {
    console.error('[Database] Initialization failed:', error);
  }
}
