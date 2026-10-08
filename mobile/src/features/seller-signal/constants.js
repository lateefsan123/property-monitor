export const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;
export const PAGE_SIZE = 10;
export const HEADER_SCAN_LIMIT = 40;
export const IMPORT_SAMPLE_ROW_LIMIT = 6;
export const IMPORT_BATCH_SIZE = 200;
export const ENRICH_CHUNK_SIZE = 10;
export const RECENT_TRANSACTIONS_LIMIT = 2;
export const WHATSAPP_OPEN_DELAY_MS = 600;
export const MIN_NEW_TRANSACTIONS_TO_REACTIVATE = 2;

// The same live lists as web: loading sellers adds the account's own statuses
// (src/features/seller-signal/status-registry.js).
export { STATUS_RULES, STATUS_FILTER_OPTIONS } from "../../../../src/features/seller-signal/constants.js";

export const COLUMN_ALIASES = {
  name: ["name", "seller", "seller name", "owner", "owner name", "ownernameen", "client", "lead name", "full name"],
  building: ["building", "tower", "project", "community / sub-community", "sub community", "subcommunity", "community", "building name", "tower name"],
  bedroom: ["bedroom", "bedrooms", "beds", "bed", "rooms", "unit type", "bhk"],
  status: ["status", "stage", "category", "lead status", "pipeline", "contact status"],
  lastContact: ["last contact", "last contact date", "contact date", "last followup", "last follow up", "last message", "last contacted", "date"],
  phone: ["phone", "number", "mobile", "whatsapp", "whatsapp number", "contact number", "phone number", "owner contact"],
  unit: ["unit", "unit number", "unit no", "unitno", "apartment", "apt", "flat", "property number", "room", "villa no", "villa number", "plot", "plot no", "plot number"],
};

export const DATA_FILTER_OPTIONS = [
  { id: "with_data", label: "Market Data" },
  { id: "no_data", label: "No Market Data" },
];

export const VIEW_TAB_OPTIONS = [
  { id: "active", label: "Active" },
  { id: "done", label: "Done" },
];
