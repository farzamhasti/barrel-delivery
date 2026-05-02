import { describe, it, expect, beforeAll } from "vitest";
import { 
  createMenuCategory, 
  createMenuItem, 
  deleteMenuItem, 
  getMenuItems,
  createCustomer,
  createOrder,
  createOrderItem
} from "./db";
import { initializeDatabase } from "./_core/initDb";

describe("Menu Item Soft Delete", () => {
  let categoryId: number;
  let menuItemId: number;

  beforeAll(async () => {
    // Initialize database and ensure tables exist
    await initializeDatabase();

    // Create a menu category
    const categoryResult = await createMenuCategory({
      name: "Test Delete Category",
      description: "Category for soft delete testing",
    });
    
    categoryId = Array.isArray(categoryResult) 
      ? (categoryResult as any)[0]?.insertId 
      : (categoryResult as any).insertId;

    // Create a menu item
    const itemResult = await createMenuItem({
      categoryId,
      name: "Test Delete Item",
      description: "Item to be soft deleted",
      price: 24.99 as any,
    });

    menuItemId = Array.isArray(itemResult) 
      ? (itemResult as any)[0]?.insertId 
      : (itemResult as any).insertId;
  });

  it("should soft delete a menu item by setting isAvailable to false", async () => {
    // Verify item exists and is available
    let items = await getMenuItems(categoryId);
    const itemBefore = items.find((item: any) => item.id === menuItemId);
    expect(itemBefore).toBeDefined();
    expect(itemBefore?.isAvailable).toBe(true);

    // Delete the item (soft delete)
    await deleteMenuItem(menuItemId);

    // Verify item is no longer in the available items list
    items = await getMenuItems(categoryId);
    const itemAfter = items.find((item: any) => item.id === menuItemId);
    expect(itemAfter).toBeUndefined();
  });

  it("should allow soft delete of menu item referenced by order_items", async () => {
    // Create another menu item
    const itemResult = await createMenuItem({
      categoryId,
      name: "Item Referenced by Order",
      description: "Item that will be referenced by order",
      price: 29.99 as any,
    });

    const referencedItemId = Array.isArray(itemResult) 
      ? (itemResult as any)[0]?.insertId 
      : (itemResult as any).insertId;

    // Create a customer and order with this item
    const customerResult = await createCustomer({
      name: "Test Customer",
      phone: "+1 (555) 123-4567",
      address: "123 Test St, Test City, TC 12345",
    });

    const customerId = (customerResult as any)?.id || (Array.isArray(customerResult) 
      ? (customerResult as any)[0]?.insertId 
      : (customerResult as any).insertId);

    const orderResult = await createOrder({
      customerId,
      totalPrice: 29.99 as any,
    });

    const orderId = Array.isArray(orderResult) 
      ? (orderResult as any)[0]?.insertId 
      : (orderResult as any).insertId;

    // Create order item referencing the menu item
    await createOrderItem({
      orderId,
      menuItemId: referencedItemId,
      quantity: 1,
      priceAtOrder: 29.99 as any,
    });

    // Soft delete should succeed even though item is referenced by order_items
    const deleteResult = await deleteMenuItem(referencedItemId);
    expect(deleteResult).toBeDefined();

    // Verify item is no longer in available items
    const items = await getMenuItems(categoryId);
    const deletedItem = items.find((item: any) => item.id === referencedItemId);
    expect(deletedItem).toBeUndefined();
  });

  it("should filter out unavailable items from getMenuItems", async () => {
    // Create multiple items
    const item1Result = await createMenuItem({
      categoryId,
      name: "Available Item 1",
      description: "Should be visible",
      price: 10.99 as any,
    });

    const item1Id = Array.isArray(item1Result) 
      ? (item1Result as any)[0]?.insertId 
      : (item1Result as any).insertId;

    const item2Result = await createMenuItem({
      categoryId,
      name: "Available Item 2",
      description: "Should be visible",
      price: 15.99 as any,
    });

    const item2Id = Array.isArray(item2Result) 
      ? (item2Result as any)[0]?.insertId 
      : (item2Result as any).insertId;

    // Get all items - should include both
    let items = await getMenuItems(categoryId);
    const countBefore = items.length;
    expect(items.some((item: any) => item.id === item1Id)).toBe(true);
    expect(items.some((item: any) => item.id === item2Id)).toBe(true);

    // Delete one item
    await deleteMenuItem(item1Id);

    // Get items again - should only include the second item
    items = await getMenuItems(categoryId);
    expect(items.length).toBe(countBefore - 1);
    expect(items.some((item: any) => item.id === item1Id)).toBe(false);
    expect(items.some((item: any) => item.id === item2Id)).toBe(true);
  });
});
