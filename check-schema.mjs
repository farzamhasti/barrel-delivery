import { getDb } from './server/db.ts';

async function checkSchema() {
  const db = await getDb();
  if (!db) {
    console.error('✗ Failed to connect to database');
    process.exit(1);
  }

  try {
    const result = await db.execute("DESCRIBE `orders`");
    console.log('Columns in orders table:');
    result[0].forEach((row) => {
      console.log(`- ${row.Field} (${row.Type})`);
    });
  } catch (err) {
    console.error('✗ Error:', err.message);
    process.exit(1);
  }
}

checkSchema();
