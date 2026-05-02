import { describe, it, expect, beforeAll } from "vitest";
import { 
  createMenuCategory, 
  deleteMenuCategory, 
  getMenuCategories,
  createMenuItem
} from "./db";
import { initializeDatabase } from "./_core/initDb";

describe("Menu Category Soft Delete", () => {
  beforeAll(async () => {
    // Initialize database and ensure tables exist
    await initializeDatabase();
  });

  it("should soft delete a menu category by setting isActive to false", async () => {
    // Create a category
    const categoryResult = await createMenuCategory({
      name: "Test Delete Category",
      description: "Category to be soft deleted",
    });
    
    const categoryId = Array.isArray(categoryResult) 
      ? (categoryResult as any)[0]?.insertId 
      : (categoryResult as any).insertId;

    // Verify category exists and is active
    let categories = await getMenuCategories();
    const categoryBefore = categories.find((cat: any) => cat.id === categoryId);
    expect(categoryBefore).toBeDefined();
    expect(categoryBefore?.isActive).toBe(true);

    // Delete the category (soft delete)
    await deleteMenuCategory(categoryId);

    // Verify category is no longer in the active categories list
    categories = await getMenuCategories();
    const categoryAfter = categories.find((cat: any) => cat.id === categoryId);
    expect(categoryAfter).toBeUndefined();
  });

  it("should allow soft delete of menu category with menu items", async () => {
    // Create a category
    const categoryResult = await createMenuCategory({
      name: "Category With Items",
      description: "Category that will have menu items",
    });
    
    const categoryId = Array.isArray(categoryResult) 
      ? (categoryResult as any)[0]?.insertId 
      : (categoryResult as any).insertId;

    // Create menu items in this category
    await createMenuItem({
      categoryId,
      name: "Item 1",
      description: "First item",
      price: 10.99 as any,
    });

    await createMenuItem({
      categoryId,
      name: "Item 2",
      description: "Second item",
      price: 15.99 as any,
    });

    // Soft delete should succeed even though category has menu items
    const deleteResult = await deleteMenuCategory(categoryId);
    expect(deleteResult).toBeDefined();

    // Verify category is no longer in active categories
    const categories = await getMenuCategories();
    const deletedCategory = categories.find((cat: any) => cat.id === categoryId);
    expect(deletedCategory).toBeUndefined();
  });

  it("should filter out inactive categories from getMenuCategories", async () => {
    // Create multiple categories
    const cat1Result = await createMenuCategory({
      name: "Active Category 1",
      description: "Should be visible",
    });

    const cat1Id = Array.isArray(cat1Result) 
      ? (cat1Result as any)[0]?.insertId 
      : (cat1Result as any).insertId;

    const cat2Result = await createMenuCategory({
      name: "Active Category 2",
      description: "Should be visible",
    });

    const cat2Id = Array.isArray(cat2Result) 
      ? (cat2Result as any)[0]?.insertId 
      : (cat2Result as any).insertId;

    // Get all categories - should include both
    let categories = await getMenuCategories();
    const countBefore = categories.length;
    expect(categories.some((cat: any) => cat.id === cat1Id)).toBe(true);
    expect(categories.some((cat: any) => cat.id === cat2Id)).toBe(true);

    // Delete one category
    await deleteMenuCategory(cat1Id);

    // Get categories again - should only include the second category
    categories = await getMenuCategories();
    expect(categories.length).toBe(countBefore - 1);
    expect(categories.some((cat: any) => cat.id === cat1Id)).toBe(false);
    expect(categories.some((cat: any) => cat.id === cat2Id)).toBe(true);
  });

  it("should handle multiple category deletions", async () => {
    // Create three categories
    const cat1Result = await createMenuCategory({
      name: "Delete Me 1",
      description: "Will be deleted",
    });

    const cat1Id = Array.isArray(cat1Result) 
      ? (cat1Result as any)[0]?.insertId 
      : (cat1Result as any).insertId;

    const cat2Result = await createMenuCategory({
      name: "Delete Me 2",
      description: "Will be deleted",
    });

    const cat2Id = Array.isArray(cat2Result) 
      ? (cat2Result as any)[0]?.insertId 
      : (cat2Result as any).insertId;

    const cat3Result = await createMenuCategory({
      name: "Keep Me",
      description: "Will not be deleted",
    });

    const cat3Id = Array.isArray(cat3Result) 
      ? (cat3Result as any)[0]?.insertId 
      : (cat3Result as any).insertId;

    // Get initial count
    let categories = await getMenuCategories();
    const initialCount = categories.length;

    // Delete two categories
    await deleteMenuCategory(cat1Id);
    await deleteMenuCategory(cat2Id);

    // Verify count decreased by 2
    categories = await getMenuCategories();
    expect(categories.length).toBe(initialCount - 2);
    expect(categories.some((cat: any) => cat.id === cat1Id)).toBe(false);
    expect(categories.some((cat: any) => cat.id === cat2Id)).toBe(false);
    expect(categories.some((cat: any) => cat.id === cat3Id)).toBe(true);
  });
});
