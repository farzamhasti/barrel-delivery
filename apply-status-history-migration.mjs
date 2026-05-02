import { getDb } from './server/db.ts';

async function applyMigration() {
  const db = await getDb();
  if (!db) {
    console.error('✗ Failed to connect to database');
    process.exit(1);
  }

  try {
    console.log('Applying orderStatusHistory migration...');
    
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS order_status_history (
        id int AUTO_INCREMENT NOT NULL,
        order_id int NOT NULL,
        previous_status enum('Pending','Ready','On the Way','Delivered'),
        new_status enum('Pending','Ready','On the Way','Delivered') NOT NULL,
        transition_time timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY(id)
      )
    `;
    
    await db.execute(createTableSQL);
    console.log('✓ orderStatusHistory table created successfully');
    process.exit(0);
  } catch (error) {
    console.error('✗ Migration failed:', error.message);
    process.exit(1);
  }
}

applyMigration();
