export const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;
export const PAGE_SIZE = 10;
export const HEADER_SCAN_LIMIT = 40;
export const IMPORT_SAMPLE_ROW_LIMIT = 6;
export const IMPORT_BATCH_SIZE = 200;
export const RECENT_TRANSACTIONS_LIMIT = 2;
export const WHATSAPP_OPEN_DELAY_MS = 600;
// Follow-up interval for leads whose status has no cadence rule of its own.
export const DEFAULT_CADENCE_DAYS = 75;
// Past this, "Overdue Nd" counts are noise (stale imported dates) — show "Due"
// and treat leads as equally overdue when ordering the queue.
export const MAX_MEANINGFUL_OVERDUE_DAYS = 90;

export const STATUS_RULES = [
  { id: "not_interested", label: "Not Interested", days: 0, keywords: ["not interested", "ni", "cold"] },
  { id: "prospect", label: "Prospect", days: 75, keywords: ["prospect"] },
  { id: "market_appraisal", label: "Market Appraisal", days: 25, keywords: ["market appraisal", "appraisal", "valuation"] },
  { id: "for_sale_available", label: "For Sale Available", days: 5, keywords: ["for sale available", "for sale", "available"] },
];

export const COLUMN_ALIASES = {
  name: ["name", "seller", "seller name", "owner", "owner name", "ownernameen", "client", "lead name", "full name"],
  building: ["building name", "tower name", "building", "tower", "project", "sub community", "subcommunity", "community"],
  bedroom: ["bedroom", "bedrooms", "beds", "bed", "rooms", "unit type", "bhk"],
  status: ["status", "stage", "category", "lead status", "pipeline", "contact status"],
  lastContact: ["last contact", "last contact date", "contact date", "last followup", "last follow up", "last message", "last contacted", "date"],
  phone: ["phone", "number", "mobile", "whatsapp", "whatsapp number", "contact number", "phone number", "owner contact"],
  unit: ["unit", "unit number", "unit no", "unitno", "apartment", "apt", "flat", "property number", "room"],
};

export const STATUS_FILTER_OPTIONS = [
  { id: "not_interested", label: "Not Interested" },
  { id: "prospect", label: "Prospect" },
  { id: "market_appraisal", label: "Appraisal" },
  { id: "for_sale_available", label: "For Sale" },
];

export const DATA_FILTER_OPTIONS = [
  { id: "all", label: "All Data" },
  { id: "with_data", label: "Has Market Data" },
  { id: "no_data", label: "No Market Data" },
];

export const DATA_QUALITY_FILTER_OPTIONS = [
  { id: "all", label: "All Data Quality" },
  { id: "trusted", label: "Complete" },
  { id: "partial", label: "Missing Info" },
  { id: "review", label: "Needs Review" },
];

// Tab ids keep their historical names ("active"/"done") so saved views and
// stored filters keep working; the semantics are cadence-based now.
export const VIEW_TAB_OPTIONS = [
  { id: "active", label: "Due today" },
  { id: "done", label: "Scheduled" },
];
