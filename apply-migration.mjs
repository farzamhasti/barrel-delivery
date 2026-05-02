import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const connection = await mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

try {
  // Check if the column already exists
  const [columns] = await connection.query(`
    SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'orders' AND COLUMN_NAME = 'formatted_receipt_image'
  `);
  
  if (columns.length === 0) {
    console.log('Adding formatted_receipt_image column...');
    await connection.query(`
      ALTER TABLE \`orders\` 
      ADD COLUMN \`formatted_receipt_image\` text AFTER \`receipt_image\`
    `);
    console.log('✓ formatted_receipt_image column added');
  } else {
    console.log('✓ formatted_receipt_image column already exists');
  }
  
  console.log('\n✓ Migration completed successfully!');
} catch (error) {
  console.error('Migration error:', error.message);
  process.exit(1);
} finally {
  await connection.end();
}
