import { describe, it, expect, beforeAll } from "vitest";
import { 
  createMenuCategory,
  createMenuItem,
  createCustomer,
  createOrder,
  createOrderItem,
  updateOrder,
  updateOrderItem,
  deleteOrderItem,
  getOrderById,
  getOrderWithItems,
  updateCustomer,
  getCustomerById,
} from "./db";
import { initializeDatabase } from "./_core/initDb";

describe("Order Editing", () => {
  let categoryId: number;
  let menuItemId: number;
  let customerId: number;
  let orderId: number;
  let orderItemId: number;

  beforeAll(async () => {
    // Initialize database
    await initializeDatabase();

    // Create menu category and item
    const categoryResult = await createMenuCategory({
      name: "Test Category",
      description: "For editing tests",
    });
    categoryId = Array.isArray(categoryResult) 
      ? (categoryResult as any)[0]?.insertId 
      : (categoryResult as any).insertId;

    const itemResult = await createMenuItem({
      categoryId,
      name: "Test Item",
      description: "Test item for editing",
      price: 19.99 as any,
    });
    menuItemId = Array.isArray(itemResult) 
      ? (itemResult as any)[0]?.insertId 
      : (itemResult as any).insertId;

    // Create customer
    const customerResult = await createCustomer({
      name: "Original Name",
      phone: "+1 (555) 111-1111",
      address: "Original Address",
    });
    customerId = (customerResult as any)?.id || (Array.isArray(customerResult) 
      ? (customerResult as any)[0]?.insertId 
      : (customerResult as any).insertId);

    // Create order
    const orderResult = await createOrder({
      customerId,
      totalPrice: 19.99 as any,
    });
    orderId = Array.isArray(orderResult) 
      ? (orderResult as any)[0]?.insertId 
      : (orderResult as any).insertId;

    // Create order item
    const itemResult2 = await createOrderItem({
      orderId,
      menuItemId,
      quantity: 1,
      priceAtOrder: 19.99 as any,
    });
    orderItemId = Array.isArray(itemResult2) 
      ? (itemResult2 as any)[0]?.insertId 
      : (itemResult2 as any).insertId;
  });

  it("should update order status", async () => {
    const result = await updateOrder(orderId, { status: "On the Way" });
    expect(result).toBeDefined();

    const updated = await getOrderById(orderId);
    expect(updated?.status).toBe("On the Way");
  });

  it("should update order notes", async () => {
    const notes = "Special delivery instructions";
    const result = await updateOrder(orderId, { notes });
    expect(result).toBeDefined();

    const updated = await getOrderById(orderId);
    expect(updated?.notes).toBe(notes);
  });

  it("should update order total price", async () => {
    const newPrice = 49.99;
    const result = await updateOrder(orderId, { totalPrice: newPrice as any });
    expect(result).toBeDefined();

    const updated = await getOrderById(orderId);
    expect(parseFloat(updated?.totalPrice as any)).toBe(newPrice);
  });

  it("should update order item quantity", async () => {
    const newQuantity = 3;
    const result = await updateOrderItem(orderItemId, { quantity: newQuantity });
    expect(result).toBeDefined();

    const order = await getOrderWithItems(orderId);
    const item = order?.items?.find((i: any) => i.id === orderItemId);
    expect(item?.quantity).toBe(newQuantity);
  });

  it("should update order item price", async () => {
    const newPrice = 24.99;
    const result = await updateOrderItem(orderItemId, { priceAtOrder: newPrice as any });
    expect(result).toBeDefined();

    const order = await getOrderWithItems(orderId);
    const item = order?.items?.find((i: any) => i.id === orderItemId);
    expect(parseFloat(item?.priceAtOrder as any)).toBe(newPrice);
  });

  it("should delete order item", async () => {
    // Create another item to delete
    const itemResult = await createOrderItem({
      orderId,
      menuItemId,
      quantity: 2,
      priceAtOrder: 19.99 as any,
    });
    const deleteItemId = Array.isArray(itemResult) 
      ? (itemResult as any)[0]?.insertId 
      : (itemResult as any).insertId;

    // Verify item exists
    let order = await getOrderWithItems(orderId);
    const itemBefore = order?.items?.find((i: any) => i.id === deleteItemId);
    expect(itemBefore).toBeDefined();

    // Delete item
    const result = await deleteOrderItem(deleteItemId);
    expect(result).toBeDefined();

    // Verify item is deleted
    order = await getOrderWithItems(orderId);
    const itemAfter = order?.items?.find((i: any) => i.id === deleteItemId);
    expect(itemAfter).toBeUndefined();
  });

  it("should update customer information", async () => {
    const newName = "Updated Name";
    const newPhone = "+1 (555) 222-2222";
    const newAddress = "Updated Address";

    const result = await updateCustomer(customerId, {
      name: newName,
      phone: newPhone,
      address: newAddress,
    });
    expect(result).toBeDefined();

    const updated = await getCustomerById(customerId);
    expect(updated?.name).toBe(newName);
    expect(updated?.phone).toBe(newPhone);
    expect(updated?.address).toBe(newAddress);
  });

  it("should get order with all items", async () => {
    const order = await getOrderWithItems(orderId);
    expect(order).toBeDefined();
    expect(order?.id).toBe(orderId);
    expect(order?.customerId).toBe(customerId);
    expect(Array.isArray(order?.items)).toBe(true);
    expect(order?.items?.length).toBeGreaterThan(0);
  });

  it("should handle multiple edits to the same order", async () => {
    // First edit: change status
    await updateOrder(orderId, { status: "Delivered" });
    let updated = await getOrderById(orderId);
    expect(updated?.status).toBe("Delivered");

    // Second edit: change notes
    const newNotes = "Updated notes";
    await updateOrder(orderId, { notes: newNotes });
    updated = await getOrderById(orderId);
    expect(updated?.notes).toBe(newNotes);
    expect(updated?.status).toBe("Delivered"); // Previous edit should persist

    // Third edit: change price
    const newPrice = 99.99;
    await updateOrder(orderId, { totalPrice: newPrice as any });
    updated = await getOrderById(orderId);
    expect(parseFloat(updated?.totalPrice as any)).toBe(newPrice);
    expect(updated?.notes).toBe(newNotes); // Previous edits should persist
  });
});
