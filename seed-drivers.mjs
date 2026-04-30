import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'barrel_delivery',
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0
});

async function seedDrivers() {
  const conn = await pool.getConnection();
  
  try {
    // Create test drivers
    const drivers = [
      { name: 'John Driver', license_number: 'D1234567', status: 'offline', is_active: 1 },
      { name: 'Jane Smith', license_number: 'D7654321', status: 'offline', is_active: 1 },
      { name: 'Mike Johnson', license_number: 'D1111111', status: 'offline', is_active: 1 },
      { name: 'Sarah Williams', license_number: 'D2222222', status: 'offline', is_active: 1 },
    ];

    for (const driver of drivers) {
      await conn.query(
        'INSERT INTO drivers (name, license_number, status, is_active) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE is_active = ?',
        [driver.name, driver.license_number, driver.status, driver.is_active, driver.is_active]
      );
      console.log(`✓ Created/updated driver: ${driver.name} (${driver.license_number})`);
    }

    console.log('\n✓ All drivers seeded successfully!');
    console.log('\nYou can now log in with any of these credentials:');
    drivers.forEach(d => {
      console.log(`  - Name: ${d.name}, License: ${d.license_number}`);
    });

  } catch (error) {
    console.error('Error seeding drivers:', error.message);
  } finally {
    conn.release();
    await pool.end();
  }
}

seedDrivers();
