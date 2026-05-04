import mysql from 'mysql2/promise';

async function migrate() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('DATABASE_URL not set');
    process.exit(1);
  }

  try {
    const connection = await mysql.createConnection(dbUrl);
    console.log('✓ Connected to database');

    // Check if username column exists
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'push_subscriptions' AND COLUMN_NAME = 'username'
    `);

    if (columns.length === 0) {
      console.log('Adding username column...');
      await connection.execute(`
        ALTER TABLE push_subscriptions ADD COLUMN username VARCHAR(255) AFTER user_id
      `);
      console.log('✓ Username column added');

      await connection.execute(`
        CREATE INDEX idx_push_subscriptions_username ON push_subscriptions(username)
      `);
      console.log('✓ Index created');
    } else {
      console.log('✓ Username column already exists');
    }

    await connection.end();
    console.log('✓ Migration complete');
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME' || err.code === 'ER_DUP_KEYNAME') {
      console.log('✓ Column or index already exists');
    } else {
      console.error('✗ Error:', err.message);
      process.exit(1);
    }
  }
}

migrate();
