import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const connection = await mysql.createConnection(DATABASE_URL);

try {
  const migrationSQL = fs.readFileSync(
    path.join(__dirname, 'drizzle/migrations/0025_add_dashboard_type_to_push_subscriptions.sql'),
    'utf-8'
  );

  const statements = migrationSQL.split(';').filter(s => s.trim());

  for (const statement of statements) {
    if (statement.trim()) {
      console.log('Executing:', statement.substring(0, 100) + '...');
      await connection.execute(statement);
      console.log('✓ Success');
    }
  }

  console.log('\n✓ Migration applied successfully');
} catch (error) {
  console.error('Migration failed:', error.message);
  process.exit(1);
} finally {
  await connection.end();
}
