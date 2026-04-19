import { getDb } from './server/db.ts';

async function addTotalPrice() {
  const db = await getDb();
  if (!db) {
    console.error('✗ Failed to connect to database');
    process.exit(1);
  }

  const query = "ALTER TABLE `orders` ADD COLUMN `total_price` decimal(10,2) NOT NULL DEFAULT '0'";

  try {
    await db.execute(query);
    console.log(`✓ Executed: ${query}`);
    console.log('✓ Column added successfully');
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME' || err.message.includes('Duplicate column')) {
      console.log(`⚠ Column already exists`);
    } else {
      console.error('✗ Error:', err.message);
      process.exit(1);
    }
  }
}

addTotalPrice();
