export const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;
export const PAGE_SIZE = 10;
export const HEADER_SCAN_LIMIT = 40;
export const IMPORT_SAMPLE_ROW_LIMIT = 6;
export const IMPORT_BATCH_SIZE = 200;
export const RECENT_TRANSACTIONS_LIMIT = 2;
export const WHATSAPP_OPEN_DELAY_MS = 600;
export const TEMPLATE_CSV_HEADERS = "Name,Building,Phone,Unit,Bedroom,Status,Last Contact\n";
export const MIN_NEW_TRANSACTIONS_TO_REACTIVATE = 2;

export const STATUS_RULES = [
  { id: "prospect", label: "Prospect", days: 75, keywords: ["prospect"] },
  { id: "market_appraisal", label: "Market Appraisal", days: 25, keywords: ["market appraisal", "appraisal", "valuation"] },
  { id: "for_sale_available", label: "For Sale Available", days: 5, keywords: ["for sale available", "for sale", "available"] },
];

export const COLUMN_ALIASES = {
  name: ["name", "seller", "seller name", "owner", "owner name", "client", "lead name", "full name"],
  building: ["building", "tower", "project", "community", "building name", "tower name"],
  bedroom: ["bedroom", "bedrooms", "beds", "bed", "unit type", "bhk"],
  status: ["status", "stage", "category", "lead status", "pipeline", "contact status"],
  lastContact: ["last contact", "last contact date", "contact date", "last followup", "last follow up", "last message", "last contacted", "date"],
  phone: ["phone", "number", "mobile", "whatsapp", "whatsapp number", "contact number", "phone number"],
  unit: ["unit", "unit number", "apartment", "apt", "flat", "property number", "room"],
};

export const STATUS_FILTER_OPTIONS = [
  { id: "all", label: "All" },
  { id: "prospect", label: "Prospect" },
  { id: "market_appraisal", label: "Appraisal" },
  { id: "for_sale_available", label: "For Sale" },
];

export const DATA_FILTER_OPTIONS = [
  { id: "all", label: "All" },
  { id: "with_data", label: "Has Data" },
  { id: "no_data", label: "No Data" },
];

export const VIEW_TAB_OPTIONS = [
  { id: "active", label: "Active" },
  { id: "done", label: "Done" },
];
