/**
 * Script to geocode customer addresses and update database with coordinates
 * Run with: node scripts/geocode-and-update-customers.mjs
 */

import mysql from 'mysql2/promise';

async function geocodeAddress(address) {
  try {
    const apiUrl = process.env.BUILT_IN_FORGE_API_URL;
    const apiKey = process.env.BUILT_IN_FORGE_API_KEY;

    if (!apiUrl || !apiKey) {
      throw new Error('BUILT_IN_FORGE_API_URL or BUILT_IN_FORGE_API_KEY not set');
    }

    const response = await globalThis.fetch(`${apiUrl}/maps/api/geocode/json`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        address,
        region: 'CA',
      }),
    });

    const data = await response.json();

    if (data.status !== 'OK' || !data.results || data.results.length === 0) {
      console.error(`Geocoding failed for "${address}": ${data.status}`);
      return null;
    }

    const location = data.results[0].geometry?.location;
    if (!location) {
      console.error(`Could not extract coordinates for "${address}"`);
      return null;
    }

    return {
      latitude: location.lat,
      longitude: location.lng,
      formattedAddress: data.results[0].formatted_address,
    };
  } catch (error) {
    console.error(`Error geocoding "${address}":`, error.message);
    return null;
  }
}

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

    console.log('Connecting to database...', { host: config.host, port: config.port });
    connection = await mysql.createConnection(config);

    // Get all customers with addresses but no coordinates
    const [customers] = await connection.execute(
      'SELECT id, name, address FROM customers WHERE (latitude IS NULL OR longitude IS NULL) AND address IS NOT NULL'
    );

    if (customers.length === 0) {
      console.log('✅ All customers already have coordinates!');
      await connection.end();
      return;
    }

    console.log(`Found ${customers.length} customers to geocode\n`);

    for (const customer of customers) {
      console.log(`Geocoding customer ${customer.id}: ${customer.address}`);
      const coords = await geocodeAddress(customer.address);

      if (coords) {
        const [result] = await connection.execute(
          'UPDATE customers SET latitude = ?, longitude = ? WHERE id = ?',
          [coords.latitude, coords.longitude, customer.id]
        );
        console.log(`✓ Updated: ${coords.formattedAddress}`);
        console.log(`  Coordinates: (${coords.latitude}, ${coords.longitude})\n`);
      } else {
        console.log(`✗ Failed to geocode, skipping\n`);
      }

      // Add small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
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
