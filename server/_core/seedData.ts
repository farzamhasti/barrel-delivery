import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { ENV } from "./env";
import { menuCategories, menuItems, drivers, customers } from "../../drizzle/schema";

let seeded = false;

export async function seedSampleData() {
  if (seeded) return;

  try {
    const connection = await mysql.createConnection(ENV.databaseUrl);
    const db = drizzle(connection);

    // Check if categories already exist
    const existingCategories = await db.select().from(menuCategories).limit(1);
    
    if (existingCategories.length === 0) {
      // Add menu categories
      await db.insert(menuCategories).values([
        { name: "Appetizers", description: "Delicious starters", displayOrder: 1, isActive: true } as any,
        { name: "Main Courses", description: "Hearty main dishes", displayOrder: 2, isActive: true } as any,
        { name: "Desserts", description: "Sweet treats", displayOrder: 3, isActive: true } as any,
        { name: "Beverages", description: "Drinks and beverages", displayOrder: 4, isActive: true } as any,
      ]);

      // Add menu items
      await db.insert(menuItems).values([
        { categoryId: 1, name: "Hummus", description: "Chickpea dip", price: 5.99 as any, isAvailable: true, displayOrder: 1, imageUrl: undefined } as any,
        { categoryId: 1, name: "Falafel", description: "Fried chickpea balls", price: 6.99 as any, isAvailable: true, displayOrder: 2, imageUrl: undefined } as any,
        { categoryId: 2, name: "Grilled Chicken", description: "Tender grilled chicken breast", price: 14.99 as any, isAvailable: true, displayOrder: 1, imageUrl: undefined } as any,
        { categoryId: 2, name: "Lamb Kebab", description: "Succulent lamb skewers", price: 16.99 as any, isAvailable: true, displayOrder: 2, imageUrl: undefined } as any,
        { categoryId: 2, name: "Vegetarian Platter", description: "Mixed vegetable dish", price: 12.99 as any, isAvailable: true, displayOrder: 3, imageUrl: undefined } as any,
        { categoryId: 3, name: "Baklava", description: "Honey and nut pastry", price: 4.99 as any, isAvailable: true, displayOrder: 1, imageUrl: undefined } as any,
        { categoryId: 3, name: "Cheesecake", description: "Creamy cheesecake", price: 5.99 as any, isAvailable: true, displayOrder: 2, imageUrl: undefined } as any,
        { categoryId: 4, name: "Lemonade", description: "Fresh lemonade", price: 3.99 as any, isAvailable: true, displayOrder: 1, imageUrl: undefined } as any,
        { categoryId: 4, name: "Iced Tea", description: "Refreshing iced tea", price: 3.49 as any, isAvailable: true, displayOrder: 2, imageUrl: undefined } as any,
      ]);

      // Add sample drivers
      const driverValues = [
        { name: "John Smith", phone: "555-0101", licenseNumber: "DL001", vehicleType: "Car", isActive: true, status: "offline" } as any,
        { name: "Maria Garcia", phone: "555-0102", licenseNumber: "DL002", vehicleType: "Motorcycle", isActive: true, status: "offline" } as any,
        { name: "Ahmed Hassan", phone: "555-0103", licenseNumber: "DL003", vehicleType: "Truck", isActive: true, status: "offline" } as any,
      ];
      for (const driver of driverValues) {
        await db.insert(drivers).values(driver);
      }

      // Add sample customers
      await db.insert(customers).values([
        { name: "Alice Johnson", phone: "555-1001", address: "123 Main St, Downtown", latitude: undefined, longitude: undefined } as any,
        { name: "Bob Wilson", phone: "555-1002", address: "456 Oak Ave, Midtown", latitude: undefined, longitude: undefined } as any,
        { name: "Carol Davis", phone: "555-1003", address: "789 Pine Rd, Uptown", latitude: undefined, longitude: undefined } as any,
      ]);

      console.log('[Database] Sample data seeded successfully');
    }

    await connection.end();
    seeded = true;
  } catch (error) {
    console.error('[Database] Failed to seed sample data:', error);
  }
}
