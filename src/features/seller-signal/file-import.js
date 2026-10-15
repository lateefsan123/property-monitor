import * as XLSX from "xlsx";
import { UserFacingError } from '../../../shared/user-facing-errors.js';

export async function readSpreadsheetWorksheets(file) {
  if (!/\.(xlsx|xls|csv)$/i.test(file?.name || "")) throw new UserFacingError("Choose an Excel (.xlsx or .xls) or CSV file.");
  if (file.size > 10 * 1024 * 1024) throw new UserFacingError("Choose a file smaller than 10 MB.");
  let workbook;
  try { workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: false, raw: true }); }
  catch { throw new UserFacingError("We couldn’t read this file. Export a fresh Excel or CSV copy and try again."); }
  const sheets = workbook.SheetNames.map(name => {
    const sheet = workbook.Sheets[name];
    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
    if (range.e.r > 60040 || range.e.c >= 100) throw new UserFacingError("Import up to 60,000 sellers and 100 columns at once. Remove unused rows and columns or split this file.");
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: "", blankrows: true, range: 0 });
    for (let r = 0; r < rows.length; r += 1) {
      for (let c = 0; c < rows[r].length; c += 1) {
        const cell = sheet[XLSX.utils.encode_cell({ r, c })];
        if (cell?.t === 'n' && /e[+-]\d+/i.test(String(rows[r][c]))) rows[r][c] = String(cell.v);
      }
    }
    return { name, rows };
  }).filter(({ rows }) => rows.filter(row => row.some(cell => String(cell ?? '').trim())).length > 1);
  if (!sheets.length) throw new UserFacingError("Include column headings and at least one seller.");
  return sheets;
}

export async function parseSpreadsheetFile(file) {
  const sheets = await readSpreadsheetWorksheets(file);
  if (sheets.length > 1) throw new UserFacingError("Choose a file with one populated worksheet, or export the worksheet you need as CSV.");
  return sheets[0].rows;
}
