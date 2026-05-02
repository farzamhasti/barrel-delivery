import mysql from "mysql2/promise";
import { ENV } from "./env";

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
        openId varchar(255) NOT NULL,
        name varchar(255),
        email varchar(255),
        loginMethod varchar(50),
        role enum('admin','user') NOT NULL DEFAULT 'user',
        createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        lastSignedIn timestamp,
        PRIMARY KEY(id),
        UNIQUE KEY(openId)
      )`,

      // drivers table
      `CREATE TABLE IF NOT EXISTS drivers (
        id int AUTO_INCREMENT NOT NULL,
        name varchar(255) NOT NULL,
        phone varchar(20),
        license_number varchar(50) UNIQUE,
        status varchar(20) NOT NULL DEFAULT 'offline',
        is_active boolean DEFAULT true,
        createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY(id)
      )`,

      // orders table - simplified for scanned receipts
      `CREATE TABLE IF NOT EXISTS orders (
        id int AUTO_INCREMENT NOT NULL,
        order_number varchar(50) NOT NULL,
        customer_name varchar(100),
        customer_address text,
        customer_phone varchar(20),
        area varchar(50),
        delivery_time varchar(100),
        receipt_image longtext,
        formatted_receipt_image longtext,
        receipt_text longtext,
        subtotal decimal(10,2) DEFAULT 0,
        tax_amount decimal(10,2) DEFAULT 0,
        total_price decimal(10,2) DEFAULT 0,
        status varchar(50) DEFAULT 'Pending',
        driver_id int,
        picked_up_at timestamp NULL,
        delivered_at timestamp NULL,
        createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY(id),
        FOREIGN KEY(driver_id) REFERENCES drivers(id)
      )`,

      // order_items table
      `CREATE TABLE IF NOT EXISTS order_items (
        id int AUTO_INCREMENT NOT NULL,
        order_id int NOT NULL,
        menu_item_id int,
        item_name varchar(255),
        quantity int NOT NULL,
        price_at_order decimal(10,2) NOT NULL,
        createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY(id),
        FOREIGN KEY(order_id) REFERENCES orders(id)
      )`,

      // order_status_history table
      `CREATE TABLE IF NOT EXISTS order_status_history (
        id int AUTO_INCREMENT NOT NULL,
        order_id int NOT NULL,
        status enum('Pending','Ready','On the Way','Delivered') NOT NULL,
        createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY(id)
      )`,

      // return_time_history table
      `CREATE TABLE IF NOT EXISTS return_time_history (
        id int AUTO_INCREMENT NOT NULL,
        driver_id int NOT NULL,
        estimated_return_time timestamp,
        createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY(id)
      )`,

      // reservations table
      `CREATE TABLE IF NOT EXISTS reservations (
        id int AUTO_INCREMENT NOT NULL,
        customer_name varchar(255) NOT NULL,
        customer_phone varchar(20) NOT NULL,
        customer_email varchar(255),
        reservation_date timestamp NOT NULL,
        party_size int NOT NULL,
        special_requests text,
        status enum('Pending','Confirmed','Cancelled') DEFAULT 'Pending' NOT NULL,
        createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY(id)
      )`,

      // system_credentials table
      `CREATE TABLE IF NOT EXISTS system_credentials (
        id int AUTO_INCREMENT NOT NULL,
        username varchar(255) NOT NULL UNIQUE,
        password_hash varchar(255) NOT NULL,
        role varchar(50) NOT NULL,
        createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY(id)
      )`,

      // system_sessions table
      `CREATE TABLE IF NOT EXISTS system_sessions (
        id int AUTO_INCREMENT NOT NULL,
        credential_id int NOT NULL,
        session_token varchar(255) NOT NULL UNIQUE,
        expires_at timestamp NOT NULL,
        createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY(id)
      )`,
    ];

    for (const statement of statements) {
      try {
        await connection.execute(statement);
      } catch (error: any) {
        if (!error.message.includes("already exists")) {
          console.error("Error executing statement:", statement, error);
          throw error;
        }
      }
    }

    await connection.end();
    initialized = true;
    console.log("[Database] Initialization complete");
  } catch (error) {
    console.error("[Database] Initialization failed:", error);
    throw error;
  }
}
