import mysql from "mysql2/promise";
import * as dotenv from "dotenv";

dotenv.config();

async function debugDrivers() {
  try {
    const connection = await mysql.createConnection(process.env.DATABASE_URL);
    
    // Query all drivers
    const [drivers] = await connection.execute("SELECT id, name, licenseNumber, isActive FROM drivers");
    
    console.log("=== All Drivers in Database ===");
    console.log(JSON.stringify(drivers, null, 2));
    
    // Check specific driver
    const [johnSmith] = await connection.execute(
      "SELECT * FROM drivers WHERE name = ? AND licenseNumber = ?",
      ["John Smith", "DL111222333"]
    );
    
    console.log("\n=== Search Result for 'John Smith' + 'DL111222333' ===");
    console.log(JSON.stringify(johnSmith, null, 2));
    
    await connection.end();
  } catch (error) {
    console.error("Error:", error.message);
  }
}

debugDrivers();
