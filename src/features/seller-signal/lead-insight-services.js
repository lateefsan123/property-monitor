import { supabase } from "../../supabase";
import { buildMessage, buildRecentTransactions, extractBeds, extractTransactionDate, summarizeTransactions } from "./insight-utils";
import { cleanBuildingName, getBuildingKeyVariants } from "./building-utils";
import { fetchDldFallbackTransactions } from "./dld";

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

async function fetchFallbackTransactionsForMissingTargets(targets, transactionsByBuilding) {
  const missingNames = new Map();

  for (const lead of targets) {
    const keys = getBuildingKeyVariants(lead.building);
    if (!keys.length) continue;
    const { transactions } = findTransactionsForKeys(keys, transactionsByBuilding);
    if (transactions.length) continue;

    const cleaned = cleanBuildingName(lead.building);
    if (cleaned) missingNames.set(cleaned, cleaned);
  }

  if (!missingNames.size) return {};

  try {
    return await fetchDldFallbackTransactions([...missingNames.values()]);
  } catch {
    return {};
  }
}

export async function fetchLeadInsights(leads) {
  const targets = leads.filter((lead) => lead.building);
  if (!targets.length) {
    return { hasTargets: false, matched: 0, updates: {} };
  }

  const cleanedBuildings = {};
  for (const lead of targets) {
    const cleaned = cleanBuildingName(lead.building);
    const keys = getBuildingKeyVariants(lead.building);
    if (!keys.length) continue;
    for (const key of keys) {
      if (!cleanedBuildings[key]) cleanedBuildings[key] = cleaned;
    }
  }

  const buildingKeys = Object.keys(cleanedBuildings);
  if (!buildingKeys.length) {
    return { hasTargets: false, matched: 0, updates: {} };
  }

  const [{ data: buildingRows, error: buildingError }, { data: transactionRows, error: transactionError }] = await Promise.all([
    supabase.from("buildings").select("key, location_name").in("key", buildingKeys),
    supabase.from("transactions").select("*").in("building_key", buildingKeys),
  ]);

  if (buildingError) throw new Error(buildingError.message);
  if (transactionError) throw new Error(transactionError.message);

  const buildingLookup = {};
  for (const building of buildingRows || []) buildingLookup[building.key] = building;

  const transactionsByBuilding = {};
  for (const transaction of transactionRows || []) {
    if (!transactionsByBuilding[transaction.building_key]) transactionsByBuilding[transaction.building_key] = [];
    transactionsByBuilding[transaction.building_key].push(mapStoredTransaction(transaction));
  }

  const fallbackTransactionsByBuilding = await fetchFallbackTransactionsForMissingTargets(targets, transactionsByBuilding);

  const updates = {};
  let matched = 0;

  for (const lead of targets) {
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
      updates[lead.id] = {
        status: "error",
        error: "Property market data is not available yet.",
        message: buildMessage(lead, null),
      };
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
    const allTransactionDates = filteredTransactions.map((transaction) => extractTransactionDate(transaction)).filter(Boolean);
    const insight = {
      status: "ready",
      ...metrics,
      locationName,
      recentTransactions,
      allTransactionDates,
    };

    updates[lead.id] = {
      ...insight,
      message: buildMessage(lead, insight),
    };
    matched += 1;
  }

  return { hasTargets: true, matched, updates };
}

export async function fetchLeadMarketAvailability(leads) {
  const targets = leads.filter((lead) => lead.building);
  if (!targets.length) {
    return { hasTargets: false, matched: 0, updates: {} };
  }

  const keysByLeadId = new Map();
  const buildingKeys = new Set();

  for (const lead of targets) {
    const keys = getBuildingKeyVariants(lead.building);
    if (!keys.length) continue;
    keysByLeadId.set(lead.id, keys);
    for (const key of keys) buildingKeys.add(key);
  }

  if (!buildingKeys.size) {
    return { hasTargets: false, matched: 0, updates: {} };
  }

  const { data, error } = await supabase
    .from("transactions")
    .select("building_key")
    .in("building_key", [...buildingKeys])
    .limit(10000);

  if (error) throw new Error(error.message);

  const availableKeys = new Set((data || []).map((row) => row.building_key).filter(Boolean));
  const updates = {};
  let matched = 0;

  for (const lead of targets) {
    const keys = keysByLeadId.get(lead.id) || [];
    const hasMarketData = keys.some((key) => availableKeys.has(key));
    updates[lead.id] = {
      status: hasMarketData ? "ready" : "error",
      source: hasMarketData ? "cached_transactions" : "none",
    };
    if (hasMarketData) matched += 1;
  }

  return { hasTargets: true, matched, updates };
}
