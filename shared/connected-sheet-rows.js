// Reads every row of a connected worksheet. Google sheets come back 2,000 rows
// at a time (server/integration-sheet-import.js); this asks for each next
// chunk until the sheet is done. Shared by web and mobile.
export async function readConnectedSheetRows(integrationRequest, { provider, file, sheetName, userId, onProgress }) {
  const input = { operation: "rows", fileId: file.id, ...(file.driveId ? { driveId: file.driveId } : {}), sheetName };
  const rows = [];
  let start = null;
  for (;;) {
    const result = await integrationRequest({
      action: "read",
      provider,
      feature: "sheets",
      input: start ? { ...input, start } : input,
    }, undefined, userId);
    if (result?.kind !== "sheet-import" || !Array.isArray(result.rows)) throw new Error("Could not read this worksheet. Try again.");
    for (const row of result.rows) rows.push(row);
    if (rows.length > 60041) throw new Error('This worksheet is too large. Split it before importing.');
    if (result.nextStart == null) return rows;
    if (!Number.isInteger(result.nextStart) || result.nextStart <= (start || 1) || result.nextStart > 60041) throw new Error('Could not finish reading this worksheet. Please try again.');
    // Google omits trailing blank rows from a page. Keep their positions so
    // header selection and row numbers still refer to the original sheet.
    while (rows.length < result.nextStart - 1) rows.push([]);
    start = result.nextStart;
    onProgress?.(Math.max(rows.length - 1, 0));
  }
}
