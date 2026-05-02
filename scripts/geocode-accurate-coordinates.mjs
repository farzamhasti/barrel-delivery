/**
 * Script to accurately geocode customer addresses and update database
 * Uses Manus Maps API for precise coordinates
 * Run with: node scripts/geocode-accurate-coordinates.mjs
 */

import mysql from 'mysql2/promise';

async function geocodeAddress(address, apiUrl, apiKey) {
  try {
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
      console.error(`❌ Geocoding failed for "${address}": ${data.status}`);
      console.error('Response:', data);
      return null;
    }

    const location = data.results[0].geometry?.location;
    if (!location) {
      console.error(`❌ Could not extract coordinates for "${address}"`);
      return null;
    }

    return {
      latitude: location.lat,
      longitude: location.lng,
      formattedAddress: data.results[0].formatted_address,
    };
  } catch (error) {
    console.error(`❌ Error geocoding "${address}":`, error.message);
    return null;
  }
}

async function updateCustomerCoordinates() {
  let connection;
  try {
    const dbUrl = process.env.DATABASE_URL;
    const apiUrl = process.env.BUILT_IN_FORGE_API_URL;
    const apiKey = process.env.BUILT_IN_FORGE_API_KEY;

    if (!dbUrl) {
      throw new Error('DATABASE_URL environment variable not set');
    }
    if (!apiUrl || !apiKey) {
      throw new Error('BUILT_IN_FORGE_API_URL or BUILT_IN_FORGE_API_KEY not set');
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

    // Get all unique customer addresses
    const [addresses] = await connection.execute(
      'SELECT DISTINCT address FROM customers WHERE address IS NOT NULL ORDER BY address'
    );

    if (addresses.length === 0) {
      console.log('✅ No customer addresses found');
      await connection.end();
      return;
    }

    console.log(`\nFound ${addresses.length} unique customer addresses to geocode\n`);

    const updates = [];

    for (const row of addresses) {
      const address = row.address;
      console.log(`🔍 Geocoding: "${address}"`);

      const coords = await geocodeAddress(address, apiUrl, apiKey);

      if (coords) {
        console.log(`✓ Result: (${coords.latitude}, ${coords.longitude})`);
        console.log(`  Formatted: ${coords.formattedAddress}\n`);
        updates.push({ address, ...coords });
      } else {
        console.log(`✗ Failed to geocode\n`);
      }

      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    if (updates.length === 0) {
      console.log('❌ No addresses were successfully geocoded');
      await connection.end();
      return;
    }

    console.log(`\nUpdating ${updates.length} addresses in database...\n`);

    for (const update of updates) {
      const [result] = await connection.execute(
        'UPDATE customers SET latitude = ?, longitude = ? WHERE address = ?',
        [update.latitude, update.longitude, update.address]
      );

      console.log(`✓ Updated "${update.address}"`);
      console.log(`  Coordinates: (${update.latitude}, ${update.longitude})`);
      console.log(`  Rows affected: ${result.affectedRows}\n`);
    }

    console.log('✅ All customer coordinates updated successfully!');
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
