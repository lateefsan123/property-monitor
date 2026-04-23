import { RECENT_TRANSACTIONS_LIMIT } from "./constants";
import { cleanBuildingName, getBuildingKeyVariants } from "./building-utils";
import { startOfDay } from "./lead-utils";
import { parseCsvText, rowsToObjects } from "./spreadsheet";

const DLD_EXPORT_URL = "https://gateway.dubailand.gov.ae/open-data/transactions/export/csv";
const DLD_PRIMARY_WINDOW_DAYS = 14;
const DLD_SECONDARY_WINDOW_DAYS = 60;
const DLD_SALES_GROUP_ID = "1";
const DLD_RESIDENTIAL_USAGE_ID = "1";
const SQM_TO_SQFT = 10.7639;
const dldSalesExportCache = new Map();

function normalizeToken(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function replaceNumberWords(value) {
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

  let next = String(value || "");
  for (const [word, digit] of Object.entries(numberMap)) {
    next = next.replace(new RegExp(`\\b${word}\\b`, "gi"), digit);
  }
  return next;
}

const DLD_FUZZY_STOP_WORDS = new Set([
  "the",
  "dd",
  "tower",
  "towers",
  "residence",
  "residences",
  "building",
  "buildings",
  "phase",
  "by",
  "at",
]);

function tokenizeForFuzzyMatch(value) {
  return [...new Set(
    replaceNumberWords(cleanBuildingName(value))
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .map((token) => token.trim())
      .filter((token) => token && !DLD_FUZZY_STOP_WORDS.has(token)),
  )];
}

function countTokenOverlap(leftTokens, rightTokens) {
  const right = new Set(rightTokens);
  let overlap = 0;
  for (const token of leftTokens) {
    if (right.has(token)) overlap += 1;
  }
  return overlap;
}

function isLikelyBuildingMatch(targetTokens, candidateTokens) {
  if (!targetTokens.length || !candidateTokens.length) return false;
  const overlap = countTokenOverlap(targetTokens, candidateTokens);
  if (overlap < 2) return false;
  return overlap === Math.min(targetTokens.length, candidateTokens.length);
}

function formatDateParam(dateValue) {
  const date = startOfDay(dateValue);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${month}/${day}/${date.getFullYear()}`;
}

function buildExportPayload(fromDate, toDate) {
  return {
    parameters: {
      P_FROM_DATE: formatDateParam(fromDate),
      P_TO_DATE: formatDateParam(toDate),
      P_GROUP_ID: DLD_SALES_GROUP_ID,
      P_IS_OFFPLAN: "",
      P_IS_FREE_HOLD: "",
      P_AREA_ID: "",
      P_USAGE_ID: DLD_RESIDENTIAL_USAGE_ID,
      P_PROP_TYPE_ID: "",
      P_TAKE: "-1",
      P_SKIP: "",
      P_SORT: "INSTANCE_DATE_DESC",
    },
    labels: {},
  };
}

async function fetchDldSalesExport(daysBack) {
  const toDate = startOfDay(new Date());
  const fromDate = startOfDay(new Date());
  fromDate.setDate(fromDate.getDate() - Math.max(0, daysBack - 1));

  const cacheKey = `${formatDateParam(fromDate)}:${formatDateParam(toDate)}`;
  if (dldSalesExportCache.has(cacheKey)) return dldSalesExportCache.get(cacheKey);

  const task = (async () => {
    const response = await fetch(DLD_EXPORT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(buildExportPayload(fromDate, toDate)),
    });

    if (!response.ok) {
      throw new Error(`DLD export ${response.status}`);
    }

    const csvText = await response.text();
    if (!csvText || csvText.trim().startsWith("<!DOCTYPE html")) {
      throw new Error("DLD export returned an unexpected response");
    }

    const { records } = rowsToObjects(parseCsvText(csvText));
    return records;
  })().catch((error) => {
    dldSalesExportCache.delete(cacheKey);
    throw error;
  });

  dldSalesExportCache.set(cacheKey, task);
  return task;
}

function parseNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const normalized = String(value || "").replace(/[, ]/g, "").trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseBeds(value) {
  const direct = parseNumber(value);
  if (direct !== null) return Math.round(direct);
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return null;
  if (raw.includes("studio")) return 0;
  const match = raw.match(/(\d+)/);
  return match ? Number(match[1]) : null;
}

function toSqft(squareMeters) {
  const parsed = parseNumber(squareMeters);
  return parsed ? parsed * SQM_TO_SQFT : null;
}

function buildLocationLabel(record) {
  return record.PROJECT_EN || record.MASTER_PROJECT_EN || record.AREA_EN || null;
}

function buildFullLocation(record) {
  const parts = [record.AREA_EN, record.MASTER_PROJECT_EN, record.PROJECT_EN]
    .map((value) => String(value || "").trim())
    .filter(Boolean);
  return parts.length ? parts.join(" -> ") : null;
}

function buildTransaction(record) {
  const areaSqft = toSqft(record.ACTUAL_AREA || record.PROCEDURE_AREA);
  const beds = parseBeds(record.ROOMS_EN);

  return {
    id: record.TRANSACTION_NUMBER || `${record.INSTANCE_DATE}-${record.TRANS_VALUE}`,
    amount: parseNumber(record.TRANS_VALUE),
    category: record.PROCEDURE_EN || null,
    date: record.INSTANCE_DATE || null,
    beds,
    area: areaSqft,
    area_sqft: areaSqft,
    property: {
      beds,
      floor: null,
      type: record.PROP_SB_TYPE_EN || record.PROP_TYPE_EN || null,
      built_up_area: areaSqft,
    },
    location: {
      location: buildLocationLabel(record),
      full_location: buildFullLocation(record),
    },
    project_name: record.PROJECT_EN || null,
    master_project_name: record.MASTER_PROJECT_EN || null,
    building_name: record.PROJECT_EN || record.MASTER_PROJECT_EN || null,
    source: "dld",
  };
}

function buildTargetIndex(buildingNames) {
  const targets = new Map();
  const keyToTargets = new Map();

  for (const rawName of buildingNames) {
    const cleaned = cleanBuildingName(rawName);
    const targetId = normalizeToken(cleaned);
    if (!targetId) continue;

    if (!targets.has(targetId)) {
      targets.set(targetId, {
        locationName: cleaned,
        transactions: [],
        transactionIds: new Set(),
        fuzzyTokens: tokenizeForFuzzyMatch(cleaned),
      });
    }

    for (const variant of getBuildingKeyVariants(cleaned)) {
      if (!keyToTargets.has(variant)) keyToTargets.set(variant, new Set());
      keyToTargets.get(variant).add(targetId);
    }
  }

  return { targets, keyToTargets };
}

function collectTargetIds(record, targetState, keyToTargets) {
  const matches = new Set();
  const candidateNames = [record.PROJECT_EN, record.MASTER_PROJECT_EN].filter(Boolean);
  for (const value of [record.PROJECT_EN, record.MASTER_PROJECT_EN]) {
    for (const variant of getBuildingKeyVariants(value)) {
      const targetIds = keyToTargets.get(variant);
      if (!targetIds) continue;
      for (const targetId of targetIds) matches.add(targetId);
    }
  }

  if (matches.size) return [...matches];

  const candidateTokens = [...new Set(candidateNames.flatMap((value) => tokenizeForFuzzyMatch(value)))];
  if (!candidateTokens.length) return [];

  for (const [targetId, target] of targetState.entries()) {
    if (isLikelyBuildingMatch(target.fuzzyTokens, candidateTokens)) {
      matches.add(targetId);
    }
  }

  return [...matches];
}

function mergeTransactions(records, targetState, keyToTargets) {
  for (const record of records) {
    const targetIds = collectTargetIds(record, targetState, keyToTargets);
    if (!targetIds.length) continue;

    const transaction = buildTransaction(record);
    if (!transaction.amount) continue;

    for (const targetId of targetIds) {
      const target = targetState.get(targetId);
      if (!target || target.transactionIds.has(transaction.id)) continue;

      target.transactions.push(transaction);
      target.transactionIds.add(transaction.id);
      target.locationName = buildLocationLabel(record) || target.locationName;
    }
  }
}

function hasEnoughTransactions(targetState) {
  for (const target of targetState.values()) {
    if (target.transactions.length < RECENT_TRANSACTIONS_LIMIT) return false;
  }
  return true;
}

function finalizeTargetState(targetState) {
  const result = {};

  for (const [targetId, target] of targetState.entries()) {
    const transactions = [...target.transactions].sort((left, right) => {
      const leftTime = left.date ? new Date(left.date).getTime() : 0;
      const rightTime = right.date ? new Date(right.date).getTime() : 0;
      return rightTime - leftTime;
    });

    result[targetId] = {
      locationName: target.locationName,
      transactions,
    };
  }

  return result;
}

export async function fetchDldFallbackTransactions(buildingNames) {
  const { targets, keyToTargets } = buildTargetIndex(buildingNames);
  if (!targets.size) return {};

  const windows = [DLD_PRIMARY_WINDOW_DAYS, DLD_SECONDARY_WINDOW_DAYS];
  let lastError = null;

  for (const daysBack of windows) {
    try {
      const records = await fetchDldSalesExport(daysBack);
      mergeTransactions(records, targets, keyToTargets);
      if (hasEnoughTransactions(targets)) break;
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError && ![...targets.values()].some((target) => target.transactions.length)) {
    throw lastError;
  }

  return finalizeTargetState(targets);
}
