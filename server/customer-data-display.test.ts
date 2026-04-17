import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getDb } from './db';
import * as db from './db';
import { customers, orders, orderItems, menuItems, menuCategories } from '../drizzle/schema';

describe('Customer Data Display Fix', () => {
  let dbInstance: any;
  let customerId: number;
  let orderId: number;
  let menuItemId: number;

  beforeAll(async () => {
    dbInstance = await getDb();
    if (!dbInstance) {
      throw new Error('Database not available');
    }
  });

  it('should retrieve order with customer information', async () => {
    // Create a test customer
    const customerResult = await dbInstance
      .insert(customers)
      .values({
        name: 'John Doe',
        phone: '555-1234',
        address: '123 Main St',
      });

    customerId = customerResult[0].insertId;

    // Create a test order
    const orderResult = await dbInstance
      .insert(orders)
      .values({
        customerId,
        status: 'Pending',
        totalPrice: '50.00',
        notes: 'Test order',
        area: 'Downtown',
      });

    orderId = orderResult[0].insertId;

    // Retrieve the order with customer data
    const orderWithCustomer = await db.getOrderWithItems(orderId);

    expect(orderWithCustomer).toBeDefined();
    expect(orderWithCustomer?.customerName).toBe('John Doe');
    expect(orderWithCustomer?.customerPhone).toBe('555-1234');
    expect(orderWithCustomer?.customerAddress).toBe('123 Main St');
    expect(orderWithCustomer?.area).toBe('Downtown');
    expect(orderWithCustomer?.notes).toBe('Test order');
  });

  it('should retrieve today orders with customer information', async () => {
    const todayOrders = await db.getTodayOrdersWithItems();

    expect(Array.isArray(todayOrders)).toBe(true);

    if (todayOrders.length > 0) {
      const order = todayOrders[0];
      expect(order).toHaveProperty('customerName');
      expect(order).toHaveProperty('customerPhone');
      expect(order).toHaveProperty('customerAddress');
      expect(order).toHaveProperty('area');
      expect(order).toHaveProperty('notes');
      expect(order).toHaveProperty('items');
      expect(Array.isArray(order.items)).toBe(true);
    }
  });

  it('should retrieve orders by date range with customer information', async () => {
    const today = new Date();
    const startOfDay = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 0, 0, 0, 0));
    const endOfDay = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + 1, 0, 0, 0, 0));

    const ordersInRange = await db.getOrdersByDateRange(startOfDay, endOfDay);

    expect(Array.isArray(ordersInRange)).toBe(true);

    if (ordersInRange.length > 0) {
      const order = ordersInRange[0];
      expect(order).toHaveProperty('customerName');
      expect(order).toHaveProperty('customerPhone');
      expect(order).toHaveProperty('customerAddress');
      expect(order).toHaveProperty('area');
      expect(order).toHaveProperty('notes');
    }
  });

  it('should display area field in order data', async () => {
    const orderWithCustomer = await db.getOrderWithItems(orderId);

    expect(orderWithCustomer?.area).toBeDefined();
    expect(['Downtown', 'CP', 'B']).toContain(orderWithCustomer?.area);
  });

  it('should display customer address in order data', async () => {
    const orderWithCustomer = await db.getOrderWithItems(orderId);

    expect(orderWithCustomer?.customerAddress).toBeDefined();
    expect(orderWithCustomer?.customerAddress).toBe('123 Main St');
  });

  it('should display customer phone in order data', async () => {
    const orderWithCustomer = await db.getOrderWithItems(orderId);

    expect(orderWithCustomer?.customerPhone).toBeDefined();
    expect(orderWithCustomer?.customerPhone).toBe('555-1234');
  });

  it('should display customer name in order data', async () => {
    const orderWithCustomer = await db.getOrderWithItems(orderId);

    expect(orderWithCustomer?.customerName).toBeDefined();
    expect(orderWithCustomer?.customerName).toBe('John Doe');
  });

  it('should maintain consistency across all dashboard queries', async () => {
    // Get order with items
    const orderWithItems = await db.getOrderWithItems(orderId);

    // Get today orders
    const todayOrders = await db.getTodayOrdersWithItems();
    const todayOrder = todayOrders.find(o => o.id === orderId);

    // Get orders by date range
    const today = new Date();
    const startOfDay = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 0, 0, 0, 0));
    const endOfDay = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + 1, 0, 0, 0, 0));
    const ordersInRange = await db.getOrdersByDateRange(startOfDay, endOfDay);
    const rangeOrder = ordersInRange.find(o => o.id === orderId);

    // Verify consistency
    expect(orderWithItems?.customerName).toBe(todayOrder?.customerName);
    expect(orderWithItems?.customerName).toBe(rangeOrder?.customerName);
    expect(orderWithItems?.customerPhone).toBe(todayOrder?.customerPhone);
    expect(orderWithItems?.customerPhone).toBe(rangeOrder?.customerPhone);
    expect(orderWithItems?.customerAddress).toBe(todayOrder?.customerAddress);
    expect(orderWithItems?.customerAddress).toBe(rangeOrder?.customerAddress);
    expect(orderWithItems?.area).toBe(todayOrder?.area);
    expect(orderWithItems?.area).toBe(rangeOrder?.area);
  });

  afterAll(async () => {
    // Cleanup test data
    if (dbInstance && orderId) {
      await dbInstance.delete(orderItems).where(orderItems.orderId === orderId);
      await dbInstance.delete(orders).where(orders.id === orderId);
    }
    if (dbInstance && customerId) {
      await dbInstance.delete(customers).where(customers.id === customerId);
    }
  });
});
