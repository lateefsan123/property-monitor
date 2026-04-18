import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "../../config";

export async function extractTableFromImageUris(uris) {
  if (!uris?.length) {
    throw new Error("Select at least one screenshot.");
  }

  const images = await Promise.all(
    uris.map(async (uri) => {
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      return `data:image/jpeg;base64,${base64}`;
    }),
  );

  const response = await fetch(`${SUPABASE_URL}/functions/v1/image-to-sheet`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ images }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Extraction failed (${response.status}): ${text.slice(0, 200)}`);
  }

  const { headers, rows, error } = await response.json();
  if (error) throw new Error(error);
  if (!headers?.length) throw new Error("No table detected in the screenshots.");

  return { headers, rows: rows || [] };
}

export async function shareAsXlsx({ headers, rows }, { filename = "extracted", sheetName = "Sheet1" } = {}) {
  const XLSX = await import("xlsx");
  const aoa = [headers, ...rows];
  const worksheet = XLSX.utils.aoa_to_sheet(aoa);

  worksheet["!cols"] = headers.map((_, colIdx) => {
    const maxLen = rows.reduce(
      (m, r) => Math.max(m, String(r?.[colIdx] ?? "").length),
      String(headers[colIdx] ?? "").length,
    );
    return { wch: Math.min(Math.max(maxLen + 2, 10), 40) };
  });

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, (sheetName || "Sheet1").slice(0, 31));

  const b64 = XLSX.write(workbook, { type: "base64", bookType: "xlsx" });
  const safeName = filename?.endsWith(".xlsx") ? filename : `${filename || "extracted"}.xlsx`;
  const path = `${FileSystem.cacheDirectory}${safeName}`;
  await FileSystem.writeAsStringAsync(path, b64, { encoding: FileSystem.EncodingType.Base64 });

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("Sharing is not available on this device.");
  }

  await Sharing.shareAsync(path, {
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    dialogTitle: "Share spreadsheet",
    UTI: "com.microsoft.excel.xlsx",
  });
}
