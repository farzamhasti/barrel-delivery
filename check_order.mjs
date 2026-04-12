import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection);

// Check order 30059 items
const result = await connection.query('SELECT * FROM order_items WHERE order_id = 30059');
console.log('Order 30059 items:', result[0]);

await connection.end();
