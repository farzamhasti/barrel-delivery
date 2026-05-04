import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  connectionLimit: 1,
  host: process.env.DATABASE_URL?.split('@')[1]?.split('/')[0] || 'localhost',
  user: process.env.DATABASE_URL?.split('://')[1]?.split(':')[0] || 'root',
  password: process.env.DATABASE_URL?.split(':')[1]?.split('@')[0] || '',
  database: process.env.DATABASE_URL?.split('/')[3]?.split('?')[0] || 'barrel',
});

async function checkSubscriptions() {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query('SELECT id, username, dashboardType, endpoint, isActive FROM push_subscriptions LIMIT 10');
    console.log('Push subscriptions:', rows);
    connection.release();
  } catch (error) {
    console.error('Error:', error.message);
  }
  pool.end();
}

checkSubscriptions();
