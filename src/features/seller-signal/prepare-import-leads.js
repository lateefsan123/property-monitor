import { createLeadInsertRecord } from './lead-utils.js';

export async function prepareImportLeads(records, mapping, userId, options) {
  const leads = [];
  for (let offset = 0; offset < records.length; offset += 250) {
    // Allow progress, keyboard input and rendering between CPU-heavy chunks.
    await new Promise(resolve => setTimeout(resolve, 0));
    for (const record of records.slice(offset, offset + 250)) {
      const lead = createLeadInsertRecord(record, mapping, userId, options);
      if (lead) leads.push(lead);
    }
  }
  return leads;
}
