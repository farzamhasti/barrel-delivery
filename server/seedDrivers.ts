import { getDb } from './db';
import { drivers } from '../drizzle/schema';

export async function seedTestDrivers() {
  const db = await getDb();
  if (!db) {
    console.error('Failed to get database connection');
    return { success: false, error: 'Database connection failed' };
  }

  try {
    const testDrivers = [
      { name: 'Farzam Hasti', licenseNumber: 'FH123456', status: 'offline' as const, isActive: true },
      { name: 'John Driver', licenseNumber: 'D1234567', status: 'offline' as const, isActive: true },
      { name: 'Jane Smith', licenseNumber: 'D7654321', status: 'offline' as const, isActive: true },
      { name: 'Mike Johnson', licenseNumber: 'D1111111', status: 'offline' as const, isActive: true },
      { name: 'Sarah Williams', licenseNumber: 'D2222222', status: 'offline' as const, isActive: true },
    ];

    const results = [];
    for (const driver of testDrivers) {
      try {
        const result = await db.insert(drivers).values({
          name: driver.name,
          licenseNumber: driver.licenseNumber,
          status: driver.status,
          isActive: driver.isActive,
        });
        results.push({ name: driver.name, success: true });
      } catch (error: any) {
        // Driver might already exist, that's ok
        if (error.code === 'ER_DUP_ENTRY') {
          results.push({ name: driver.name, success: true, message: 'Already exists' });
        } else {
          results.push({ name: driver.name, success: false, error: error.message });
        }
      }
    }

    return { success: true, drivers: results };
  } catch (error: any) {
    console.error('Error seeding drivers:', error);
    return { success: false, error: error.message };
  }
}
