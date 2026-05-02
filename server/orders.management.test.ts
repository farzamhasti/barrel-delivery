import { describe, it, expect, beforeAll } from "vitest";
import * as db from "./db";

describe("Order Management", () => {
  let customerId: number;
  let orderId: number;
  let itemId: number;

  beforeAll(async () => {
    // Create a test customer
    const customerResult = await db.createCustomer({
      name: "Test Customer",
      phone: "555-1234",
      address: "123 Test St",
    });
    customerId = (customerResult as any)[0]?.insertId;

    // Create a test order
    const orderResult = await db.createOrder({
      customerId,
      totalPrice: 50.00 as any,
      notes: "Test order",
    });
    orderId = (orderResult as any)[0]?.insertId;

    // Create a test order item
    const itemResult = await db.createOrderItem({
      orderId,
      menuItemId: 1,
      quantity: 2,
      priceAtOrder: 25.00 as any,
    });
    itemId = (itemResult as any)[0]?.insertId;
  });

  it("should delete order item", async () => {
    const result = await db.deleteOrderItem(itemId);
    expect(result).toBeDefined();
  });

  it("should delete all order items for an order", async () => {
    // Create another item first
    await db.createOrderItem({
      orderId,
      menuItemId: 2,
      quantity: 1,
      priceAtOrder: 15.00 as any,
    });

    const result = await db.deleteAllOrderItems(orderId);
    expect(result).toBeDefined();
  });

  it("should delete entire order with cascade", async () => {
    // Create a new order with items for deletion
    const newCustomerResult = await db.createCustomer({
      name: "Delete Test Customer",
      phone: "555-5678",
      address: "456 Delete St",
    });
    const newCustomerId = (newCustomerResult as any)[0]?.insertId;

    const newOrderResult = await db.createOrder({
      customerId: newCustomerId,
      totalPrice: 75.00 as any,
      notes: "Order to delete",
    });
    const newOrderId = (newOrderResult as any)[0]?.insertId;

    // Add items to the order
    await db.createOrderItem({
      orderId: newOrderId,
      menuItemId: 1,
      quantity: 3,
      priceAtOrder: 25.00 as any,
    });

    // Delete the order
    const result = await db.deleteOrder(newOrderId);
    expect(result).toBeDefined();

    // Verify order is deleted
    const deletedOrder = await db.getOrderWithItems(newOrderId);
    expect(deletedOrder).toBeNull();
  });

  it("should update customer information", async () => {
    const result = await db.updateCustomer(customerId, {
      name: "Updated Customer",
      phone: "555-9999",
      address: "789 Updated St",
    });
    expect(result).toBeDefined();

    // Verify update
    const customer = await db.getCustomerById(customerId);
    expect(customer?.name).toBe("Updated Customer");
    expect(customer?.phone).toBe("555-9999");
  });

  it("should update order status", async () => {
    const result = await db.updateOrderStatus(orderId, "On the Way");
    expect(result).toBeDefined();

    // Verify status update
    const order = await db.getOrderWithItems(orderId);
    expect(order?.status).toBe("On the Way");
  });

  it("should update order with multiple fields", async () => {
    const result = await db.updateOrder(orderId, {
      status: "Delivered",
      notes: "Updated notes",
      totalPrice: 60.00 as any,
    });
    expect(result).toBeDefined();

    // Verify updates
    const order = await db.getOrderWithItems(orderId);
    expect(order?.status).toBe("Delivered");
    expect(order?.notes).toBe("Updated notes");
  });
});
