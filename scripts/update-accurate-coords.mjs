/**
 * Script to update customer coordinates with accurate geocoded values
 * Coordinates obtained from Google Maps for Fort Erie addresses
 * Run with: node scripts/update-accurate-coords.mjs
 */

import mysql from 'mysql2/promise';

async function updateAccurateCoordinates() {
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

    console.log('Connecting to database...\n');
    connection = await mysql.createConnection(config);

    // Accurate coordinates from Google Maps
    const updates = [
      {
        address: '354 Alabny St, L2A 1L4',
        latitude: 42.8983679,
        longitude: -78.9256336,
        name: '354 Albany St, Fort Erie, ON L2A 1L4',
      },
      {
        address: '255 Emerick Ave, L2A 2W4',
        latitude: 42.9325015,
        longitude: -78.9229757,
        name: '255 Emerick Ave, Fort Erie, ON L2A 2W4',
      },
    ];

    console.log('Updating customer coordinates with accurate values:\n');

    for (const update of updates) {
      console.log(`📍 ${update.name}`);
      console.log(`   Coordinates: (${update.latitude}, ${update.longitude})\n`);

      const [result] = await connection.execute(
        'UPDATE customers SET latitude = ?, longitude = ? WHERE address = ?',
        [update.latitude, update.longitude, update.address]
      );

      console.log(`✓ Updated ${result.affectedRows} customer(s) with address "${update.address}"\n`);
    }

    // Verify the updates
    console.log('Verifying updates:\n');
    const [customers] = await connection.execute(
      'SELECT DISTINCT address, latitude, longitude FROM customers WHERE address IN (?, ?) ORDER BY address',
      ['354 Alabny St, L2A 1L4', '255 Emerick Ave, L2A 2W4']
    );

    for (const customer of customers) {
      console.log(`✓ ${customer.address}`);
      console.log(`  Latitude: ${customer.latitude}`);
      console.log(`  Longitude: ${customer.longitude}\n`);
    }

    console.log('✅ All customer coordinates updated successfully with accurate values!');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

updateAccurateCoordinates();
