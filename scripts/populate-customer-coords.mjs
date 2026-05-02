/**
 * Script to populate customer latitude/longitude coordinates
 * Run with: node scripts/populate-customer-coords.mjs
 */

import mysql from 'mysql2/promise';

// Approximate coordinates for the addresses (Fort Erie, ON area)
// These should be updated with actual geocoded values
const addresses = [
  { id: 1, address: '354 Alabny St, L2A 1L4', lat: 42.8989, lng: -78.9456 },
  { id: 2, address: '255 Emerick Ave, L2A 2W4', lat: 42.8845, lng: -78.9234 },
];

async function updateCustomerCoordinates() {
  let connection;
  try {
    // Get database URL from environment
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      console.error('DATABASE_URL environment variable not set');
      process.exit(1);
    }

    // Parse the database URL
    const url = new URL(dbUrl);
    const config = {
      host: url.hostname,
      user: url.username,
      password: url.password,
      database: url.pathname.slice(1),
      port: url.port || 3306,
      ssl: url.searchParams.get('ssl') === 'true' ? 'Amazon RDS' : undefined,
    };

    console.log('Connecting to database...');
    connection = await mysql.createConnection(config);

    console.log('Updating customer coordinates...');
    for (const { id, address, lat, lng } of addresses) {
      const query = 'UPDATE customers SET latitude = ?, longitude = ? WHERE id = ?';
      const [result] = await connection.execute(query, [lat, lng, id]);
      console.log(`✓ Updated customer ${id}: ${address} (${lat}, ${lng})`);
    }

    console.log('\n✅ All customer coordinates updated successfully!');
  } catch (error) {
    console.error('Error updating customer coordinates:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

updateCustomerCoordinates();
