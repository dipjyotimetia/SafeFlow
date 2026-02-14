import '@testing-library/jest-dom';
import 'fake-indexeddb/auto';
import { db } from '@/lib/db';

// Reset IndexedDB between tests
beforeEach(async () => {
  // Close Dexie connection before deleting databases to avoid contention warnings
  try {
    db.close();
  } catch {
    // Ignore close errors in test cleanup
  }

  // Clear all databases
  const databases = await indexedDB.databases();
  await Promise.all(
    databases.map((db) =>
      db.name ? new Promise<void>((resolve) => {
        const req = indexedDB.deleteDatabase(db.name!);
        req.onsuccess = () => resolve();
        req.onerror = () => resolve();
      }) : Promise.resolve()
    )
  );

  // Re-open Dexie connection for tests that use the shared instance
  await db.open();
});
