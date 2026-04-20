const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

async function init() {
  try {
    const connection = await mysql.createConnection(process.env.DATABASE_URL);
    
    // Create tables if they don't exist
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS system_credentials (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role ENUM('admin', 'kitchen') NOT NULL,
        is_active BOOLEAN DEFAULT true,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS system_sessions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        credential_id INT NOT NULL,
        session_token VARCHAR(255) NOT NULL UNIQUE,
        expires_at TIMESTAMP NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (credential_id) REFERENCES system_credentials(id)
      )
    `);
    
    // Hash passwords
    const adminHash = await bcrypt.hash('Barrel_1981@', 10);
    const kitchenHash = await bcrypt.hash('1111', 10);
    
    // Insert credentials
    try {
      await connection.execute(
        'INSERT INTO system_credentials (username, password_hash, role) VALUES (?, ?, ?)',
        ['barrel_admin', adminHash, 'admin']
      );
      console.log('✓ Admin credentials created');
    } catch (e) {
      console.log('✓ Admin credentials already exist');
    }
    
    try {
      await connection.execute(
        'INSERT INTO system_credentials (username, password_hash, role) VALUES (?, ?, ?)',
        ['barrel_kitchen', kitchenHash, 'kitchen']
      );
      console.log('✓ Kitchen credentials created');
    } catch (e) {
      console.log('✓ Kitchen credentials already exist');
    }
    
    await connection.end();
    console.log('✓ Initialization complete');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

init();
