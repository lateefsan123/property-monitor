import { UserFacingError, userFacingError } from '../../../shared/user-facing-errors.js';

const pause = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const isRowError = error => /^(22|23)/.test(String(error?.code || ''));
const isTransient = error => {
  const status = Number(error?.status);
  if (status >= 400 && status < 500 && status !== 429) return false;
  return !error?.code || status >= 500 || status === 429 || /^(08|53|57)/.test(String(error.code));
};

// Keys are assigned before the first request and reused on every retry/split.
// ON CONFLICT DO NOTHING never overwrites an already saved seller.
export async function saveImportBatches(leads, { write, onProgress, wait = pause, batchSize = 200 }) {
  const rows = leads.map(row => ({ ...row, import_key: row.import_key || globalThis.crypto.randomUUID() }));
  let saved = 0;
  const failedRows = [];
  const progress = () => onProgress?.({ saved, failed: failedRows.length, total: rows.length });
  async function save(batch) {
    let error;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try { ({ error } = await write(batch)); } catch (failure) { error = failure; }
      if (!error) { saved += batch.length; progress(); return; }
      if (!isTransient(error) || attempt === 2) break;
      await wait(800 * (attempt + 1));
    }
    if (!isRowError(error)) {
      const message = `${saved.toLocaleString()} sellers were confirmed saved. We couldn’t finish the import. ${userFacingError(error, 'Please try again shortly.')} Import the same sheet to continue. A recent batch may also have saved; it will be checked on retry.`;
      throw new UserFacingError(message, { cause: error });
    }
    if (batch.length === 1) { failedRows.push(batch[0]); progress(); return; }
    const middle = Math.ceil(batch.length / 2);
    await save(batch.slice(0, middle));
    await save(batch.slice(middle));
  }
  progress();
  for (let offset = 0; offset < rows.length; offset += batchSize) await save(rows.slice(offset, offset + batchSize));
  return { inserted: saved, failed: failedRows.length, failedRows };
}
