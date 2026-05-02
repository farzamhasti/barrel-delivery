import mysql from 'mysql2/promise';
import crypto from 'crypto';
import { URL } from 'url';

async function initializeCredentials() {
  try {
    // Parse DATABASE_URL
    const dbUrl = new URL(process.env.DATABASE_URL);
    const config = {
      host: dbUrl.hostname,
      user: dbUrl.username,
      password: dbUrl.password,
      database: dbUrl.pathname.slice(1),
      ssl: {
        rejectUnauthorized: false,
      },
    };

    console.log(`Connecting to ${config.host}/${config.database}...`);

    const connection = await mysql.createConnection(config);

    const credentials = [
      { username: 'admin', password: 'password', role: 'admin' },
      { username: 'kitchen', password: 'password', role: 'kitchen' },
    ];

    for (const cred of credentials) {
      const salt = `${cred.username}_salt_${Date.now()}`;
      const hash = crypto.createHash('sha256').update(salt + cred.password).digest('hex');
      const passwordHash = `sha256$${salt}$${hash}`;

      const query = `
        INSERT INTO system_credentials (username, password_hash, role) 
        VALUES (?, ?, ?) 
        ON DUPLICATE KEY UPDATE password_hash = ?, role = ?
      `;

      await connection.execute(query, [
        cred.username,
        passwordHash,
        cred.role,
        passwordHash,
        cred.role,
      ]);

      console.log(`✓ ${cred.role} credentials initialized (username: ${cred.username})`);
    }

    await connection.end();
    console.log('\n✓ All credentials initialized successfully');
  } catch (error) {
    console.error('Error initializing credentials:', error.message);
    process.exit(1);
  }
}

initializeCredentials();
