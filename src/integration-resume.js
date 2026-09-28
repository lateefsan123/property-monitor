// Remembers, in this tab only, that a spreadsheet import was waiting on a
// Google/Microsoft connection, so the OAuth callback can send the user back
// to Spreadsheets with the picker open. Only a provider name is stored and
// the return path is fixed: never a caller-supplied URL.
const KEY = "repeat:resume-spreadsheet-import";
const PROVIDERS = new Set(["google", "microsoft"]);

export const SPREADSHEET_IMPORT_RETURN_PATH = "/#/spreadsheets";

export function rememberSpreadsheetImport(provider) {
  if (!PROVIDERS.has(provider)) return;
  try { sessionStorage.setItem(KEY, provider); } catch { /* Resume is a convenience only. */ }
}

export function peekSpreadsheetImport() {
  try {
    const provider = sessionStorage.getItem(KEY);
    return PROVIDERS.has(provider) ? provider : null;
  } catch {
    return null;
  }
}

export function takeSpreadsheetImport() {
  const provider = peekSpreadsheetImport();
  try { sessionStorage.removeItem(KEY); } catch { /* Nothing to clear. */ }
  return provider;
}
