import { UserFacingError } from '../../../shared/user-facing-errors.js';

// Spreadsheet decoding is CPU-heavy; keep it off the UI thread.
export function readImportFile(file) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./file-import-worker.js', import.meta.url), { type: 'module' });
    const timeout = setTimeout(() => finish(new UserFacingError('This file took too long to read. Export a fresh copy or split it into smaller files.')), 60000);
    function finish(error, sheets) {
      clearTimeout(timeout); worker.terminate();
      if (error) reject(error); else resolve(sheets);
    }
    worker.onmessage = ({ data }) => finish(data.error ? new UserFacingError(data.error) : null, data.sheets);
    worker.onerror = () => finish(new UserFacingError('We couldn’t read this file. Refresh the page and try again.'));
    worker.postMessage(file);
  });
}
