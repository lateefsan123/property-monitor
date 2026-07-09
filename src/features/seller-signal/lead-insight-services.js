import { supabase } from "../../supabase";
import {
  buildMessage,
  buildRecentTransactions,
  extractBeds,
  extractTransactionDate,
  filterTransactionsForDate,
  getTodayTransactionDateKey,
  summarizeTransactions,
} from "./insight-utils";
import { cleanBuildingName, getBuildingKeyVariants } from "./building-utils";

const TRANSACTION_COLUMNS = "building_key, amount, category, date, floor, beds, property_type, builtup_area_sqft, location_name, full_location, latitude, longitude";
const PER_BUILDING_TRANSACTION_LIMIT = 200;
const TRANSACTION_FETCH_BATCH_SIZE = 8;

function mapStoredTransaction(transactionRow) {
  return {
    amount: transactionRow.amount,
    category: transactionRow.category,
    date: transactionRow.date,
    floor: transactionRow.floor,
    beds: transactionRow.beds,
    property: {
      floor: transactionRow.floor,
      beds: transactionRow.beds,
      type: transactionRow.property_type,
      built_up_area: transactionRow.builtup_area_sqft,
    },
    location: {
      location: transactionRow.location_name,
      full_location: transactionRow.full_location,
      coordinates: {
        latitude: transactionRow.latitude,
        longitude: transactionRow.longitude,
      },
    },
  };
}

function getTransactionList(entry) {
  if (Array.isArray(entry)) return entry;
  if (Array.isArray(entry?.transactions)) return entry.transactions;
  return [];
}

function findTransactionsForKeys(keys, transactionsByBuilding) {
  for (const key of keys || []) {
    const entry = transactionsByBuilding[key];
    const transactions = getTransactionList(entry);
    if (transactions.length) return { key, entry, transactions };
  }
  return { key: keys?.[0] || null, entry: null, transactions: [] };
}

function isMissingMarketAvailabilityRpc(error) {
  const message = String(error?.message || "");
  return error?.code === "PGRST202"
    || error?.code === "42883"
    || message.includes("get_available_market_building_keys");
}

async function fetchAvailableBuildingKeysFallback(buildingKeys) {
  const availableKeys = new Set();
  const batchSize = 10;

  for (let index = 0; index < buildingKeys.length; index += batchSize) {
    const batch = buildingKeys.slice(index, index + batchSize);
    const results = await Promise.all(batch.map(async (buildingKey) => {
      const { data, error } = await supabase
        .from("transactions")
        .select("building_key")
        .eq("building_key", buildingKey)
        .limit(1);

      if (error) throw new Error(error.message);
      return data?.length ? buildingKey : null;
    }));

    for (const buildingKey of results) {
      if (buildingKey) availableKeys.add(buildingKey);
    }
  }

  return availableKeys;
}

async function fetchAvailableBuildingKeys(buildingKeys) {
  const uniqueKeys = [...new Set(buildingKeys)].filter(Boolean);
  if (!uniqueKeys.length) return new Set();

  const { data, error } = await supabase.rpc(
    "get_available_market_building_keys",
    { target_keys: uniqueKeys },
  );

  if (!error) {
    return new Set((data || []).map((row) => row.building_key).filter(Boolean));
  }

  if (!isMissingMarketAvailabilityRpc(error)) throw new Error(error.message);
  return fetchAvailableBuildingKeysFallback(uniqueKeys);
}

export async function fetchAvailableMarketBuildingKeys(buildingKeys) {
  const availableKeys = await fetchAvailableBuildingKeys(buildingKeys);
  return [...availableKeys];
}

function isMissingHotBuildingsRpc(error) {
  const message = String(error?.message || "");
  return error?.code === "PGRST202"
    || error?.code === "42883"
    || message.includes("get_market_building_keys_with_transactions_on");
}

export async function fetchBuildingKeysWithTransactionsOn(buildingKeys, dateKey) {
  const uniqueKeys = [...new Set(buildingKeys)].filter(Boolean);
  if (!uniqueKeys.length || !dateKey) return [];

  const { data, error } = await supabase.rpc(
    "get_market_building_keys_with_transactions_on",
    { target_keys: uniqueKeys, target_date: dateKey },
  );

  if (error) {
    // A missing RPC (migration not applied yet) should degrade to "nothing is
    // hot" rather than break the sellers page.
    if (isMissingHotBuildingsRpc(error)) return [];
    throw new Error(error.message);
  }

  return (data || []).map((row) => row.building_key).filter(Boolean);
}

