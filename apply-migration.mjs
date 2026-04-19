import { getDb } from './server/db.ts';

async function applyMigration() {
  const db = await getDb();
  if (!db) {
    console.error('✗ Failed to connect to database');
    process.exit(1);
  }

  const queries = [
    "ALTER TABLE `orders` ADD COLUMN `subtotal` decimal(10,2) DEFAULT '0' NOT NULL",
    "ALTER TABLE `orders` ADD COLUMN `tax_percentage` decimal(5,2) DEFAULT '13' NOT NULL",
    "ALTER TABLE `orders` ADD COLUMN `tax_amount` decimal(10,2) DEFAULT '0' NOT NULL",
    "ALTER TABLE `orders` ADD COLUMN `delivery_time` timestamp",
    "ALTER TABLE `orders` ADD COLUMN `has_delivery_time` boolean DEFAULT false",
  ];

  try {
    for (const query of queries) {
      try {
        await db.execute(query);
        console.log(`✓ Executed: ${query.substring(0, 50)}...`);
      } catch (err) {
        if (err.code === 'ER_DUP_FIELDNAME' || err.message.includes('Duplicate column')) {
          console.log(`⚠ Column already exists: ${query.substring(0, 50)}...`);
        } else {
          throw err;
        }
      }
    }
    console.log('✓ Migration completed successfully');
  } catch (error) {
    console.error('✗ Migration failed:', error.message);
    process.exit(1);
  }
}

applyMigration();
