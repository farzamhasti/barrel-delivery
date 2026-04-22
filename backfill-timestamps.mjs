import { getDb } from './server/db.ts';

async function backfillTimestamps() {
  const db = await getDb();
  if (!db) {
    console.error('✗ Failed to connect to database');
    process.exit(1);
  }

  try {
    console.log('Starting timestamp backfill...');
    
    // For delivered orders without timestamps, set:
    // - pickedUpAt: createdAt + 2 minutes (time to prepare)
    // - deliveredAt: createdAt + 17 minutes (2 min prep + 15 min delivery)
    
    const updateStatement = `
      UPDATE orders 
      SET 
        picked_up_at = DATE_ADD(createdAt, INTERVAL 2 MINUTE),
        delivered_at = DATE_ADD(createdAt, INTERVAL 17 MINUTE)
      WHERE status = 'Delivered' 
        AND picked_up_at IS NULL 
        AND delivered_at IS NULL
    `;
    
    await db.execute(updateStatement);
    console.log('✓ Backfill complete - set timestamps for delivered orders');
    
    // Verify the backfill
    const result = await db.execute(`
      SELECT COUNT(*) as count FROM orders 
      WHERE status = 'Delivered' 
        AND picked_up_at IS NOT NULL 
        AND delivered_at IS NOT NULL
    `);
    
    console.log(`✓ Verified: ${result[0][0].count} delivered orders now have timestamps`);
    process.exit(0);
  } catch (error) {
    console.error('✗ Backfill failed:', error.message);
    process.exit(1);
  }
}

backfillTimestamps();
