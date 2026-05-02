import { getDb } from './db';

async function runMigration() {
  try {
    const db = await getDb();
    if (!db) {
      console.error('✗ Failed to connect to database');
      process.exit(1);
    }

    console.log('Starting migration...');

    // Fix area enum to match new area names: Downtown, Central Park, Both
    console.log('Fixing area enum...');
    try {
      await db.execute(`
        ALTER TABLE \`orders\` 
        MODIFY COLUMN \`area\` enum('Downtown', 'Central Park', 'Both')
      `);
      console.log('✓ area enum fixed');
    } catch (error) {
      console.log('⚠ area enum fix skipped (may already be correct):', error instanceof Error ? error.message : String(error));
    }

    // Check if the column already exists
    const [result] = await db.execute(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'orders' AND COLUMN_NAME = 'formatted_receipt_image'
    `);

    if (Array.isArray(result) && result.length === 0) {
      console.log('Adding formatted_receipt_image column...');
      await db.execute(`
        ALTER TABLE \`orders\` 
        ADD COLUMN \`formatted_receipt_image\` text AFTER \`receipt_image\`
      `);
      console.log('✓ formatted_receipt_image column added');
    } else {
      console.log('✓ formatted_receipt_image column already exists');
    }

    console.log('\n✓ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

runMigration();
