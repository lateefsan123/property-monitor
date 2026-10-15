const FIELDS = ['name', 'phone', 'building', 'unit', 'bedroom', 'status', 'last_contact'];

export function rejectedRowsCsv(rows) {
  const cell = value => {
    let text = String(value ?? '');
    // Export untrusted cell values as text, never spreadsheet formulas.
    if (/^[\s]*[=+@-]/.test(text)) text = `'${text}`;
    return `"${text.replaceAll('"', '""')}"`;
  };
  return '\uFEFF' + [FIELDS, ...rows.map(row => FIELDS.map(field => row[field]))].map(row => row.map(cell).join(',')).join('\r\n');
}

export function downloadRejectedRows(rows) {
  const url = URL.createObjectURL(new Blob([rejectedRowsCsv(rows)], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url; link.download = 'sellers-to-check.csv'; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
