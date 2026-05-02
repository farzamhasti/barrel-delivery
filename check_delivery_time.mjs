import { db } from './server/db.ts';
import { orders } from './drizzle/schema.ts';
import { eq } from 'drizzle-orm';

const result = await db.select({
  id: orders.id,
  deliveryTime: orders.deliveryTime,
  hasDeliveryTime: orders.hasDeliveryTime,
}).from(orders).where(eq(orders.id, 300199));

console.log('Order 300199:', result);
