import mysql from 'mysql2/promise';

const connection = await mysql.createConnection({
  host: process.env.DATABASE_URL?.split('@')[1]?.split(':')[0] || 'localhost',
  user: process.env.DATABASE_URL?.split('//')[1]?.split(':')[0] || 'root',
  password: process.env.DATABASE_URL?.split(':')[2]?.split('@')[0] || '',
  database: process.env.DATABASE_URL?.split('/').pop() || 'barrel_delivery',
});

const [items] = await connection.execute('SELECT * FROM order_items WHERE order_id = 30065');
console.log('Order #30065 items:', items);

const [order] = await connection.execute('SELECT * FROM orders WHERE id = 30065');
console.log('Order #30065:', order);

connection.end();
