import { normalizeToken } from "./spreadsheet";
import { DOWNTOWN_DUBAI_BUILDINGS, DOWNTOWN_DUBAI_BUILDING_ALIASES } from "./building-registry";

const NUMBER_WORDS = {
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
const TRUNCATION_PATTERN = /\u2026|\.{3,}/;
const PARTIAL_TRAILING_DESCRIPTOR_PATTERN = /\s+(?:to|tow|towe)$/i;

function cleanAddressBuildingPart(value) {
  return String(value || "")
    .replace(/[,\-/]+$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function stripTruncationMarker(value) {
  return String(value || "").replace(TRUNCATION_PATTERN, " ");
}

export function parseBuildingAddressValue(raw) {
  const value = String(raw || "").replace(/\s+/g, " ").trim();
  const match = value.match(/^(?:\[[^\]]+\]\s*)?(?:Apartment|Apt|Flat|Unit|Villa)\s+([\w-]+)(?:\s*\([^)]*\))?\s*,\s*(.+)$/i);

  if (!match) {
    return {
      hasAddress: false,
      unit: "",
      buildingName: "",
      hasTruncation: TRUNCATION_PATTERN.test(value),
      buildingHasTruncation: false,
      recoverableTruncation: false,
    };
  }

  const trailingParts = match[2].split(",").map((part) => part.trim()).filter(Boolean);
  const buildingName = cleanAddressBuildingPart(trailingParts[0] || "");
  const buildingHasTruncation = TRUNCATION_PATTERN.test(buildingName);
  const hasTruncation = TRUNCATION_PATTERN.test(value);

  return {
    hasAddress: true,
    unit: match[1] || "",
    buildingName,
    hasTruncation,
    buildingHasTruncation,
    recoverableTruncation: hasTruncation && Boolean(buildingName) && !buildingHasTruncation,
  };
}

export function getTruncatedBuildingPrefix(raw) {
  const rawValue = String(raw || "");
  const cleaned = cleanBuildingName(raw);
  if (!TRUNCATION_PATTERN.test(rawValue) && !TRUNCATION_PATTERN.test(cleaned)) return "";
  return cleanAddressBuildingPart(stripTruncationMarker(cleaned));
}

export function cleanBuildingName(raw) {
  let name = String(raw || "").trim();

  const address = parseBuildingAddressValue(name);
  if (address.hasAddress) name = address.buildingName || name;

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

export function normalizeBuildingAliasKey(raw) {
  return normalizeToken(cleanBuildingName(raw));
}

function expandBoulevard(value) {
  return String(value || "").replace(/\bblvd\b\.?/gi, "Boulevard");
}

function compressBoulevard(value) {
  return String(value || "").replace(/\bboulevard\b/gi, "Blvd");
}

function expandCommonAbbreviations(value) {
  return String(value || "")
    .replace(/&/g, " and ")
    .replace(/\bblvd\.?\b/gi, "Boulevard")
    .replace(/\bbldg\.?\b/gi, "Building")
    .replace(/\btwr\.?\b/gi, "Tower")
    .replace(/\bresid\.?\b/gi, "Residence")
    .replace(/\bres\.?\b/gi, "Residence")
    .replace(/\bapts?\.?\b/gi, "Apartments")
    .replace(/\bapt\.?\b/gi, "Apartment");
}

function replaceNumberWords(value) {
  let next = String(value || "");
  for (const [word, digit] of Object.entries(NUMBER_WORDS)) {
    next = next.replace(new RegExp(`\\b${word}\\b`, "gi"), digit);
  }
  return next;
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

function toggleTowerLetterNumber(value) {
  const trimmed = String(value || "").trim();
  const variants = [];
  const letterMatch = trimmed.match(/\bTower\s+A\b/i);
  const letterBMatch = trimmed.match(/\bTower\s+B\b/i);
  const numberOneMatch = trimmed.match(/\bTower\s+1\b/i);
  const numberTwoMatch = trimmed.match(/\bTower\s+2\b/i);

  if (letterMatch) variants.push(trimmed.replace(/\bTower\s+A\b/gi, "Tower 1"));
  if (letterBMatch) variants.push(trimmed.replace(/\bTower\s+B\b/gi, "Tower 2"));
  if (numberOneMatch) variants.push(trimmed.replace(/\bTower\s+1\b/gi, "Tower A"));
  if (numberTwoMatch) variants.push(trimmed.replace(/\bTower\s+2\b/gi, "Tower B"));

  return variants;
}

function stripLocationSuffix(value) {
  return String(value || "")
    .replace(/,\s*(Downtown Dubai|Downtown|Old Town Dubai|Old Town|Business Bay|City Walk|DIFC|Sheikh Zayed Road)\s*$/i, "")
    .replace(/\b(Downtown Dubai|Downtown|Old Town Dubai|Old Town|Business Bay|City Walk|DIFC)\s*$/i, "")
    .replace(/\bDubai\s*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function buildLocationVariants(value) {
  const trimmed = String(value || "").trim();
  const variants = [stripLocationSuffix(trimmed)];
  const oldTownMatch = trimmed.match(/^(.*?),\s*Old Town(?: Dubai)?$/i);
  if (oldTownMatch) {
    variants.push(`${oldTownMatch[1]} Old Town`, `Old Town ${oldTownMatch[1]}`, `Old Town - ${oldTownMatch[1]}`);
  }
  return variants.filter((variant) => variant && variant !== trimmed);
}

function extractParentheticalVariants(value) {
  const trimmed = String(value || "").trim();
  const variants = [];
  for (const match of trimmed.matchAll(/\(([^)]+)\)/g)) {
    if (match[1]) variants.push(match[1].trim());
  }
  const withoutParentheses = trimmed.replace(/\s*\([^)]*\)\s*/g, " ").replace(/\s+/g, " ").trim();
  if (withoutParentheses && withoutParentheses !== trimmed) variants.push(withoutParentheses);
  return variants;
}

function removeDescriptorWords(value) {
  const next = String(value || "")
    .replace(/\b(towers?|buildings?|blocks?|offices?|hotels?|apartments?)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  return next && next !== value ? [next] : [];
}

export function normalizeBuildingPrefixKey(raw) {
  return normalizeToken(
    stripLocationSuffix(replaceNumberWords(expandCommonAbbreviations(cleanAddressBuildingPart(stripTruncationMarker(raw)))))
      .replace(/^the\s+/i, "the ")
      .replace(/\bresidences\b/gi, "Residence")
      .replace(/\btowers\b/gi, "Tower")
      .replace(/\s+/g, " "),
  );
}

function getTruncatedBuildingPrefixKeyVariants(raw) {
  const prefix = getTruncatedBuildingPrefix(raw);
  if (!prefix) return [];

  const variants = [{ prefix, trimmedDescriptor: false }];
  const withoutDanglingDescriptor = prefix.replace(PARTIAL_TRAILING_DESCRIPTOR_PATTERN, "").trim();
  if (withoutDanglingDescriptor && withoutDanglingDescriptor !== prefix) {
    variants.push({ prefix: withoutDanglingDescriptor, trimmedDescriptor: true });
  }

  return variants
    .map((variant) => ({
      ...variant,
      key: normalizeBuildingPrefixKey(variant.prefix),
    }))
    .filter((variant) => variant.key);
}

export function hasSafeTruncatedBuildingPrefix(raw) {
  const prefix = getTruncatedBuildingPrefix(raw);
  const key = normalizeBuildingPrefixKey(prefix);
  const tokens = prefix.split(/[^a-z0-9]+/i).map((token) => token.trim()).filter(Boolean);
  return key.length >= 8 && (tokens.length >= 2 || key.length >= 14);
}

function getRawBuildingNameVariants(raw) {
  const cleaned = cleanBuildingName(raw);
  const variants = new Set([cleaned]);
  const queue = [cleaned];

  while (queue.length && variants.size < 160) {
    const current = queue.shift();
    for (const next of [
      replaceNumberWords(current),
      expandCommonAbbreviations(current),
      expandBoulevard(current),
      compressBoulevard(current),
      ...toggleLeadingArticle(current),
      ...expandTowerVariant(current),
      ...toggleResidencePlurality(current),
      ...toggleTowerLetterNumber(current),
      ...buildLocationVariants(current),
      ...extractParentheticalVariants(current),
      ...removeDescriptorWords(current),
    ]) {
      const trimmed = String(next || "").replace(/\s+/g, " ").trim();
      if (!trimmed || variants.has(trimmed)) continue;
      variants.add(trimmed);
      queue.push(trimmed);
    }
  }

  return [...variants].filter(Boolean);
}

function normalizeStrictBuildingKey(value) {
  return normalizeToken(
    replaceNumberWords(expandCommonAbbreviations(cleanBuildingName(value)))
      .replace(/\bresidences\b/gi, "Residence")
      .replace(/\btowers\b/gi, "Tower")
      .replace(/\s+/g, " "),
  );
}

function normalizeLooseBuildingKey(value) {
  return normalizeToken(
    stripLocationSuffix(replaceNumberWords(expandCommonAbbreviations(cleanBuildingName(value))))
      .replace(/^the\s+/i, "")
      .replace(/\bresidences\b/gi, "Residence")
      .replace(/\btowers\b/gi, "Tower")
      .replace(/\s+/g, " "),
  );
}

function buildKnownBuildingIndex() {
  const exact = new Map();
  const loose = new Map();
  const ambiguousLoose = new Set();
  const prefixCandidates = [];
  const seenPrefixCandidates = new Set();

  const addLoose = (key, canonical) => {
    if (!key) return;
    const existing = loose.get(key);
    if (existing && existing !== canonical) {
      ambiguousLoose.add(key);
      return;
    }
    loose.set(key, canonical);
  };
  const addPrefixCandidate = (value, canonical) => {
    const key = normalizeBuildingPrefixKey(value);
    if (!key) return;
    const candidateKey = `${key}:${canonical}`;
    if (seenPrefixCandidates.has(candidateKey)) return;
    seenPrefixCandidates.add(candidateKey);
    prefixCandidates.push({ key, canonical });
  };

  for (const canonical of DOWNTOWN_DUBAI_BUILDINGS) {
    const cleanedCanonical = cleanBuildingName(canonical);
    const aliases = DOWNTOWN_DUBAI_BUILDING_ALIASES[canonical] || [];
    const directVariants = new Set([cleanedCanonical, ...buildLocationVariants(cleanedCanonical), ...aliases]);
    const variants = new Set([
      ...getRawBuildingNameVariants(cleanedCanonical),
      ...aliases.flatMap((alias) => getRawBuildingNameVariants(alias)),
    ]);

    for (const variant of directVariants) {
      const strictKey = normalizeStrictBuildingKey(variant);
      if (strictKey && !exact.has(strictKey)) exact.set(strictKey, cleanedCanonical);
    }

    for (const variant of variants) {
      addLoose(normalizeLooseBuildingKey(variant), cleanedCanonical);
      addPrefixCandidate(variant, cleanedCanonical);
    }
  }

  for (const key of ambiguousLoose) loose.delete(key);
  return { exact, loose, prefixCandidates };
}

const KNOWN_BUILDING_INDEX = buildKnownBuildingIndex();

export function resolveKnownBuildingName(raw) {
  const cleaned = cleanBuildingName(raw);
  if (!cleaned) return "";

  const variants = getRawBuildingNameVariants(cleaned);
  for (const variant of variants) {
    const strictMatch = KNOWN_BUILDING_INDEX.exact.get(normalizeStrictBuildingKey(variant));
    if (strictMatch) return strictMatch;
  }

  for (const variant of variants) {
    const looseMatch = KNOWN_BUILDING_INDEX.loose.get(normalizeLooseBuildingKey(variant));
    if (looseMatch) return looseMatch;
  }

  return "";
}

export function getKnownBuildingMatch(raw) {
  const cleaned = cleanBuildingName(raw);
  if (!cleaned) {
    return {
      status: "missing",
      confidence: "none",
      method: "missing",
      inputName: "",
      canonicalName: "",
    };
  }

  const variants = getRawBuildingNameVariants(cleaned);
  for (const variant of variants) {
    const strictMatch = KNOWN_BUILDING_INDEX.exact.get(normalizeStrictBuildingKey(variant));
    if (strictMatch) {
      return {
        status: "matched",
        confidence: "high",
        method: normalizeStrictBuildingKey(cleaned) === normalizeStrictBuildingKey(strictMatch) ? "exact" : "alias",
        inputName: cleaned,
        canonicalName: strictMatch,
      };
    }
  }

  for (const variant of variants) {
    const looseMatch = KNOWN_BUILDING_INDEX.loose.get(normalizeLooseBuildingKey(variant));
    if (looseMatch) {
      return {
        status: "matched",
        confidence: "medium",
        method: "loose",
        inputName: cleaned,
        canonicalName: looseMatch,
      };
    }
  }

  return {
    status: "unmatched",
    confidence: "low",
    method: "unmatched",
    inputName: cleaned,
    canonicalName: "",
  };
}

export function findUniqueKnownBuildingPrefixMatch(raw) {
  if (!hasSafeTruncatedBuildingPrefix(raw)) return null;

  const prefix = getTruncatedBuildingPrefix(raw);
  const prefixKey = normalizeBuildingPrefixKey(prefix);
  if (!prefixKey) return null;

  const matches = new Map();
  for (const candidate of KNOWN_BUILDING_INDEX.prefixCandidates) {
    if (candidate.key.startsWith(prefixKey)) {
      matches.set(candidate.canonical, candidate);
    }
  }

  if (matches.size !== 1) return null;
  const [canonicalName] = matches.keys();
  return {
    status: "matched",
    confidence: "medium",
    method: "truncated_prefix",
    inputName: prefix,
    canonicalName,
  };
}

export function findKnownBuildingProjectPrefixMatch(raw) {
  for (const { prefix, key, trimmedDescriptor } of getTruncatedBuildingPrefixKeyVariants(raw)) {
    if (key.length < 5) continue;

    const canonicalKeys = new Map();
    for (const candidate of KNOWN_BUILDING_INDEX.prefixCandidates) {
      if (!candidate.key.startsWith(key)) continue;
      canonicalKeys.set(candidate.canonical, normalizeBuildingPrefixKey(candidate.canonical));
    }

    if (trimmedDescriptor && canonicalKeys.size === 1) {
      const [[canonicalName, canonicalKey]] = [...canonicalKeys.entries()];
      if (canonicalKey === key) {
        return {
          status: "matched",
          confidence: "medium",
          method: "truncated_project",
          inputName: prefix,
          canonicalName,
        };
      }
    }

    if (canonicalKeys.size < 2) continue;

    const parentMatches = [...canonicalKeys.entries()]
      .map(([canonical, canonicalKey]) => ({ canonical, canonicalKey }))
      .filter(({ canonicalKey }) =>
        canonicalKey
        && canonicalKey.startsWith(key)
        && [...canonicalKeys.values()].every((otherKey) => otherKey.startsWith(canonicalKey)),
      )
      .sort((left, right) => left.canonicalKey.length - right.canonicalKey.length);

    if (parentMatches.length !== 1) continue;

    return {
      status: "matched",
      confidence: "medium",
      method: "truncated_project",
      inputName: prefix,
      canonicalName: parentMatches[0].canonical,
    };
  }

  return null;
}

export function findKnownShortUniquePrefixMatch(raw) {
  const prefix = getTruncatedBuildingPrefix(raw);
  const prefixKey = normalizeBuildingPrefixKey(prefix);
  const tokens = prefix.split(/[^a-z0-9]+/i).map((token) => token.trim()).filter(Boolean);
  if (prefixKey.length < 3 || prefixKey.length > 4 || tokens.length !== 1) return null;

  const matches = new Map();
  for (const candidate of KNOWN_BUILDING_INDEX.prefixCandidates) {
    if (candidate.key.startsWith(prefixKey)) matches.set(candidate.canonical, candidate);
  }

  if (matches.size !== 1) return null;
  const [canonicalName] = matches.keys();
  return {
    status: "matched",
    confidence: "medium",
    method: "truncated_short_prefix",
    inputName: prefix,
    canonicalName,
  };
}

export function canonicalizeBuildingName(raw) {
  const cleaned = cleanBuildingName(raw);
  if (!cleaned) return "";
  return resolveKnownBuildingName(cleaned) || expandBoulevard(cleaned);
}

export function formatBuildingLabel(raw) {
  if (!raw) return "";
  const cleaned = canonicalizeBuildingName(raw);
  if (!cleaned) return "";
  return expandBoulevard(cleaned);
}

export function getBuildingKeyVariants(raw) {
  const cleaned = cleanBuildingName(raw);
  if (!cleaned) return [];

  const variants = new Set();
  const addVariant = (value) => {
    const normalized = normalizeToken(value);
    if (normalized) variants.add(normalized);
  };

  const known = resolveKnownBuildingName(cleaned);
  const rawVariants = new Set([
    ...getRawBuildingNameVariants(cleaned),
    ...(known ? getRawBuildingNameVariants(known) : []),
  ]);

  for (const value of rawVariants) addVariant(value);
  return [...variants].filter(Boolean);
}
