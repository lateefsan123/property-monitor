import fs from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import {
  cleanBuildingName,
  inferColumn,
  normalizeToken,
  parseCsvText,
  rowsToObjects,
} from "./bayut-common.mjs";

const COLUMN_ALIASES = {
  building: ["building", "tower", "project", "community", "building name", "tower name"],
  bedroom: ["bedroom", "bedrooms", "beds", "bed", "unit type", "bhk"],
};

function scoreSheetHeaders(headers) {
  let score = 0;
  if (inferColumn(headers, COLUMN_ALIASES.building)) score += 3;
  if (inferColumn(headers, COLUMN_ALIASES.bedroom)) score += 1;
  return score;
}

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

export function buildSearchVariants(name) {
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

export async function loadRegistryBuildings(buildingsFile) {
  const raw = await fs.readFile(buildingsFile, "utf8");
  const payload = JSON.parse(raw);
  const sourceBuildings = Array.isArray(payload?.buildings) ? payload.buildings : [];

  const buildings = new Map();
  for (const building of sourceBuildings) {
    const canonicalName = cleanBuildingName(building?.canonical_name);
    const buildingKey = normalizeToken(canonicalName);
    if (!buildingKey || !canonicalName) continue;

    const searchCandidates = new Set();
    for (const candidate of [building?.canonical_name, ...(Array.isArray(building?.aliases) ? building.aliases : [])]) {
      for (const variant of buildSearchVariants(candidate)) {
        searchCandidates.add(variant);
      }
    }

    buildings.set(buildingKey, {
      buildingKey,
      searchName: canonicalName,
      searchCandidates: [...searchCandidates],
      project: building?.project || null,
      buildingType: building?.building_type || null,
      status: building?.status || null,
    });
  }

  return [...buildings.values()];
}

export async function loadSheetBuildings(sheetUrl) {
  const response = await fetch(sheetUrl);
  if (!response.ok) throw new Error(`Sheet fetch failed (${response.status})`);

  const csvText = await response.text();
  const rows = parseCsvText(csvText);
  const { headers, records } = rowsToObjects(rows, { getHeaderScore: scoreSheetHeaders });
  const buildingColumn = inferColumn(headers, COLUMN_ALIASES.building);

  if (!buildingColumn) throw new Error("No building column found in sheet");

  const buildings = new Map();
  for (const record of records) {
    const raw = record[buildingColumn];
    if (!raw) continue;

    const cleaned = cleanBuildingName(raw);
    const buildingKey = normalizeToken(cleaned);
    if (!buildingKey || buildings.has(buildingKey)) continue;

    buildings.set(buildingKey, {
      buildingKey,
      searchName: cleaned,
      searchCandidates: buildSearchVariants(cleaned),
      project: null,
      buildingType: null,
      status: null,
    });
  }

  return [...buildings.values()];
}

export async function loadBuildingTargets(buildingsFile, sheetUrl) {
  if (buildingsFile) {
    try {
      const entries = await loadRegistryBuildings(buildingsFile);
      if (entries.length) {
        return {
          sourceLabel: `registry file ${buildingsFile}`,
          entries,
        };
      }
    } catch (error) {
      if (!sheetUrl) throw error;
      console.warn(`Could not load building registry ${buildingsFile}: ${error.message}`);
    }
  }

  if (!sheetUrl) {
    throw new Error("No building source configured. Set BUILDINGS_FILE or SHEET_URL.");
  }

  return {
    sourceLabel: `sheet ${sheetUrl}`,
    entries: await loadSheetBuildings(sheetUrl),
  };
}

export async function syncBayutToSupabase({ supabaseUrl, supabaseKey, buildings }) {
  if (!supabaseUrl || !supabaseKey) {
    console.log("\nNo SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY set, skipping Supabase sync.");
    return;
  }

  console.log("\nSyncing to Supabase...");
  const supabase = createClient(supabaseUrl, supabaseKey);

  const buildingRows = Object.entries(buildings).map(([key, building]) => ({
    key,
    search_name: building.searchName || key,
    location_name: building.locationName || null,
    location_id: building.locationId || null,
  }));

  const { error: buildingError } = await supabase.from("buildings").upsert(buildingRows, { onConflict: "key" });
  if (buildingError) console.error("Buildings upsert error:", buildingError.message);
  else console.log(`  Buildings upserted: ${buildingRows.length}`);

  const buildingKeys = Object.keys(buildings);
  if (!buildingKeys.length) return;

  const { error: deleteError } = await supabase.from("transactions").delete().in("building_key", buildingKeys);
  if (deleteError) console.error("Transactions delete error:", deleteError.message);

  let syncedTransactions = 0;
  const batchSize = 200;
  let batch = [];

  for (const [buildingKey, building] of Object.entries(buildings)) {
    for (const transaction of building.transactions || []) {
      batch.push({
        building_key: buildingKey,
        amount: transaction.amount ? parseFloat(transaction.amount) : null,
        category: transaction.category || null,
        date: transaction.date || null,
        floor: transaction.property?.floor || null,
        beds: transaction.property?.beds || null,
        property_type: transaction.property?.type || null,
        builtup_area_sqft: transaction.property?.builtup_area?.sqft || null,
        occupancy_status: transaction.property?.occupancy_status || null,
        location_name: transaction.location?.location || null,
        full_location: transaction.location?.full_location || null,
        latitude: transaction.location?.coordinates?.latitude || null,
        longitude: transaction.location?.coordinates?.longitude || null,
      });

      if (batch.length < batchSize) continue;

      const { error } = await supabase.from("transactions").insert(batch);
      if (error) {
        console.error("Tx batch error:", error.message);
        return;
      }

      syncedTransactions += batch.length;
      batch = [];
    }
  }

  if (batch.length) {
    const { error } = await supabase.from("transactions").insert(batch);
    if (error) {
      console.error("Final batch error:", error.message);
      return;
    }
    syncedTransactions += batch.length;
  }

  console.log(`  Transactions synced: ${syncedTransactions}`);
}
