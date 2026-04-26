import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { ENV } from "./env";
import { drivers } from "../../drizzle/schema";
// Removed: menuCategories, menuItems, customers - not needed in new schema

let seeded = false;

export async function seedSampleData() {
  if (seeded) return;

  try {
    const connection = await mysql.createConnection(ENV.databaseUrl);
    const db = drizzle(connection);

    // Check if drivers already exist
    const existingDrivers = await db.select().from(drivers).limit(1);
    
    if (existingDrivers.length === 0) {
      // Add sample drivers
      const driverValues = [
        { name: "John Smith", phone: "555-0101", licenseNumber: "DL001", isActive: true } as any,
        { name: "Maria Garcia", phone: "555-0102", licenseNumber: "DL002", isActive: true } as any,
        { name: "Ahmed Hassan", phone: "555-0103", licenseNumber: "DL003", isActive: true } as any,
      ];
      for (const driver of driverValues) {
        await db.insert(drivers).values(driver);
      }

      console.log('[Database] Sample drivers seeded successfully');
    }

    await connection.end();
    seeded = true;
  } catch (error) {
    console.error('[Database] Failed to seed sample data:', error);
  }
}
