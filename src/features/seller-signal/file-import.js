export async function parseSpreadsheetFile(file) {
  if (!/\.(xlsx|xls|csv)$/i.test(file?.name || "")) throw new Error("Choose an Excel (.xlsx or .xls) or CSV file.");
  if (file.size > 10 * 1024 * 1024) throw new Error("Choose a file smaller than 10 MB.");
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: false });
  const sheets = workbook.SheetNames.map((name) => XLSX.utils.sheet_to_json(workbook.Sheets[name], {
    header: 1, raw: false, defval: "", blankrows: false,
  })).filter((rows) => rows.length > 1);
  if (!sheets.length) throw new Error("Include column headings and at least one seller.");
  if (sheets.length > 1) throw new Error("Choose a file with one populated worksheet, or export the worksheet you need as CSV.");
  return sheets[0];
}
