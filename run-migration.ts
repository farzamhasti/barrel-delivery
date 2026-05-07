import mysql from 'mysql2/promise';

async function runMigration() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }

  try {
    const connection = await mysql.createConnection(connectionString);
    console.log("Connected to database");

    // Check if columns already exist
    const [columns]: any = await connection.execute(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='drivers' AND COLUMN_NAME IN ('latitude', 'longitude', 'location_updated_at')`
    );

    if (columns.length < 3) {
      console.log("Applying migration: Add driver location fields...");
      
      // Add latitude column if not exists
      try {
        await connection.execute(`ALTER TABLE drivers ADD COLUMN latitude DECIMAL(10, 6)`);
        console.log("✓ Added latitude column");
      } catch (err: any) {
        if (err.code !== 'ER_DUP_FIELDNAME') throw err;
        console.log("✓ latitude column already exists");
      }

      // Add longitude column if not exists
      try {
        await connection.execute(`ALTER TABLE drivers ADD COLUMN longitude DECIMAL(10, 6)`);
        console.log("✓ Added longitude column");
      } catch (err: any) {
        if (err.code !== 'ER_DUP_FIELDNAME') throw err;
        console.log("✓ longitude column already exists");
      }

      // Add location_updated_at column if not exists
      try {
        await connection.execute(`ALTER TABLE drivers ADD COLUMN location_updated_at TIMESTAMP`);
        console.log("✓ Added location_updated_at column");
      } catch (err: any) {
        if (err.code !== 'ER_DUP_FIELDNAME') throw err;
        console.log("✓ location_updated_at column already exists");
      }

      console.log("Migration completed successfully!");
    } else {
      console.log("All columns already exist");
    }

    await connection.end();
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

runMigration();
