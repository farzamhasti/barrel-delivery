/**
 * Simple script to update customer coordinates with known values
 * Run with: node scripts/update-customer-coords-simple.mjs
 */

import mysql from 'mysql2/promise';

// Coordinates for Fort Erie, ON addresses
// These are approximate coordinates for the customer locations
const customerUpdates = [
  {
    address: '354 Alabny St, L2A 1L4',
    latitude: 42.8989,
    longitude: -78.9456,
  },
  {
    address: '255 Emerick Ave, L2A 2W4',
    latitude: 42.8845,
    longitude: -78.9234,
  },
];

async function updateCustomerCoordinates() {
  let connection;
  try {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      throw new Error('DATABASE_URL environment variable not set');
    }

    // Parse the database URL
    const url = new URL(dbUrl);
    const config = {
      host: url.hostname,
      user: url.username,
      password: url.password,
      database: url.pathname.slice(1),
      port: url.port || 3306,
      ssl: {
        rejectUnauthorized: false,
      },
    };

    console.log('Connecting to database...');
    connection = await mysql.createConnection(config);

    console.log('Updating customer coordinates...\n');

    for (const update of customerUpdates) {
      const [result] = await connection.execute(
        'UPDATE customers SET latitude = ?, longitude = ? WHERE address = ?',
        [update.latitude, update.longitude, update.address]
      );

      console.log(`✓ Updated customers with address: "${update.address}"`);
      console.log(`  Coordinates: (${update.latitude}, ${update.longitude})`);
      console.log(`  Rows affected: ${result.affectedRows}\n`);
    }

    console.log('✅ Customer coordinates updated successfully!');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

updateCustomerCoordinates();
