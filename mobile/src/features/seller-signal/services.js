import { aiMapColumns } from "../../ai-mapper";
import { fetchTransactions, searchLocations } from "../../api/bayut";
import { supabase } from "../../supabase";
import { fetchDldFallbackTransactions } from "./dld";
import { IMPORT_BATCH_SIZE, IMPORT_SAMPLE_ROW_LIMIT, MILLISECONDS_PER_DAY } from "./constants";
import { buildMessage, buildRecentTransactions, extractBeds, extractTransactionDate, summarizeTransactions } from "./insight-utils";
import { cleanBuildingName, createLeadInsertRecord, getBuildingKeyVariants, mapStoredLeadRow, sortLeadsByPriority, startOfDay } from "./lead-utils";
import { buildGoogleCsvUrl, inferMapping, normalizeToken, parseCsvText, rowsToObjects } from "./spreadsheet";

const FALLBACK_TRANSACTION_PAGES = 2;
const FALLBACK_TRANSACTION_LIMIT = 120;
const FALLBACK_STALE_DAYS = 10;
const FALLBACK_FETCH_CONCURRENCY = 4;
const bayutFallbackTransactionsCache = new Map();

function expandBoulevard(value) {
  return String(value || "").replace(/\bblvd\b\.?/gi, "Boulevard");
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

function buildSearchVariants(name) {
  const cleaned = cleanBuildingName(name);
  const variants = new Set();
  const add = (value) => {
    const trimmed = String(value || "").trim();
    if (trimmed) variants.add(trimmed);
  };
  add(cleaned);
  add(expandBoulevard(cleaned));
  add(replaceNumberWords(cleaned));
  add(replaceNumberWords(expandBoulevard(cleaned)));
  return [...variants];
}

function extractLocationName(location) {
  return location?.name || location?.title || location?.name_l1 || "Unknown";
}

function extractFullPath(location) {
  return location?.full_name
    || location?.path
    || (Array.isArray(location?.location) ? location.location.join(" | ") : "")
    || "";
}

function scoreLocation(location, query) {
  const target = normalizeToken(query);
  const name = extractLocationName(location);
  const fullPath = extractFullPath(location);
  const normalizedName = normalizeToken(name);
  const normalizedFullPath = normalizeToken(fullPath);

  let score = 0;
  if (normalizedName === target) score += 120;
  if (normalizedName.includes(target) || target.includes(normalizedName)) score += 70;
  if (normalizedFullPath.includes(target)) score += 35;
  score += Math.max(0, 20 - Math.abs(name.length - query.length));
  return score;
}

function toList(payload) {
  if (Array.isArray(payload)) return payload;
  if (!payload) return [];
  return payload.hits || payload.results || payload.transactions || [];
}

function isTransactionsStale(transactions) {
  if (!transactions?.length) return true;
  const dates = transactions
    .map((transaction) => extractTransactionDate(transaction))
    .filter(Boolean);
  if (!dates.length) return true;
  const latest = dates.reduce((max, date) => (date > max ? date : max), dates[0]);
  const today = startOfDay(new Date());
  const latestDay = startOfDay(latest);
  const ageDays = Math.floor((today - latestDay) / MILLISECONDS_PER_DAY);
  return ageDays > FALLBACK_STALE_DAYS;
}

async function fetchBayutFallbackTransactions(buildingName) {
  const key = normalizeToken(buildingName);
  if (!key) return null;
  if (bayutFallbackTransactionsCache.has(key)) return bayutFallbackTransactionsCache.get(key);

  const task = (async () => {
    try {
      const variants = buildSearchVariants(buildingName);
      let bestLocation = null;
      for (const variant of variants) {
        const payload = await searchLocations(variant);
        const locations = toList(payload);
        if (!locations.length) continue;
        const scored = locations
          .map((location) => ({ location, score: scoreLocation(location, variant) }))
          .sort((left, right) => right.score - left.score);
        bestLocation = scored[0]?.location || null;
        if (bestLocation) break;
      }

      const locationId = bestLocation?.id || bestLocation?.externalID || bestLocation?.location_id || null;
      if (!locationId) return null;

      const allTransactions = [];
      for (let page = 0; page < FALLBACK_TRANSACTION_PAGES; page += 1) {
        const payload = await fetchTransactions({
          locationIds: [locationId],
          page,
          purpose: "for-sale",
          category: "residential",
          completionStatus: "completed",
          sortBy: "date",
          order: "desc",
        });
        const results = toList(payload);
        if (!results.length) break;
        allTransactions.push(...results);
        if (allTransactions.length >= FALLBACK_TRANSACTION_LIMIT) break;
      }

      return {
        locationName: extractLocationName(bestLocation),
        transactions: allTransactions.slice(0, FALLBACK_TRANSACTION_LIMIT),
      };
    } catch {
      return null;
    }
  })();

  bayutFallbackTransactionsCache.set(key, task);
  return task;
}

async function populateFallbackTransactions(entries, target, loader, concurrency = FALLBACK_FETCH_CONCURRENCY) {
  if (!entries.length) return;

  let cursor = 0;
  const workerCount = Math.min(concurrency, entries.length);

  const workers = Array.from({ length: workerCount }, async () => {
    while (cursor < entries.length) {
      const currentIndex = cursor;
      cursor += 1;
      const [normalized, name] = entries[currentIndex];
      target[normalized] = await loader(name);
    }
  });

  await Promise.all(workers);
}

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

export async function fetchUserLeads(userId, today = startOfDay(new Date())) {
  const [{ data: leadRows, error: leadError }, { data: sentRows, error: sentError }] = await Promise.all([
    supabase.from("leads").select("*").eq("user_id", userId).order("id"),
    supabase.from("sent_leads").select("lead_id, sent_at").eq("user_id", userId),
  ]);

  if (leadError) throw new Error(leadError.message);
  if (sentError) throw new Error(sentError.message);

  const sentMap = {};
  for (const row of sentRows || []) sentMap[row.lead_id] = new Date(row.sent_at).getTime();

  const leads = sortLeadsByPriority(
    (leadRows || [])
      .map((row, index) => mapStoredLeadRow(row, index, today))
      .filter((lead) => lead.name || lead.building || lead.phone),
  );

  return { leads, sentMap };
}

export async function fetchLeadSources(userId) {
  const { data, error } = await supabase
    .from("lead_sources")
    .select("*")
    .eq("user_id", userId)
    .order("sort_order");

  if (error) throw new Error(error.message);
  return data || [];
}

export async function updateLeadStatus({ userId, leadId, status }) {
  if (!userId || !leadId) return;

  const { error } = await supabase
    .from("leads")
    .update({ status })
    .eq("user_id", userId)
    .eq("id", leadId);

  if (error) throw new Error(error.message);
}

function emptyToNull(value) {
  const trimmed = String(value ?? "").trim();
  return trimmed || null;
}

export async function updateLead({ userId, leadId, updates }) {
  if (!userId || !leadId) return;

  const payload = {
    name: emptyToNull(updates?.name),
    building: emptyToNull(updates?.building),
    bedroom: emptyToNull(updates?.bedroom),
    unit: emptyToNull(updates?.unit),
    phone: emptyToNull(updates?.phone),
    status: emptyToNull(updates?.status),
    last_contact: updates?.lastContact ? updates.lastContact : null,
  };

  const { error } = await supabase
    .from("leads")
    .update(payload)
    .eq("user_id", userId)
    .eq("id", leadId);

  if (error) throw new Error(error.message);
}

export async function deleteLead({ userId, leadId }) {
  if (!userId || !leadId) return;

  const { error: sentDeleteError } = await supabase
    .from("sent_leads")
    .delete()
    .eq("user_id", userId)
    .eq("lead_id", leadId);
  if (sentDeleteError) throw new Error(sentDeleteError.message);

  const { error } = await supabase
    .from("leads")
    .delete()
    .eq("user_id", userId)
    .eq("id", leadId);

  if (error) throw new Error(error.message);
}

export async function createDefaultLeadSources(userId, count = 10, startSortOrder = 0) {
  const defaults = Array.from({ length: count }, (_, index) => ({
    user_id: userId,
    label: "",
    type: "building",
    building_name: "",
    sheet_url: null,
    sort_order: startSortOrder + index,
  }));

  if (!defaults.length) return;

  const { error } = await supabase.from("lead_sources").insert(defaults);
  if (error) throw new Error(error.message);
}

export async function upsertLeadSource(source) {
  const payload = {
    id: source.id,
    user_id: source.user_id,
    label: source.label,
    type: source.type,
    building_name: source.building_name || null,
    sheet_url: source.sheet_url || null,
    sort_order: source.sort_order ?? 0,
  };

  const { error } = await supabase
    .from("lead_sources")
    .upsert(payload, { onConflict: "id" });

  if (error) throw new Error(error.message);
}

async function clearLeadsForSource(userId, sourceId) {
  if (!sourceId) return;

  const { data: leadRows, error: leadError } = await supabase
    .from("leads")
    .select("id")
    .eq("user_id", userId)
    .eq("source_id", sourceId);
  if (leadError) throw new Error(leadError.message);

  const leadIds = (leadRows || []).map((row) => row.id);
  if (leadIds.length) {
    const { error: sentDeleteError } = await supabase.from("sent_leads").delete().in("lead_id", leadIds);
    if (sentDeleteError) throw new Error(sentDeleteError.message);
  }

  const { error: leadDeleteError } = await supabase
    .from("leads")
    .delete()
    .eq("user_id", userId)
    .eq("source_id", sourceId);
  if (leadDeleteError) throw new Error(leadDeleteError.message);
}

async function clearLegacyLeads(userId) {
  const { data: legacyRows, error: selectError } = await supabase
    .from("leads")
    .select("id")
    .eq("user_id", userId)
    .is("source_id", null);
  if (selectError) throw new Error(selectError.message);

  const legacyIds = (legacyRows || []).map((row) => row.id);
  if (legacyIds.length) {
    const { error: sentDeleteError } = await supabase.from("sent_leads").delete().in("lead_id", legacyIds);
    if (sentDeleteError) throw new Error(sentDeleteError.message);
  }

  const { error: leadDeleteError } = await supabase
    .from("leads")
    .delete()
    .eq("user_id", userId)
    .is("source_id", null);
  if (leadDeleteError) throw new Error(leadDeleteError.message);
}

export async function replaceLegacyLeadsFromSheet({ userId, rawSheetUrl }) {
  const sheetUrl = String(rawSheetUrl || "").trim();
  if (!sheetUrl) throw new Error("Paste a Google Sheet URL first.");

  const csvUrl = buildGoogleCsvUrl(sheetUrl);
  if (!csvUrl) throw new Error("Invalid Google Sheet URL. Paste the full URL from your browser.");

  let response;
  try {
    response = await fetch(csvUrl);
  } catch {
    throw new Error("Could not fetch the sheet. Make sure the link is public (Share > Anyone with the link) and paste the full URL or sheet ID.");
  }

  if (!response.ok) {
    throw new Error(`Failed to load sheet (${response.status}). Make sure the sheet is shared publicly or "Anyone with the link".`);
  }

  const csvText = await response.text();
  const rawRows = parseCsvText(csvText);
  const { headers, records } = rowsToObjects(rawRows);

  if (!headers.length) throw new Error("Sheet has no header row.");

  let mapping = inferMapping(headers);
  if (!(mapping.name && mapping.building)) {
    mapping = await aiMapColumns(headers, rawRows.slice(0, IMPORT_SAMPLE_ROW_LIMIT));
  }

  if (!mapping.name && !mapping.building && !mapping.phone) {
    throw new Error("Could not map any columns. Make sure the sheet has seller names, buildings, or phone numbers.");
  }

  const leadsToInsert = records
    .map((record) => createLeadInsertRecord(record, mapping, userId, {
      sourceId: null,
      defaultStatus: "Prospect",
      defaultBuilding: null,
      overrideBuilding: false,
    }))
    .filter(Boolean);

  if (!leadsToInsert.length) throw new Error("No valid leads found in sheet.");

  await clearLegacyLeads(userId);

  for (let index = 0; index < leadsToInsert.length; index += IMPORT_BATCH_SIZE) {
    const batch = leadsToInsert.slice(index, index + IMPORT_BATCH_SIZE);
    const { error } = await supabase.from("leads").insert(batch);
    if (error) throw new Error(error.message);
  }

  return { count: leadsToInsert.length };
}

export async function replaceUserLeadsFromSheet({ userId, source, rawSheetUrl }) {
  const sheetUrl = String(rawSheetUrl || source?.sheet_url || "").trim();
  if (!sheetUrl) throw new Error("Paste a Google Sheet URL first.");

  const csvUrl = buildGoogleCsvUrl(sheetUrl);
  if (!csvUrl) throw new Error("Invalid Google Sheet URL. Paste the full URL from your browser.");

  let response;
  try {
    response = await fetch(csvUrl);
  } catch {
    throw new Error("Could not fetch the sheet. Make sure the link is public (Share > Anyone with the link) and paste the full URL or sheet ID.");
  }

  if (!response.ok) {
    throw new Error(`Failed to load sheet (${response.status}). Make sure the sheet is shared publicly or "Anyone with the link".`);
  }

  const csvText = await response.text();
  const rawRows = parseCsvText(csvText);
  const { headers, records } = rowsToObjects(rawRows);

  if (!headers.length) throw new Error("Sheet has no header row.");

  let mapping = inferMapping(headers);
  if (!(mapping.name && mapping.building)) {
    mapping = await aiMapColumns(headers, rawRows.slice(0, IMPORT_SAMPLE_ROW_LIMIT));
  }

  if (!mapping.name && !mapping.building && !mapping.phone) {
    throw new Error("Could not map any columns. Make sure the sheet has seller names, buildings, or phone numbers.");
  }

  const defaultStatus = "Prospect";
  const defaultBuilding = source?.building_name || source?.label || null;
  const overrideBuilding = Boolean(source);

  const leadsToInsert = records
    .map((record) => createLeadInsertRecord(record, mapping, userId, {
      sourceId: source?.id || null,
      defaultStatus,
      defaultBuilding,
      overrideBuilding,
    }))
    .filter(Boolean);

  if (!leadsToInsert.length) throw new Error("No valid leads found in sheet.");

  if (source?.id) {
    await clearLeadsForSource(userId, source.id);
  } else {
    const { error: sentDeleteError } = await supabase.from("sent_leads").delete().eq("user_id", userId);
    if (sentDeleteError) throw new Error(sentDeleteError.message);

    const { error: leadDeleteError } = await supabase.from("leads").delete().eq("user_id", userId);
    if (leadDeleteError) throw new Error(leadDeleteError.message);
  }

  for (let index = 0; index < leadsToInsert.length; index += IMPORT_BATCH_SIZE) {
    const batch = leadsToInsert.slice(index, index + IMPORT_BATCH_SIZE);
    const { error } = await supabase.from("leads").insert(batch);
    if (error) throw new Error(error.message);
  }

  return { count: leadsToInsert.length };
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

  const fallbackCandidates = new Map();
  for (const lead of targets) {
    const cleaned = cleanBuildingName(lead.building);
    const keys = getBuildingKeyVariants(lead.building);
    if (!keys.length) continue;
    const baseTransactions = keys.flatMap((key) => transactionsByBuilding[key] || []);
    if (!baseTransactions.length || isTransactionsStale(baseTransactions)) {
      fallbackCandidates.set(normalizeToken(cleaned), cleaned);
    }
  }

  const fallbackTransactionsByName = {};
  const fallbackEntries = [...fallbackCandidates.entries()];
  if (fallbackCandidates.size) {
    try {
      Object.assign(fallbackTransactionsByName, await fetchDldFallbackTransactions([...fallbackCandidates.values()]));
    } catch {
      // Keep Bayut as a mobile-safe fallback if DLD is unavailable.
    }

    const bayutFallbackEntries = fallbackEntries.filter(
      ([normalized]) => !fallbackTransactionsByName[normalized]?.transactions?.length,
    );

    await populateFallbackTransactions(bayutFallbackEntries, fallbackTransactionsByName, fetchBayutFallbackTransactions);
  }

  if (!Object.keys(fallbackTransactionsByName).length && fallbackEntries.length) {
    await populateFallbackTransactions(
      fallbackEntries.filter(([normalized]) => !fallbackTransactionsByName[normalized]?.transactions?.length),
      fallbackTransactionsByName,
      fetchBayutFallbackTransactions,
    );
  }

  const updates = {};
  let matched = 0;

  for (const lead of targets) {
    const cleaned = cleanBuildingName(lead.building);
    const keys = getBuildingKeyVariants(lead.building);
    const matchedKey = keys.find((key) => buildingLookup[key]) || keys[0];
    const building = matchedKey ? buildingLookup[matchedKey] : null;
    let allTransactions = matchedKey ? (transactionsByBuilding[matchedKey] || []) : [];
    let locationName = building?.location_name || cleaned;
    const fallback = fallbackTransactionsByName[normalizeToken(cleaned)];

    if ((!allTransactions.length || isTransactionsStale(allTransactions)) && fallback?.transactions?.length) {
      allTransactions = fallback.transactions;
      locationName = fallback.locationName || locationName;
    }

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

export async function persistLeadSentState(userId, leadId, isSent) {
  if (isSent) {
    const { error } = await supabase.from("sent_leads").upsert({ user_id: userId, lead_id: leadId });
    if (error) throw new Error(error.message);
    return;
  }

  const { error } = await supabase.from("sent_leads").delete().eq("user_id", userId).eq("lead_id", leadId);
  if (error) throw new Error(error.message);
}
