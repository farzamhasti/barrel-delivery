import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function applyMigrations() {
  let connection;
  try {
    console.log('Connecting to database...');
    console.log('Host:', process.env.DB_HOST);
    console.log('Database:', process.env.DB_NAME);
    
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl: 'Amazon RDS',
    });

    console.log('✓ Connected to database');
    
    const migrationSql = fs.readFileSync(
      path.join(__dirname, '../drizzle/combined_migration.sql'),
      'utf-8'
    );

    // Split by semicolon and execute each statement
    const statements = migrationSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const statement of statements) {
      console.log(`Executing: ${statement.substring(0, 50)}...`);
      try {
        await connection.execute(statement);
        console.log('✓ Success');
      } catch (err) {
        // Ignore table already exists errors
        if (err.code === 'ER_TABLE_EXISTS_ERROR') {
          console.log('✓ Table already exists (skipped)');
        } else {
          throw err;
        }
      }
    }

    console.log('\n✅ All migrations applied successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

applyMigrations();
