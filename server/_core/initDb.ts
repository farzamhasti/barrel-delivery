import { getDb } from "../db";
import { systemCredentials } from "../../drizzle/schema";
import { createHash } from "crypto";
import { eq } from "drizzle-orm";

let initialized = false;

export async function initializeDatabase() {
  if (initialized) return;

  try {
    const db = await getDb();
    if (!db) {
      console.error('[Database] Failed to get database connection');
      return;
    }

    // Insert default system credentials if they don't exist
    try {
      const generatePasswordHash = (password: string): string => {
        const salt = Math.random().toString(36).substring(2, 15);
        const hash = createHash('sha256').update(salt + password).digest('hex');
        return `sha256$${salt}$${hash}`;
      };
      
      // Admin credentials
      const adminHash = generatePasswordHash('Barrel_1981@');
      const existingAdmin = await db.select().from(systemCredentials).where(eq(systemCredentials.username, 'barrel_admin'));
      
      if (existingAdmin.length === 0) {
        await db.insert(systemCredentials).values({
          username: 'barrel_admin',
          passwordHash: adminHash,
          role: 'admin',
          isActive: true,
        });
      }
      
      // Kitchen credentials
      const kitchenHash = generatePasswordHash('1111');
      const existingKitchen = await db.select().from(systemCredentials).where(eq(systemCredentials.username, 'barrel_kitchen'));
      
      if (existingKitchen.length === 0) {
        await db.insert(systemCredentials).values({
          username: 'barrel_kitchen',
          passwordHash: kitchenHash,
          role: 'kitchen',
          isActive: true,
        });
      }
      
      console.log('[Database] System credentials initialized');
    } catch (error: any) {
      console.error('[Database] Error initializing system credentials:', error.message);
    }

    initialized = true;
    console.log('[Database] Initialization complete');
  } catch (error) {
    console.error('[Database] Initialization failed:', error);
  }
}
