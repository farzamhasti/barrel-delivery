import mysql from "mysql2/promise";
import { ENV } from "./env";

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

    await connection.end();
    initialized = true;
    console.log('[Database] Initialization complete');
  } catch (error) {
    console.error('[Database] Initialization failed:', error);
  }
}
