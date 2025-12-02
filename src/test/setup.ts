import '@testing-library/jest-dom';
import 'fake-indexeddb/auto';

// Reset IndexedDB between tests
beforeEach(async () => {
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
});
