import type { WaveRecord } from './track';

const DB_NAME = 'peard-waveflow';
const STORE = 'waves';
/** Oldest waveforms are dropped beyond this (~80 KB each for a 4-minute song). */
const MAX_TRACKS = 800;

let dbPromise: Promise<IDBDatabase> | null = null;

const openDb = () =>
  (dbPromise ??= new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const store = req.result.createObjectStore(STORE, { keyPath: 'id' });
      store.createIndex('updated', 'updated');
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => {
      dbPromise = null;
      reject(req.error ?? new Error('indexedDB.open failed'));
    };
  }));

const done = (tx: IDBTransaction) =>
  new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('transaction failed'));
    tx.onabort = () => reject(tx.error ?? new Error('transaction aborted'));
  });

export const loadWave = async (id: string): Promise<WaveRecord | null> => {
  try {
    const db = await openDb();
    return await new Promise<WaveRecord | null>((resolve, reject) => {
      const req = db
        .transaction(STORE, 'readonly')
        .objectStore(STORE)
        .get(id) as IDBRequest<WaveRecord | undefined>;
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => reject(req.error ?? new Error('get failed'));
    });
  } catch (err) {
    console.warn('[waveflow] could not read the waveform cache', err);
    return null;
  }
};

let writes = 0;

export const saveWave = async (record: WaveRecord) => {
  try {
    const db = await openDb();
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(record);
    await done(tx);
    if (writes++ % 25 === 0) await prune(db);
  } catch (err) {
    console.warn('[waveflow] could not save the waveform', err);
  }
};

const prune = (db: IDBDatabase) => {
  const tx = db.transaction(STORE, 'readwrite');
  const store = tx.objectStore(STORE);
  const countReq = store.count();
  countReq.onsuccess = () => {
    let excess = countReq.result - MAX_TRACKS;
    if (excess <= 0) return;
    const cursorReq = store.index('updated').openCursor(); // oldest first
    cursorReq.onsuccess = () => {
      const cursor = cursorReq.result;
      if (!cursor || excess <= 0) return;
      cursor.delete();
      excess--;
      cursor.continue();
    };
  };
  return done(tx);
};

export const clearWaves = async () => {
  try {
    const db = await openDb();
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).clear();
    await done(tx);
  } catch (err) {
    console.warn('[waveflow] could not clear the waveform cache', err);
  }
};
