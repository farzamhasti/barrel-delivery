#!/usr/bin/env node

/**
 * Test Data Insertion Script - Version 2
 * 
 * This script inserts sample orders with different dates to test the date filtering feature.
 * It automatically fetches available menu items and uses them for test orders.
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL environment variable not set');
  process.exit(1);
}

// Parse DATABASE_URL
const url = new URL(DATABASE_URL);
const config = {
  host: url.hostname,
  user: url.username,
  password: url.password,
  database: url.pathname.slice(1),
  port: parseInt(url.port || '3306'),
  ssl: { rejectUnauthorized: false },
};

async function insertTestOrders() {
  let connection;
  
  try {
    connection = await mysql.createConnection(config);
    console.log('✓ Connected to database');

    // Fetch available menu items
    const [menuItems] = await connection.query('SELECT id, name, price FROM menu_items LIMIT 5');
    
    if (menuItems.length === 0) {
      console.error('ERROR: No menu items found in database. Please create menu items first.');
      process.exit(1);
    }

    console.log(`✓ Found ${menuItems.length} menu items`);
    menuItems.forEach((item, idx) => {
      console.log(`  ${idx + 1}. ${item.name} (ID: ${item.id}, Price: $${item.price})`);
    });

    // Sample order data with different dates
    const testOrders = [
      // April 10, 2026 (3 days ago)
      {
        customerName: 'John Smith',
        customerPhone: '5551234567',
        customerAddress: '123 Main St',
        status: 'Delivered',
        notes: 'Test order from April 10',
        items: [
          { menuItemId: menuItems[0].id, quantity: 2, priceAtOrder: parseFloat(menuItems[0].price) },
          { menuItemId: menuItems[1].id, quantity: 1, priceAtOrder: parseFloat(menuItems[1].price) },
        ],
        createdAt: new Date('2026-04-10T10:30:00Z'),
      },
      {
        customerName: 'Jane Doe',
        customerPhone: '5559876543',
        customerAddress: '456 Oak Ave',
        status: 'Delivered',
        notes: 'Test order from April 10',
        items: [
          { menuItemId: menuItems[2].id, quantity: 1, priceAtOrder: parseFloat(menuItems[2].price) },
        ],
        createdAt: new Date('2026-04-10T14:15:00Z'),
      },
      
      // April 11, 2026 (2 days ago)
      {
        customerName: 'Bob Johnson',
        customerPhone: '5552468135',
        customerAddress: '789 Pine Rd',
        status: 'Delivered',
        notes: 'Test order from April 11',
        items: [
          { menuItemId: menuItems[0].id, quantity: 1, priceAtOrder: parseFloat(menuItems[0].price) },
          { menuItemId: menuItems[1].id, quantity: 2, priceAtOrder: parseFloat(menuItems[1].price) },
          { menuItemId: menuItems[3].id, quantity: 1, priceAtOrder: parseFloat(menuItems[3].price) },
        ],
        createdAt: new Date('2026-04-11T11:45:00Z'),
      },
      {
        customerName: 'Alice Williams',
        customerPhone: '5553692581',
        customerAddress: '321 Elm St',
        status: 'Delivered',
        notes: 'Test order from April 11',
        items: [
          { menuItemId: menuItems[1].id, quantity: 3, priceAtOrder: parseFloat(menuItems[1].price) },
        ],
        createdAt: new Date('2026-04-11T15:20:00Z'),
      },
      {
        customerName: 'Charlie Brown',
        customerPhone: '5554567890',
        customerAddress: '654 Maple Dr',
        status: 'Delivered',
        notes: 'Test order from April 11',
        items: [
          { menuItemId: menuItems[0].id, quantity: 1, priceAtOrder: parseFloat(menuItems[0].price) },
          { menuItemId: menuItems[2].id, quantity: 1, priceAtOrder: parseFloat(menuItems[2].price) },
        ],
        createdAt: new Date('2026-04-11T18:00:00Z'),
      },
      
      // April 12, 2026 (yesterday)
      {
        customerName: 'Diana Prince',
        customerPhone: '5555551234',
        customerAddress: '987 Cedar Ln',
        status: 'On the Way',
        notes: 'Test order from April 12',
        items: [
          { menuItemId: menuItems[3].id, quantity: 1, priceAtOrder: parseFloat(menuItems[3].price) },
          { menuItemId: menuItems[0].id, quantity: 1, priceAtOrder: parseFloat(menuItems[0].price) },
        ],
        createdAt: new Date('2026-04-12T09:30:00Z'),
      },
      {
        customerName: 'Edward Norton',
        customerPhone: '5556667777',
        customerAddress: '147 Birch Ave',
        status: 'On the Way',
        notes: 'Test order from April 12',
        items: [
          { menuItemId: menuItems[1].id, quantity: 2, priceAtOrder: parseFloat(menuItems[1].price) },
          { menuItemId: menuItems[4].id, quantity: 1, priceAtOrder: parseFloat(menuItems[4].price) },
        ],
        createdAt: new Date('2026-04-12T13:45:00Z'),
      },
      
      // April 14, 2026 (tomorrow)
      {
        customerName: 'Frank Miller',
        customerPhone: '5557778888',
        customerAddress: '258 Spruce Ct',
        status: 'Pending',
        notes: 'Test order from April 14',
        items: [
          { menuItemId: menuItems[0].id, quantity: 2, priceAtOrder: parseFloat(menuItems[0].price) },
          { menuItemId: menuItems[1].id, quantity: 1, priceAtOrder: parseFloat(menuItems[1].price) },
        ],
        createdAt: new Date('2026-04-14T08:00:00Z'),
      },
      {
        customerName: 'Grace Lee',
        customerPhone: '5558889999',
        customerAddress: '369 Willow Way',
        status: 'Pending',
        notes: 'Test order from April 14',
        items: [
          { menuItemId: menuItems[2].id, quantity: 1, priceAtOrder: parseFloat(menuItems[2].price) },
          { menuItemId: menuItems[3].id, quantity: 1, priceAtOrder: parseFloat(menuItems[3].price) },
        ],
        createdAt: new Date('2026-04-14T12:30:00Z'),
      },
    ];

    let ordersCreated = 0;
    let itemsCreated = 0;

    for (const orderData of testOrders) {
      // Create customer
      const customerResult = await connection.query(
        'INSERT INTO customers (name, phone, address) VALUES (?, ?, ?)',
        [orderData.customerName, orderData.customerPhone, orderData.customerAddress]
      );
      const customerId = customerResult[0].insertId;

      if (!customerId) {
        console.error(`ERROR: Failed to create customer ${orderData.customerName}`);
        continue;
      }

      // Calculate total price
      let totalPrice = 0;
      for (const item of orderData.items) {
        totalPrice += item.quantity * item.priceAtOrder;
      }

      // Create order with specific createdAt date
      const orderResult = await connection.query(
        'INSERT INTO orders (customer_id, status, notes, total_price, createdAt) VALUES (?, ?, ?, ?, ?)',
        [customerId, orderData.status, orderData.notes, totalPrice, orderData.createdAt]
      );
      const orderId = orderResult[0].insertId;
      ordersCreated++;

      // Create order items
      for (const item of orderData.items) {
        await connection.query(
          'INSERT INTO order_items (order_id, menu_item_id, quantity, price_at_order) VALUES (?, ?, ?, ?)',
          [orderId, item.menuItemId, item.quantity, item.priceAtOrder]
        );
        itemsCreated++;
      }

      const dateStr = orderData.createdAt.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
      console.log(`✓ Created Order #${orderId} for ${orderData.customerName} on ${dateStr}`);
    }

    console.log(`\n✓ Successfully inserted ${ordersCreated} test orders with ${itemsCreated} items`);
    console.log('\nTest data summary:');
    console.log('  - April 10, 2026: 2 orders (Delivered)');
    console.log('  - April 11, 2026: 3 orders (Delivered)');
    console.log('  - April 12, 2026: 2 orders (On the Way)');
    console.log('  - April 13, 2026: 3 existing orders (Pending)');
    console.log('  - April 14, 2026: 2 orders (Pending)');
    console.log('\nYou can now test the date filtering in the Orders tab!');
    console.log('\nTesting instructions:');
    console.log('  1. Go to Orders tab');
    console.log('  2. Change the date picker to different dates');
    console.log('  3. Verify that only orders from the selected date are displayed');

  } catch (error) {
    console.error('ERROR:', error.message);
    if (error.code) {
      console.error('Error code:', error.code);
    }
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

insertTestOrders();
