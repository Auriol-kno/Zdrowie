// Warstwa IndexedDB (bez zewnętrznych bibliotek) + adapter pamięciowy do testów.

export interface Storage {
  get<T>(store: string, key: string): Promise<T | undefined>;
  put<T>(store: string, value: T, key?: string): Promise<void>;
  getAll<T>(store: string): Promise<T[]>;
  del(store: string, key: string): Promise<void>;
  clear(store: string): Promise<void>;
}

export const STORES = ['kv', 'plans', 'sessions', 'measurements'] as const;
const DB_VERSION = 1;

/** Liczba profili. Profil 1 używa dotychczasowej bazy „formplus”, kolejne — osobnych baz. */
export const PROFILE_SLOTS = 3;
export const slotDbName = (slot: number) => (slot === 0 ? 'formplus' : `formplus-${slot + 1}`);

const dbPromises = new Map<string, Promise<IDBDatabase>>();

function open(name: string): Promise<IDBDatabase> {
  const cached = dbPromises.get(name);
  if (cached) return cached;
  const p = new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(name, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv');
      if (!db.objectStoreNames.contains('plans')) db.createObjectStore('plans', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('sessions')) {
        const s = db.createObjectStore('sessions', { keyPath: 'id' });
        s.createIndex('date', 'date');
      }
      if (!db.objectStoreNames.contains('measurements')) db.createObjectStore('measurements', { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  dbPromises.set(name, p);
  return p;
}

function wrap<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((res, rej) => {
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}

export function makeIdbStorage(name: string): Storage {
  const tx = async (store: string, mode: IDBTransactionMode) => (await open(name)).transaction(store, mode).objectStore(store);
  return {
    async get<T>(store: string, key: string) {
      return (await wrap((await tx(store, 'readonly')).get(key))) as T | undefined;
    },
    async put<T>(store: string, value: T, key?: string) {
      const s = await tx(store, 'readwrite');
      await wrap(key !== undefined ? s.put(value, key) : s.put(value));
    },
    async getAll<T>(store: string) {
      return (await wrap((await tx(store, 'readonly')).getAll())) as T[];
    },
    async del(store: string, key: string) {
      await wrap((await tx(store, 'readwrite')).delete(key));
    },
    async clear(store: string) {
      await wrap((await tx(store, 'readwrite')).clear());
    },
  };
}

export const idbStorage: Storage = makeIdbStorage(slotDbName(0));

/** Adapter w pamięci — do testów jednostkowych logiki trwałości. */
export function memoryStorage(): Storage {
  const data: Record<string, Map<string, unknown>> = {};
  const keyPaths: Record<string, string | null> = { kv: null, plans: 'id', sessions: 'id', measurements: 'id' };
  const m = (s: string) => (data[s] ??= new Map());
  return {
    async get<T>(store: string, key: string) { return m(store).get(key) as T | undefined; },
    async put<T>(store: string, value: T, key?: string) {
      const kp = keyPaths[store];
      const k = key ?? (kp ? String((value as Record<string, unknown>)[kp]) : '');
      m(store).set(k, structuredClone(value));
    },
    async getAll<T>(store: string) { return [...m(store).values()] as T[]; },
    async del(store: string, key: string) { m(store).delete(key); },
    async clear(store: string) { m(store).clear(); },
  };
}

let current: Storage = typeof indexedDB !== 'undefined' ? idbStorage : memoryStorage();
let slot = 0;
const memSlots: Storage[] = [];
export const getStorage = () => current;
export const setStorage = (s: Storage) => { current = s; };
export const getSlot = () => slot;
/** Magazyn wskazanego profilu (bez przełączania aktywnego). */
export function storageForSlot(n: number): Storage {
  if (n === slot) return current;
  if (typeof indexedDB === 'undefined') return (memSlots[n] ??= memoryStorage());
  return n === 0 ? idbStorage : makeIdbStorage(slotDbName(n));
}
/** Przełącza aktywny profil (magazyn danych). */
export function selectSlot(n: number) {
  if (n < 0 || n >= PROFILE_SLOTS) throw new Error('Nieprawidłowy profil');
  if (typeof indexedDB === 'undefined') { memSlots[slot] = current; current = (memSlots[n] ??= memoryStorage()); }
  else current = n === 0 ? idbStorage : makeIdbStorage(slotDbName(n));
  slot = n;
}

export async function deleteAllData(): Promise<void> {
  for (const s of STORES) await current.clear(s);
}
