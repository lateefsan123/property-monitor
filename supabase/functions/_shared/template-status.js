// Message templates can be assigned to seller statuses. A send uses the
// template for the seller's status and falls back to the default template.
// Shared by the web app, the mobile app and the automated WhatsApp sender.

export const TEMPLATE_STATUSES = [
  { id: "none", label: "No status" },
  { id: "prospect", label: "Prospect" },
  { id: "market_appraisal", label: "Appraisal" },
  { id: "for_sale_available", label: "For Sale" },
];

// Same keywords and order as STATUS_RULES in the web and mobile constants, so a
// template follows the status the seller's pill shows.
export const TEMPLATE_STATUS_KEYWORDS = [
  ["not_interested", ["not interested", "ni", "cold"]],
  ["prospect", ["prospect"]],
  ["market_appraisal", ["market appraisal", "appraisal", "valuation"]],
  ["for_sale_available", ["for sale available", "for sale", "available"]],
];

function token(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

// "none" for a seller without a status, the matching status id, or null for a
// status no template can be assigned to.
export function templateStatusId(rawStatus) {
  const normalized = token(rawStatus);
  if (!normalized) return "none";
  for (const [id, keywords] of TEMPLATE_STATUS_KEYWORDS) {
    if (keywords.some((keyword) => normalized.includes(token(keyword)))) return id;
  }
  return null;
}

export function cleanTemplateStatuses(statuses) {
  const ids = Array.isArray(statuses) ? statuses : [];
  return TEMPLATE_STATUSES.map((status) => status.id).filter((id) => ids.includes(id));
}

export function templateStatusLabels(statuses) {
  const ids = cleanTemplateStatuses(statuses);
  return TEMPLATE_STATUSES.filter((status) => ids.includes(status.id)).map((status) => status.label);
}

// The template assigned to this seller's status, else the default template,
// else null (callers then use the built-in message).
export function pickTemplateForStatus(templates, rawStatus) {
  const list = Array.isArray(templates) ? templates.filter(Boolean) : [];
  const id = templateStatusId(rawStatus);
  const matches = id ? list.filter((template) => cleanTemplateStatuses(template.statuses).includes(id)) : [];
  if (matches.length) {
    return matches.reduce((newest, template) =>
      String(template.updated_at || "") > String(newest.updated_at || "") ? template : newest);
  }
  return list.find((template) => template.is_default) || null;
}

// Template settings may be a value or a per-seller function of the seller.
export function resolveForLead(value, lead) {
  return typeof value === "function" ? value(lead) : value;
}
