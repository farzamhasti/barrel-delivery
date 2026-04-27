import { getDb } from './server/db.ts';

async function applyMigration() {
  const db = await getDb();
  if (!db) {
    console.error('✗ Failed to connect to database');
    process.exit(1);
  }

  const statements = [
    "ALTER TABLE `orders` MODIFY COLUMN `customer_address` text",
    "ALTER TABLE `orders` MODIFY COLUMN `customer_phone` varchar(20)",
    "ALTER TABLE `orders` MODIFY COLUMN `area` enum('DN', 'CP', 'B')",
  ];

  for (const statement of statements) {
    try {
      await db.execute(statement);
      console.log(`✓ Executed: ${statement.substring(0, 60)}...`);
    } catch (err) {
      console.error(`✗ Error: ${err.message}`);
    }
  }

  console.log('\n✓ Migration complete');
  process.exit(0);
}

applyMigration().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
