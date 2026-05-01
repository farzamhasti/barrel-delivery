import { drizzle } from "drizzle-orm/mysql2";
import { drivers } from "./drizzle/schema.js";
import { eq } from "drizzle-orm";

const db = drizzle(process.env.DATABASE_URL);

async function debug() {
  try {
    // Get the driver named "Farzam Hasti"
    const result = await db
      .select({
        id: drivers.id,
        name: drivers.name,
        isActive: drivers.isActive,
      })
      .from(drivers)
      .where(eq(drivers.name, "Farzam Hasti"));

    console.log("Driver found:", result);
    if (result[0]) {
      console.log("Driver ID type:", typeof result[0].id);
      console.log("Driver ID value:", result[0].id);
      console.log("Driver ID as number:", Number(result[0].id));
    }
  } catch (error) {
    console.error("Error:", error);
  }
  process.exit(0);
}

debug();
