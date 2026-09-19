import * as XLSX from 'xlsx';

export function parseSpreadsheetFile(base64, name) {
  if (!/\.(csv|xlsx|xls)$/i.test(name || '')) {
    throw new Error('Choose an Excel (.xlsx or .xls) or CSV file.');
  }
  const workbook = XLSX.read(base64, { type: 'base64', cellDates: false });
  const sheets = workbook.SheetNames.map((title) => ({
    title,
    rows: XLSX.utils.sheet_to_json(workbook.Sheets[title], { header: 1, raw: false, defval: '', blankrows: false }),
  })).filter((sheet) => sheet.rows.length > 1);
  if (!sheets.length) throw new Error('This file has no seller rows. Include column headings and at least one seller.');
  if (sheets.length > 1) throw new Error('Choose a file with one populated worksheet, or export the worksheet you need as CSV.');
  return sheets[0].rows;
}
