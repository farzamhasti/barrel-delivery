import mysql from "mysql2/promise";
import { ENV } from "./env";
import { createHash } from "crypto";

let initialized = false;

export async function initializeDatabase() {
  if (initialized) return;

  try {
    const connection = await mysql.createConnection(ENV.databaseUrl);

    // Create tables if they don't exist - using individual statements to avoid parsing issues
    const statements = [
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
      
      `CREATE TABLE IF NOT EXISTS menu_items (
        id int AUTO_INCREMENT NOT NULL,
        category_id int NOT NULL,
        name varchar(255) NOT NULL,
        description text,
        price decimal(10,2) NOT NULL,
        is_active boolean DEFAULT true,
        createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY(id),
        FOREIGN KEY(category_id) REFERENCES menu_categories(id)
      )`,
      
      `CREATE TABLE IF NOT EXISTS drivers (
        id int AUTO_INCREMENT NOT NULL,
        name varchar(255) NOT NULL,
        phone varchar(20),
        licenseNumber varchar(50),
        vehicleType varchar(50),
        isActive boolean DEFAULT true,
        status enum('online','offline') DEFAULT 'offline' NOT NULL,
        createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY(id)
      )`,
      
      `CREATE TABLE IF NOT EXISTS customers (
        id int AUTO_INCREMENT NOT NULL,
        name varchar(255) NOT NULL,
        phone varchar(20),
        address varchar(500),
        latitude decimal(10,8),
        longitude decimal(11,8),
        createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY(id)
      )`,
      
      `CREATE TABLE IF NOT EXISTS orders (
        id int AUTO_INCREMENT NOT NULL,
        customer_id int NOT NULL,
        driver_id int,
        subtotal decimal(10,2) NOT NULL,
        tax_percentage decimal(5,2) DEFAULT 13,
        tax_amount decimal(10,2) NOT NULL,
        total_price decimal(10,2) NOT NULL,
        status enum('Pending','Ready','On the Way','Delivered') NOT NULL DEFAULT 'Pending',
        notes text,
        area varchar(50),
        deliveryTime timestamp NULL,
        hasDeliveryTime boolean DEFAULT false,
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
      
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS area varchar(50)`,
      
      `ALTER TABLE drivers ADD COLUMN IF NOT EXISTS status enum('online','offline') DEFAULT 'offline' NOT NULL`,
      
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
      
      `ALTER TABLE drivers ADD COLUMN IF NOT EXISTS current_latitude decimal(10,8)`,
      `ALTER TABLE drivers ADD COLUMN IF NOT EXISTS current_longitude decimal(11,8)`,
      `ALTER TABLE drivers ADD COLUMN IF NOT EXISTS last_location_update timestamp NULL`,
      `ALTER TABLE drivers ADD COLUMN IF NOT EXISTS user_id int`,
      
      `CREATE TABLE IF NOT EXISTS system_sessions (
        id int AUTO_INCREMENT NOT NULL,
        credential_id int NOT NULL,
        session_token varchar(255) NOT NULL UNIQUE,
        expires_at timestamp NOT NULL,
        createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY(id),
        FOREIGN KEY(credential_id) REFERENCES system_credentials(id)
      )`,
    ];

    // Execute each statement
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await connection.execute(statement);
        } catch (error: any) {
          // Table might already exist, which is fine
          if (!error.message.includes('already exists')) {
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
