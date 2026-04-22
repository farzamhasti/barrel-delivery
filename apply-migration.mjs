import { getDb } from './server/db.ts';

async function applyMigration() {
  const db = await getDb();
  if (!db) {
    console.error('✗ Failed to connect to database');
    process.exit(1);
  }

  const statements = [
    "ALTER TABLE `orders` ADD COLUMN `area` varchar(50)",
    "ALTER TABLE `orders` ADD COLUMN `total_price` decimal(10,2) NOT NULL DEFAULT '0'",
    "ALTER TABLE `orders` ADD COLUMN `subtotal` decimal(10,2) DEFAULT '0' NOT NULL",
    "ALTER TABLE `orders` ADD COLUMN `tax_percentage` decimal(5,2) DEFAULT '13' NOT NULL",
    "ALTER TABLE `orders` ADD COLUMN `tax_amount` decimal(10,2) DEFAULT '0' NOT NULL",
    "ALTER TABLE `orders` ADD COLUMN `delivery_time` timestamp",
    "ALTER TABLE `orders` ADD COLUMN `has_delivery_time` boolean DEFAULT false",
    "ALTER TABLE `orders` MODIFY COLUMN `status` enum('Pending','Ready','On the Way','Delivered') NOT NULL DEFAULT 'Pending'",
    "ALTER TABLE `orders` ADD COLUMN `picked_up_at` timestamp NULL",
    "ALTER TABLE `orders` ADD COLUMN `delivered_at` timestamp NULL"
  ];

  for (const statement of statements) {
    try {
      await db.execute(statement);
      console.log(`✓ Executed: ${statement.substring(0, 60)}...`);
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME' || err.message.includes('Duplicate column')) {
        console.log(`⚠ Column already exists: ${statement.substring(0, 60)}...`);
      } else {
        console.error(`✗ Error: ${err.message}`);
      }
    }
  }

  console.log('\n✓ Migration complete');
  process.exit(0);
}

applyMigration().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
