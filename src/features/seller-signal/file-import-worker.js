import { readSpreadsheetWorksheets } from './file-import.js';
import { userFacingError } from '../../../shared/user-facing-errors.js';

globalThis.onmessage = async ({ data: file }) => {
  try { globalThis.postMessage({ sheets: await readSpreadsheetWorksheets(file) }); }
  catch (error) { globalThis.postMessage({ error: userFacingError(error, 'We couldn’t read this file. Export a fresh copy and try again.') }); }
};
