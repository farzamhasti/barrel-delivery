import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { ENV } from "./env";

let initialized = false;

export async function initializeDatabase() {
  if (initialized) return;

  try {
    const connection = await mysql.createConnection(ENV.databaseUrl);
    const db = drizzle(connection);

    // Create tables if they don't exist
    const createTablesSql = `
      CREATE TABLE IF NOT EXISTS \`menu_categories\` (
        \`id\` int AUTO_INCREMENT NOT NULL,
        \`name\` varchar(255) NOT NULL,
        \`description\` text,
        \`display_order\` int DEFAULT 0,
        \`is_active\` boolean DEFAULT true,
        \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY(\`id\`)
      );

      CREATE TABLE IF NOT EXISTS \`menu_items\` (
        \`id\` int AUTO_INCREMENT NOT NULL,
        \`category_id\` int NOT NULL,
        \`name\` varchar(255) NOT NULL,
        \`description\` text,
        \`price\` decimal(10,2) NOT NULL,
        \`image_url\` text,
        \`is_available\` boolean DEFAULT true,
        \`display_order\` int DEFAULT 0,
        \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY(\`id\`),
        FOREIGN KEY(\`category_id\`) REFERENCES \`menu_categories\`(\`id\`)
      );

      -- Add new columns to drivers table if they don't exist
      ALTER TABLE \`drivers\` ADD COLUMN IF NOT EXISTS \`phone\` varchar(20);
      ALTER TABLE \`drivers\` ADD COLUMN IF NOT EXISTS \`license_number\` varchar(50);
      ALTER TABLE \`drivers\` ADD COLUMN IF NOT EXISTS \`vehicle_type\` varchar(100);

      CREATE TABLE IF NOT EXISTS \`drivers\` (
        \`id\` int AUTO_INCREMENT NOT NULL,
        \`user_id\` int,
        \`name\` varchar(255) NOT NULL,
        \`phone\` varchar(20),
        \`license_number\` varchar(50),
        \`vehicle_type\` varchar(100),
        \`is_active\` boolean DEFAULT true,
        \`current_latitude\` decimal(10,8),
        \`current_longitude\` decimal(11,8),
        \`last_location_update\` timestamp,
        \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY(\`id\`)
      );

      ALTER TABLE \`customers\` MODIFY COLUMN \`phone\` varchar(20) DEFAULT NULL;

      CREATE TABLE IF NOT EXISTS \`customers\` (
        \`id\` int AUTO_INCREMENT NOT NULL,
        \`name\` varchar(255) NOT NULL,
        \`phone\` varchar(20),
        \`address\` text NOT NULL,
        \`latitude\` decimal(10,8),
        \`longitude\` decimal(11,8),
        \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY(\`id\`)
      );

      CREATE TABLE IF NOT EXISTS \`orders\` (
        \`id\` int AUTO_INCREMENT NOT NULL,
        \`customer_id\` int NOT NULL,
        \`driver_id\` int,
        \`status\` enum('Pending','Ready','On the Way','Delivered') NOT NULL DEFAULT 'Pending',
        \`total_price\` decimal(10,2) NOT NULL,
        \`notes\` text,
        \`area\` varchar(50),
        \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY(\`id\`),
        FOREIGN KEY(\`customer_id\`) REFERENCES \`customers\`(\`id\`),
        FOREIGN KEY(\`driver_id\`) REFERENCES \`drivers\`(\`id\`)
      );

      ALTER TABLE \`orders\` ADD COLUMN IF NOT EXISTS \`area\` varchar(50);

      CREATE TABLE IF NOT EXISTS \`order_items\` (
        \`id\` int AUTO_INCREMENT NOT NULL,
        \`order_id\` int NOT NULL,
        \`menu_item_id\` int NOT NULL,
        \`quantity\` int NOT NULL,
        \`price_at_order\` decimal(10,2) NOT NULL,
        \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY(\`id\`),
        FOREIGN KEY(\`order_id\`) REFERENCES \`orders\`(\`id\`),
        FOREIGN KEY(\`menu_item_id\`) REFERENCES \`menu_items\`(\`id\`)
      );
    `;

    // Execute each CREATE TABLE statement
    const statements = createTablesSql.split(';').filter(s => s.trim());
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
