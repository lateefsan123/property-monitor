import { normalizeToken } from "./spreadsheet";

export function cleanBuildingName(raw) {
  let name = String(raw || "").trim();

  const apartmentMatch = name.match(/^(?:\[.*?\]\s*)?Apartment\s+[\w-]+(?:\s*\(.*?\))?\s*,\s*(.+)/i);
  if (apartmentMatch) {
    const parts = apartmentMatch[1].split(",").map((part) => part.trim());
    name = parts[0] || name;
  }

  name = name
    .replace(/\b(one|two|three|four|five|1|2|3|4|5)\s*[-\s]?\s*bed(room)?s?\b/gi, "")
    .replace(/\bstudio\b/gi, "")
    .replace(/\b\d+\s*bhk\b/gi, "")
    .replace(/\b\d+\s*br\b/gi, "")
    .replace(/\((?:NOT\s+)?LIVE\)/gi, "")
    .replace(/\(FSA[^)]*\)/gi, "")
    .replace(/\(Not\s+Live\)/gi, "")
    .replace(/\(NOT\s+ON\s+PF\)/gi, "")
    .replace(/\[OFFLINE\]/gi, "")
    .replace(/\[NOT\s+LIVE\]/gi, "")
    .replace(/^(?:Villa|Unit)\s+[\w-]+\s*,?\s*/i, "")
    .replace(/[,\-/]+$/, "")
    .replace(/\s+/g, " ")
    .trim();

  return name || String(raw || "").trim();
}

function expandBoulevard(value) {
  return String(value || "").replace(/\bblvd\b\.?/gi, "Boulevard");
}

function compressBoulevard(value) {
  return String(value || "").replace(/\bboulevard\b/gi, "Blvd");
}

function toggleLeadingArticle(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return [];
  if (/^the\s+/i.test(trimmed)) {
    return [trimmed.replace(/^the\s+/i, "").trim()];
  }
  return [`The ${trimmed}`];
}

function expandTowerVariant(value) {
  const trimmed = String(value || "").trim();
  const match = trimmed.match(/^(.*?)(?:\s+Tower|\s*T)?\s*([A-Z]|\d+)$/i);
  if (!match) return [];
  const base = match[1].trim();
  const suffix = match[2].trim();
  if (!base || !suffix) return [];
  return [`${base} ${suffix}`, `${base} T${suffix}`, `${base} Tower ${suffix}`];
}

function toggleResidencePlurality(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return [];
  const variants = [];
  if (/\bresidences\b/i.test(trimmed)) variants.push(trimmed.replace(/\bresidences\b/gi, "Residence"));
  if (/\bresidence\b/i.test(trimmed)) variants.push(trimmed.replace(/\bresidence\b/gi, "Residences"));
  return variants;
}

export function formatBuildingLabel(raw) {
  if (!raw) return "";
  const cleaned = cleanBuildingName(raw);
  if (!cleaned) return "";
  return expandBoulevard(cleaned);
}

export function getBuildingKeyVariants(raw) {
  const cleaned = cleanBuildingName(raw);
  if (!cleaned) return [];

  const numberMap = {
    one: "1",
    two: "2",
    three: "3",
    four: "4",
    five: "5",
    six: "6",
    seven: "7",
    eight: "8",
    nine: "9",
    ten: "10",
  };

  const replaceNumberWords = (value) => {
    let next = String(value || "");
    for (const [word, digit] of Object.entries(numberMap)) {
      next = next.replace(new RegExp(`\\b${word}\\b`, "gi"), digit);
    }
    return next;
  };

  const variants = new Set();
  const addVariant = (value) => {
    const normalized = normalizeToken(value);
    if (normalized) variants.add(normalized);
  };

  const rawVariants = new Set([cleaned]);
  const queue = [cleaned];
  while (queue.length) {
    const current = queue.shift();
    for (const next of [
      replaceNumberWords(current),
      expandBoulevard(current),
      compressBoulevard(current),
      ...toggleLeadingArticle(current),
      ...expandTowerVariant(current),
      ...toggleResidencePlurality(current),
    ]) {
      const trimmed = String(next || "").trim();
      if (!trimmed || rawVariants.has(trimmed)) continue;
      rawVariants.add(trimmed);
      queue.push(trimmed);
    }
  }

  for (const value of rawVariants) addVariant(value);
  return [...variants].filter(Boolean);
}
