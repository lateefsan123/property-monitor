const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error(`Could not read ${file.name}`));
    reader.readAsDataURL(file);
  });
}

async function compressImage(file) {
  if (file.size <= MAX_IMAGE_BYTES) {
    return readFileAsDataUrl(file);
  }

  const bitmap = await createImageBitmap(file);
  const maxDim = 2000;
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();

  return canvas.toDataURL("image/jpeg", 0.85);
}

export async function extractTableFromImages(files) {
  if (!files?.length) {
    throw new Error("Select at least one screenshot.");
  }

  const images = await Promise.all(Array.from(files).map(compressImage));

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

export async function downloadAsXlsx({ headers, rows }, { filename = "extracted", sheetName = "Sheet1" } = {}) {
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

  const safeName = filename?.endsWith(".xlsx") ? filename : `${filename || "extracted"}.xlsx`;
  XLSX.writeFile(workbook, safeName);
}
