import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import fs from 'fs';

const url = new URL(process.env.DATABASE_URL);
const host = url.hostname;
const user = url.username;
const password = url.password;
const database = url.pathname.slice(1);

async function applyMigration() {
  try {
    const connection = await mysql.createConnection({
      host,
      user,
      password,
      database,
      ssl: {
        rejectUnauthorized: false
      },
    });

    const migrationSQL = fs.readFileSync('drizzle/migrations/0022_add_notifications.sql', 'utf-8');
    
    console.log('Applying notifications migration...');
    await connection.execute(migrationSQL);
    console.log('✓ Notifications table created successfully');
    
    await connection.end();
  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log('✓ Notifications table already exists');
    } else {
      console.error('Error applying migration:', error.message);
      process.exit(1);
    }
  }
}

applyMigration();
