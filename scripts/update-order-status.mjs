import mysql from "mysql2/promise";

const connection = await mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "barrel_delivery",
  ssl: "Amazon RDS" in process.env ? { rejectUnauthorized: false } : undefined,
});

try {
  console.log("Updating order status enum to include 'Ready'...");
  await connection.execute(
    "ALTER TABLE `orders` MODIFY COLUMN `status` enum('Pending','Ready','On the Way','Delivered') NOT NULL DEFAULT 'Pending'"
  );
  console.log("✅ Order status enum updated successfully!");
} catch (error) {
  if (error.code === "ER_DUP_FIELDNAME" || error.message.includes("Duplicate")) {
    console.log("ℹ️ Column already exists or status already includes 'Ready'");
  } else {
    console.error("❌ Error updating status:", error.message);
  }
} finally {
  await connection.end();
}
