import { drizzle } from "drizzle-orm/mysql2";
import { createHash } from "crypto";
import { eq } from "drizzle-orm";
import { systemCredentials } from "./drizzle/schema.js";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

async function seedKitchen() {
  const db = drizzle(DATABASE_URL);
  
  // Hash password: sha256$salt$hash
  const password = "kitchen123";
  const salt = "kitchen_salt_2024";
  const hash = createHash("sha256").update(salt + password).digest("hex");
  const passwordHash = `sha256$${salt}$${hash}`;
  
  try {
    // Check if kitchen user exists
    const existing = await db.select().from(systemCredentials).where(eq(systemCredentials.username, "barrel_kitchen"));
    
    if (existing.length > 0) {
      console.log("Kitchen credentials already exist");
      return;
    }
    
    // Insert kitchen credentials
    const result = await db.insert(systemCredentials).values({
      username: "barrel_kitchen",
      passwordHash,
      role: "kitchen",
      isActive: true,
    });
    
    console.log("Kitchen credentials created successfully");
    console.log("Username: barrel_kitchen");
    console.log("Password: kitchen123");
  } catch (error) {
    console.error("Error seeding kitchen credentials:", error);
  }
}

seedKitchen();
