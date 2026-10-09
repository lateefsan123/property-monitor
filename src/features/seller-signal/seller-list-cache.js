// The seller list saved on this device (IndexedDB), so the Sellers and
// Spreadsheets pages open instantly on later visits while fresh data loads.
// One entry per account; everything is wiped on sign-out. Every failure is
// ignored: without the cache the pages simply load from the server as before.
const DB_NAME = "repeat-seller-cache";
const STORE = "lists";
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function openDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") { reject(new Error("No IndexedDB")); return; }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function run(mode, action) {
  const db = await openDb();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE, mode);
      const request = action(transaction.objectStore(STORE));
      transaction.oncomplete = () => resolve(request?.result);
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally {
    db.close();
  }
}

export async function saveSellerList(userId, leadRows, sentLeadRows) {
  if (!userId) return;
  try {
    await run("readwrite", (store) => store.put({ savedAt: Date.now(), leadRows, sentLeadRows }, userId));
  } catch { /* Not cached on this device; the next visit loads from the server. */ }
}

export async function readSellerList(userId) {
  if (!userId) return null;
  try {
    const entry = await run("readonly", (store) => store.get(userId));
    if (!entry || !Array.isArray(entry.leadRows) || Date.now() - entry.savedAt > MAX_AGE_MS) return null;
    return entry;
  } catch {
    return null;
  }
}

export async function clearSellerLists() {
  try {
    await run("readwrite", (store) => store.clear());
  } catch { /* Nothing saved. */ }
}