async function fetchTransactionsForKeys(buildingKeys) {
  const transactionsByBuilding = {};

  for (let index = 0; index < buildingKeys.length; index += TRANSACTION_FETCH_BATCH_SIZE) {
    const batch = buildingKeys.slice(index, index + TRANSACTION_FETCH_BATCH_SIZE);
    const results = await Promise.all(batch.map(async (buildingKey) => {
      const { data, error } = await supabase
        .from("transactions")
        .select(TRANSACTION_COLUMNS)
        .eq("building_key", buildingKey)
        .order("date", { ascending: false })
        .limit(PER_BUILDING_TRANSACTION_LIMIT);

      if (error) throw new Error(error.message);
      return { buildingKey, rows: data || [] };
    }));

    for (const { buildingKey, rows } of results) {
      if (!rows.length) continue;
      transactionsByBuilding[buildingKey] = rows.map(mapStoredTransaction);
    }
  }

  return transactionsByBuilding;
}

export async function fetchBuildingMarketData(buildingKeys) {
  const uniqueKeys = [...new Set(buildingKeys)].filter(Boolean);
  if (!uniqueKeys.length) {
    return { buildingLookup: {}, transactionsByBuilding: {} };
  }

  const [{ data: buildingRows, error: buildingError }, availableKeySet] = await Promise.all([
    supabase.from("buildings").select("key, location_name").in("key", uniqueKeys),
    fetchAvailableBuildingKeys(uniqueKeys),
  ]);

  if (buildingError) throw new Error(buildingError.message);

  const transactionsByBuilding = await fetchTransactionsForKeys([...availableKeySet]);

  const buildingLookup = {};
  for (const building of buildingRows || []) buildingLookup[building.key] = building;

  return { buildingLookup, transactionsByBuilding };
}

export function getMissingFallbackBuildingNames(targets, transactionsByBuilding) {
  const missingNames = new Set();

  for (const lead of targets || []) {
    const keys = getBuildingKeyVariants(lead.building);
    if (!keys.length) continue;
    const { transactions } = findTransactionsForKeys(keys, transactionsByBuilding || {});
    if (transactions.length) continue;

    const cleaned = cleanBuildingName(lead.building);
    if (cleaned) missingNames.add(cleaned);
  }

  return [...missingNames].sort();
}

export function computeLeadInsights(targets, marketData, fallbackState = {}) {
  const buildingLookup = marketData?.buildingLookup || {};
  const transactionsByBuilding = marketData?.transactionsByBuilding || {};
  const fallbackTransactionsByBuilding = fallbackState.data || {};
  const fallbackPending = Boolean(fallbackState.pending);

  const updates = {};
  let matched = 0;
  let pending = 0;
  const todayDateKey = getTodayTransactionDateKey();

  for (const lead of targets || []) {
    const cleaned = cleanBuildingName(lead.building);
    const keys = getBuildingKeyVariants(lead.building);
    const cachedMatch = findTransactionsForKeys(keys, transactionsByBuilding);
    const fallbackMatch = findTransactionsForKeys(keys, fallbackTransactionsByBuilding);
    const matchedKey = cachedMatch.key || fallbackMatch.key || keys.find((key) => buildingLookup[key]) || keys[0];
    const building = matchedKey ? buildingLookup[matchedKey] : null;
    const allTransactions = cachedMatch.transactions.length ? cachedMatch.transactions : fallbackMatch.transactions;
    const locationName = building?.location_name
      || fallbackMatch.entry?.locationName
      || cleaned;

    if (!allTransactions.length) {
      if (fallbackPending) {
        pending += 1;
        updates[lead.id] = {
          status: "loading",
          error: null,
          message: buildMessage(lead, null),
        };
      } else {
        updates[lead.id] = {
          status: "error",
          error: "Property market data is not available yet.",
          message: buildMessage(lead, null),
        };
      }
      continue;
    }

    let filteredTransactions = allTransactions;
    if (Array.isArray(lead.bedFilterValues) && lead.bedFilterValues.length) {
      const bedroomMatches = allTransactions.filter((transaction) => {
        const beds = extractBeds(transaction);
        return beds !== null && lead.bedFilterValues.includes(beds);
      });
      if (bedroomMatches.length) filteredTransactions = bedroomMatches;
    }

    const metrics = summarizeTransactions(filteredTransactions);
    const recentTransactions = buildRecentTransactions(filteredTransactions, locationName);
    const todaysRecentTransactions = buildRecentTransactions(
      filterTransactionsForDate(filteredTransactions, todayDateKey),
      locationName,
    );
    const allTransactionDates = filteredTransactions.map((transaction) => extractTransactionDate(transaction)).filter(Boolean);
    const insight = {
      status: "ready",
      ...metrics,
      locationName,
      recentTransactions,
      todayTransactionDateKey: todayDateKey,
      todaysRecentTransactions,
      hasTodaysTransactions: todaysRecentTransactions.length > 0,
      allTransactionDates,
    };
    const messageInsight = todaysRecentTransactions.length
      ? { ...insight, recentTransactions: todaysRecentTransactions }
      : insight;

    updates[lead.id] = {
      ...insight,
      message: buildMessage(lead, messageInsight),
    };
    matched += 1;
  }

  return { hasTargets: (targets || []).length > 0, matched, pending, updates };
}
