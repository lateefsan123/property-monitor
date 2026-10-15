import { inferMapping, rowsToObjects } from './spreadsheet.js';
import { UserFacingError } from '../../../shared/user-facing-errors.js';

export const IMPORT_FIELDS = [
  ['name', 'Seller name'], ['phone', 'Phone / WhatsApp'], ['building', 'Building / community'],
  ['unit', 'Unit'], ['bedroom', 'Bedrooms'], ['status', 'Status'], ['lastContact', 'Last contacted'],
];

export function prepareImportRows(rawRows, options = {}) {
  if (!Array.isArray(rawRows) || !rawRows.length || rawRows.some(row => !Array.isArray(row))) throw new UserFacingError('This sheet has no readable rows. Choose another sheet.');
  if (rawRows.length > 60041 || rawRows.some(row => row.length > 100)) throw new UserFacingError('Import up to 60,000 sellers and 100 columns at once. Split this sheet before importing.');
  const parsed = rowsToObjects(rawRows, options);
  if (parsed.records.length > 60000) throw new UserFacingError('Import up to 60,000 sellers at once. Split this sheet before importing.');
  return { ...parsed, mapping: inferMapping(parsed.headers) };
}

export function validateImportMapping(headers, mapping) {
  const selected = IMPORT_FIELDS.map(([key]) => mapping?.[key]).filter(Boolean);
  if (selected.some(header => !headers.includes(header))) throw new UserFacingError('The columns changed. Review the column choices again.');
  if (new Set(selected).size !== selected.length) throw new UserFacingError('Choose a different column for each field. A column can only be used once.');
  if (!mapping?.phone && !(mapping?.name && mapping?.building)) throw new UserFacingError('Choose a phone column, or both a seller name and building column, so sellers can be identified.');
}

export function importPreviewStats(records, mapping) {
  let identifiable = 0;
  let withoutPhone = 0;
  let withoutBuilding = 0;
  for (const row of records) {
    if (row[mapping.phone] || (row[mapping.name] && row[mapping.building])) identifiable += 1;
    if (!row[mapping.phone]) withoutPhone += 1;
    if (!row[mapping.building]) withoutBuilding += 1;
  }
  return { total: records.length, identifiable, withoutPhone, withoutBuilding };
}
