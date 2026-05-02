import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: 'gateway05.us-east-1.prod.aws.tidbcloud.com',
  user: '3vEgeGHWz6yFd3X.root',
  password: '6L2iB6HP616QOcfyUnaD',
  database: 'GArd6gSmf3RbAbT5WtHac3',
  port: 4000,
  ssl: { rejectUnauthorized: false },
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

async function deleteOldReservations() {
  const connection = await pool.getConnection();
  try {
    const [result] = await connection.execute(
      'DELETE FROM reservations WHERE event_type = ? AND number_of_people = ?',
      ['General Event', 1]
    );
    console.log(`Deleted ${result.affectedRows} old default reservations`);
  } catch (error) {
    console.error('Error deleting reservations:', error.message);
  } finally {
    connection.release();
    await pool.end();
  }
}

deleteOldReservations();
