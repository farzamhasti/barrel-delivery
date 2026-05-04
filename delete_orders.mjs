import { db } from './server/db.js';

const result = await db.delete(db.orders);
console.log('Orders deleted');
process.exit(0);
