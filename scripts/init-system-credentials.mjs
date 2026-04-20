import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import bcrypt from "bcrypt";
import { systemCredentials } from "../drizzle/schema.ts";
import { eq } from "drizzle-orm";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("DATABASE_URL environment variable is not set");
  process.exit(1);
}

async function initializeSystemCredentials() {
  try {
    // Parse connection string
    const url = new URL(DATABASE_URL);
    const connection = await mysql.createConnection({
      host: url.hostname,
      user: url.username,
      password: url.password,
      database: url.pathname.slice(1),
    });

    const db = drizzle(connection);

    // Hash passwords
    const adminPasswordHash = await bcrypt.hash("Barrel_1981@", 10);
    const kitchenPasswordHash = await bcrypt.hash("1111", 10);

    // Check if credentials already exist
    const adminExists = await db
      .select()
      .from(systemCredentials)
      .where(eq(systemCredentials.username, "barrel_admin"));

    const kitchenExists = await db
      .select()
      .from(systemCredentials)
      .where(eq(systemCredentials.username, "barrel_kitchen"));

    // Insert admin credentials if not exists
    if (adminExists.length === 0) {
      await db.insert(systemCredentials).values({
        username: "barrel_admin",
        passwordHash: adminPasswordHash,
        role: "admin",
        isActive: true,
      });
      console.log("✓ Admin credentials created: barrel_admin / Barrel_1981@");
    } else {
      console.log("✓ Admin credentials already exist");
    }

    // Insert kitchen credentials if not exists
    if (kitchenExists.length === 0) {
      await db.insert(systemCredentials).values({
        username: "barrel_kitchen",
        passwordHash: kitchenPasswordHash,
        role: "kitchen",
        isActive: true,
      });
      console.log("✓ Kitchen credentials created: barrel_kitchen / 1111");
    } else {
      console.log("✓ Kitchen credentials already exist");
    }

    await connection.end();
    console.log("✓ System credentials initialization complete");
    process.exit(0);
  } catch (error) {
    console.error("Error initializing system credentials:", error);
    process.exit(1);
  }
}

initializeSystemCredentials();
