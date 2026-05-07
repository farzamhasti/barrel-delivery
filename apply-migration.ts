import { drizzle } from 'drizzle-orm/mysql2';
import { sql } from 'drizzle-orm';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const db = drizzle(connectionString);

async function applyMigration() {
  try {
    console.log("Applying migration: Add driver location fields...");
    
    // Execute each migration statement
    await db.execute(sql`ALTER TABLE drivers ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 6)`);
    console.log("✓ Added latitude column");
    
    await db.execute(sql`ALTER TABLE drivers ADD COLUMN IF NOT EXISTS longitude DECIMAL(10, 6)`);
    console.log("✓ Added longitude column");
    
    await db.execute(sql`ALTER TABLE drivers ADD COLUMN IF NOT EXISTS location_updated_at TIMESTAMP`);
    console.log("✓ Added location_updated_at column");
    
    console.log("Migration completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

applyMigration();
