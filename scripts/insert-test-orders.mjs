#!/usr/bin/env node

/**
 * Test Data Insertion Script
 * 
 * This script inserts sample orders with different dates to test the date filtering feature.
 * 
 * Usage:
 *   node scripts/insert-test-orders.mjs
 * 
 * This will create:
 * - 2 orders for April 10, 2026
 * - 3 orders for April 11, 2026  
 * - 2 orders for April 12, 2026
 * - 3 orders for April 13, 2026 (today)
 * - 2 orders for April 14, 2026 (future)
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
// Format: mysql://user:password@host:port/database
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

    // Sample order data with different dates
    const testOrders = [
      // April 10, 2026 (3 days ago)
      {
        customerName: 'John Smith',
        customerPhone: '5551234567',
        customerAddress: '123 Main St',
        status: 'Delivered',
        notes: 'Test order from April 10',
        total: 45.00,
        createdAt: new Date('2026-04-10T10:30:00Z'),
        items: [
          { menuItemId: 1, quantity: 2, priceAtOrder: 20.00 },
          { menuItemId: 2, quantity: 1, priceAtOrder: 5.00 },
        ]
      },
      {
        customerName: 'Jane Doe',
        customerPhone: '5559876543',
        customerAddress: '456 Oak Ave',
        status: 'Delivered',
        notes: 'Test order from April 10',
        total: 32.50,
        createdAt: new Date('2026-04-10T14:15:00Z'),
        items: [
          { menuItemId: 3, quantity: 1, priceAtOrder: 32.50 },
        ]
      },
      
      // April 11, 2026 (2 days ago)
      {
        customerName: 'Bob Johnson',
        customerPhone: '5552468135',
        customerAddress: '789 Pine Rd',
        status: 'Delivered',
        notes: 'Test order from April 11',
        total: 58.75,
        createdAt: new Date('2026-04-11T11:45:00Z'),
        items: [
          { menuItemId: 1, quantity: 1, priceAtOrder: 20.00 },
          { menuItemId: 2, quantity: 2, priceAtOrder: 5.00 },
          { menuItemId: 3, quantity: 1, priceAtOrder: 28.75 },
        ]
      },
      {
        customerName: 'Alice Williams',
        customerPhone: '5553692581',
        customerAddress: '321 Elm St',
        status: 'Delivered',
        notes: 'Test order from April 11',
        total: 40.00,
        createdAt: new Date('2026-04-11T15:20:00Z'),
        items: [
          { menuItemId: 2, quantity: 8, priceAtOrder: 5.00 },
        ]
      },
      {
        customerName: 'Charlie Brown',
        customerPhone: '5554567890',
        customerAddress: '654 Maple Dr',
        status: 'Delivered',
        notes: 'Test order from April 11',
        total: 25.50,
        createdAt: new Date('2026-04-11T18:00:00Z'),
        items: [
          { menuItemId: 1, quantity: 1, priceAtOrder: 20.00 },
          { menuItemId: 2, quantity: 1, priceAtOrder: 5.50 },
        ]
      },
      
      // April 12, 2026 (yesterday)
      {
        customerName: 'Diana Prince',
        customerPhone: '5555551234',
        customerAddress: '987 Cedar Ln',
        status: 'On the Way',
        notes: 'Test order from April 12',
        total: 55.00,
        createdAt: new Date('2026-04-12T09:30:00Z'),
        items: [
          { menuItemId: 3, quantity: 1, priceAtOrder: 32.50 },
          { menuItemId: 1, quantity: 1, priceAtOrder: 20.00 },
          { menuItemId: 2, quantity: 1, priceAtOrder: 2.50 },
        ]
      },
      {
        customerName: 'Edward Norton',
        customerPhone: '5556667777',
        customerAddress: '147 Birch Ave',
        status: 'On the Way',
        notes: 'Test order from April 12',
        total: 38.00,
        createdAt: new Date('2026-04-12T13:45:00Z'),
        items: [
          { menuItemId: 2, quantity: 7, priceAtOrder: 5.00 },
          { menuItemId: 1, quantity: 0, priceAtOrder: 3.00 },
        ]
      },
      
      // April 14, 2026 (tomorrow)
      {
        customerName: 'Frank Miller',
        customerPhone: '5557778888',
        customerAddress: '258 Spruce Ct',
        status: 'Pending',
        notes: 'Test order from April 14',
        total: 42.00,
        createdAt: new Date('2026-04-14T08:00:00Z'),
        items: [
          { menuItemId: 1, quantity: 2, priceAtOrder: 20.00 },
          { menuItemId: 2, quantity: 1, priceAtOrder: 2.00 },
        ]
      },
      {
        customerName: 'Grace Lee',
        customerPhone: '5558889999',
        customerAddress: '369 Willow Way',
        status: 'Pending',
        notes: 'Test order from April 14',
        total: 50.50,
        createdAt: new Date('2026-04-14T12:30:00Z'),
        items: [
          { menuItemId: 3, quantity: 1, priceAtOrder: 32.50 },
          { menuItemId: 2, quantity: 3, priceAtOrder: 6.00 },
        ]
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
        console.error('ERROR: Failed to create customer');
        continue;
      }

      // Create order with specific createdAt date
      const orderResult = await connection.query(
        'INSERT INTO orders (customer_id, status, notes, total_price, createdAt) VALUES (?, ?, ?, ?, ?)',
        [customerId, orderData.status, orderData.notes, orderData.total, orderData.createdAt]
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

      console.log(`✓ Created Order #${orderId} for ${orderData.customerName} on ${orderData.createdAt.toLocaleDateString()}`);
    }

    console.log(`\n✓ Successfully inserted ${ordersCreated} test orders with ${itemsCreated} items`);
    console.log('\nTest data summary:');
    console.log('  - April 10, 2026: 2 orders (Delivered)');
    console.log('  - April 11, 2026: 3 orders (Delivered)');
    console.log('  - April 12, 2026: 2 orders (On the Way)');
    console.log('  - April 13, 2026: 3 existing orders (Pending)');
    console.log('  - April 14, 2026: 2 orders (Pending)');
    console.log('\nYou can now test the date filtering in the Orders tab!');

  } catch (error) {
    console.error('ERROR:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

insertTestOrders();
