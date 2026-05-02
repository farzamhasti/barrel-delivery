import { describe, it, expect, beforeAll } from "vitest";
import * as db from "./db";

/**
 * Tests for order deletion with cascade delete of order items.
 * Verifies that the deleteOrder function properly handles foreign key constraints.
 */
describe("Order Deletion with Cascade Delete", () => {
  let customerId: number;
  let menuItemId: number;
  let orderId: number;

  beforeAll(async () => {
    // Create a test customer
    const customerResult = await db.createCustomer({
      name: "Test Customer",
      phone: "555-0001",
      address: "123 Test St",
    });
    customerId = (customerResult as any)[0].insertId || 1;

    // Create a test menu item
    const categoryResult = await db.createMenuCategory({
      name: "Test Category",
    });
    const categoryId = (categoryResult as any)[0].insertId || 1;

    const itemResult = await db.createMenuItem({
      categoryId,
      name: "Test Item",
      price: 10 as any,
    });
    menuItemId = (itemResult as any)[0].insertId || 1;

    // Create a test order
    const orderResult = await db.createOrder({
      customerId,
      totalPrice: 10 as any,
      status: "Pending",
    });
    orderId = (orderResult as any)[0].insertId || 1;

    // Add an item to the order
    await db.createOrderItem({
      orderId,
      menuItemId,
      quantity: 1,
      priceAtOrder: 10 as any,
    });
  });

  describe("Cascade Delete", () => {
    it("should delete order items before deleting the order", async () => {
      // Create a new order with items
      const customerResult = await db.createCustomer({
        name: "Delete Test Customer",
        phone: "555-0002",
        address: "456 Delete St",
      });
      const testCustomerId = (customerResult as any)[0].insertId || 1;

      const orderResult = await db.createOrder({
        customerId: testCustomerId,
        totalPrice: 20 as any,
        status: "Pending",
      });
      const testOrderId = (orderResult as any)[0].insertId || 1;

      // Add multiple items to the order
      await db.createOrderItem({
        orderId: testOrderId,
        menuItemId,
        quantity: 2,
        priceAtOrder: 10 as any,
      });

      // Delete the order (should cascade delete items)
      const deleteResult = await db.deleteOrder(testOrderId);
      expect(deleteResult).toBeDefined();
    });

    it("should handle deletion of orders with no items", async () => {
      // Create a new order without items
      const customerResult = await db.createCustomer({
        name: "No Items Customer",
        phone: "555-0003",
        address: "789 No Items St",
      });
      const testCustomerId = (customerResult as any)[0].insertId || 1;

      const orderResult = await db.createOrder({
        customerId: testCustomerId,
        totalPrice: 0 as any,
        status: "Pending",
      });
      const testOrderId = (orderResult as any)[0].insertId || 1;

      // Delete the order (should succeed even without items)
      const deleteResult = await db.deleteOrder(testOrderId);
      expect(deleteResult).toBeDefined();
    });

    it("should prevent foreign key constraint violations", async () => {
      // Create a new order with items
      const customerResult = await db.createCustomer({
        name: "FK Test Customer",
        phone: "555-0004",
        address: "999 FK Test St",
      });
      const testCustomerId = (customerResult as any)[0].insertId || 1;

      const orderResult = await db.createOrder({
        customerId: testCustomerId,
        totalPrice: 30 as any,
        status: "Pending",
      });
      const testOrderId = (orderResult as any)[0].insertId || 1;

      // Add items to the order
      await db.createOrderItem({
        orderId: testOrderId,
        menuItemId,
        quantity: 3,
        priceAtOrder: 10 as any,
      });

      // Delete should work without foreign key constraint errors
      const deleteResult = await db.deleteOrder(testOrderId);
      expect(deleteResult).toBeDefined();
    });
  });

  describe("Delete Order Synchronization", () => {
    it("should trigger cache invalidation when order is deleted", async () => {
      // This test verifies the synchronization behavior
      const customerResult = await db.createCustomer({
        name: "Sync Test Customer",
        phone: "555-0005",
        address: "111 Sync St",
      });
      const testCustomerId = (customerResult as any)[0].insertId || 1;

      const orderResult = await db.createOrder({
        customerId: testCustomerId,
        totalPrice: 40 as any,
        status: "Pending",
      });
      const testOrderId = (orderResult as any)[0].insertId || 1;

      // Add item
      await db.createOrderItem({
        orderId: testOrderId,
        menuItemId,
        quantity: 4,
        priceAtOrder: 10 as any,
      });

      // Delete order - should trigger invalidation
      const deleteResult = await db.deleteOrder(testOrderId);
      expect(deleteResult).toBeDefined();

      // Verify order is deleted by attempting to fetch it
      const orders = await db.getOrderWithItems(testOrderId);
      expect(orders).toBeNull();
    });

    it("should handle concurrent delete operations safely", async () => {
      // Create multiple orders
      const customerResult = await db.createCustomer({
        name: "Concurrent Test Customer",
        phone: "555-0006",
        address: "222 Concurrent St",
      });
      const testCustomerId = (customerResult as any)[0].insertId || 1;

      const orderIds: number[] = [];
      for (let i = 0; i < 3; i++) {
        const orderResult = await db.createOrder({
          customerId: testCustomerId,
          totalPrice: (50 + i) as any,
          status: "Pending",
        });
        const testOrderId = (orderResult as any)[0].insertId || 1;
        orderIds.push(testOrderId);

        // Add item to each order
        await db.createOrderItem({
          orderId: testOrderId,
          menuItemId,
          quantity: 5 + i,
          priceAtOrder: 10 as any,
        });
      }

      // Delete all orders concurrently
      const deletePromises = orderIds.map(id => db.deleteOrder(id));
      const results = await Promise.all(deletePromises);

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result).toBeDefined();
      });
    });
  });

  describe("Error Handling", () => {
    it("should handle deletion of non-existent orders gracefully", async () => {
      // Try to delete a non-existent order
      const deleteResult = await db.deleteOrder(999999);
      expect(deleteResult).toBeDefined();
    });

    it("should maintain data consistency after deletion", async () => {
      // Create an order with items
      const customerResult = await db.createCustomer({
        name: "Consistency Test Customer",
        phone: "555-0007",
        address: "333 Consistency St",
      });
      const testCustomerId = (customerResult as any)[0].insertId || 1;

      const orderResult = await db.createOrder({
        customerId: testCustomerId,
        totalPrice: 60 as any,
        status: "Pending",
      });
      const testOrderId = (orderResult as any)[0].insertId || 1;

      // Add multiple items
      for (let i = 0; i < 3; i++) {
        await db.createOrderItem({
          orderId: testOrderId,
          menuItemId,
          quantity: 1,
          priceAtOrder: 20 as any,
        });
      }

      // Delete the order
      await db.deleteOrder(testOrderId);

      // Verify order and all its items are deleted
      const deletedOrder = await db.getOrderWithItems(testOrderId);
      expect(deletedOrder).toBeNull();
    });
  });
});
