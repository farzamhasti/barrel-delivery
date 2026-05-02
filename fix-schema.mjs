import { getDb } from './server/db.ts';

async function fixSchema() {
  const db = await getDb();
  if (!db) {
    console.error('Failed to connect to database');
    process.exit(1);
  }

  try {
    console.log('Dropping dependent tables...');
    await db.execute('DROP TABLE IF EXISTS order_items');
    await db.execute('DROP TABLE IF EXISTS order_status_history');
    await db.execute('DROP TABLE IF EXISTS return_time_history');
    
    console.log('Dropping orders table...');
    await db.execute('DROP TABLE IF EXISTS orders');
    
    console.log('Creating orders table with correct schema...');
    await db.execute(`
      CREATE TABLE orders (
        id int AUTO_INCREMENT NOT NULL,
        order_number varchar(50) NOT NULL UNIQUE,
        customer_address text,
        customer_phone varchar(20),
        area enum('DN','CP','B'),
        delivery_time timestamp NULL,
        has_delivery_time boolean DEFAULT false,
        receipt_text text,
        receipt_image text,
        subtotal decimal(10,2) NOT NULL DEFAULT 0,
        tax_percentage decimal(5,2) DEFAULT 13 NOT NULL,
        tax_amount decimal(10,2) DEFAULT 0 NOT NULL,
        total_price decimal(10,2) NOT NULL,
        status enum('Pending','Ready','On the Way','Delivered') DEFAULT 'Pending' NOT NULL,
        driver_id int,
        picked_up_at timestamp NULL,
        delivered_at timestamp NULL,
        createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY(id),
        FOREIGN KEY(driver_id) REFERENCES drivers(id)
      )
    `);
    
    console.log('Creating order_items table...');
    await db.execute(`
      CREATE TABLE order_items (
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
      )
    `);
    
    console.log('Creating order_status_history table...');
    await db.execute(`
      CREATE TABLE order_status_history (
        id int AUTO_INCREMENT NOT NULL,
        order_id int NOT NULL,
        status enum('Pending','Ready','On the Way','Delivered') NOT NULL,
        createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY(id),
        FOREIGN KEY(order_id) REFERENCES orders(id)
      )
    `);
    
    console.log('Creating return_time_history table...');
    await db.execute(`
      CREATE TABLE return_time_history (
        id int AUTO_INCREMENT NOT NULL,
        driver_id int NOT NULL,
        estimated_return_time timestamp,
        createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY(id),
        FOREIGN KEY(driver_id) REFERENCES drivers(id)
      )
    `);
    
    console.log('✓ Schema fixed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('✗ Error:', error.message);
    process.exit(1);
  }
}

fixSchema();
