import fs from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const DEFAULT_BUILDINGS_FILE = "public/data/downtown-dubai-building-registry.json";
const DEFAULT_SHEET_URL = "https://docs.google.com/spreadsheets/d/1-DgZjG5T93t5zmrHmyekKkOLwCRIYEMMOK4AbOrYOVU/export?format=csv&gid=865690319";
const BASE_URL = "https://uae-real-estate2.p.rapidapi.com";
const API_HOST = "uae-real-estate2.p.rapidapi.com";
const OUTPUT_FILE = "public/data/bayut-transactions.json";

const COLUMN_ALIASES = {
  building: ["building", "tower", "project", "community", "building name", "tower name"],
  bedroom: ["bedroom", "bedrooms", "beds", "bed", "unit type", "bhk"],
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeToken(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function toInt(raw, fallback) {
  const value = Number(raw);
  return Number.isFinite(value) ? Math.floor(value) : fallback;
}

function formatDate(value) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

async function readApiKeyFromDotEnv() {
  try {
    const raw = await fs.readFile(".env", "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (trimmed.startsWith("RAPIDAPI_KEY=")) return trimmed.split("=", 2)[1].trim();
      if (trimmed.startsWith("VITE_RAPIDAPI_KEY=")) return trimmed.split("=", 2)[1].trim();
    }
  } catch { /* ignore */ }
  return null;
}

async function readDotEnv() {
  try {
    const raw = await fs.readFile(".env", "utf8");
    const entries = raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const separatorIndex = line.indexOf("=");
        return [line.slice(0, separatorIndex).trim(), line.slice(separatorIndex + 1).trim()];
      });
    return Object.fromEntries(entries);
  } catch {
    return {};
  }
}

function parseCsvText(text) {
  const source = String(text || "").replace(/^\uFEFF/, "");
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (inQuotes) {
      if (char === "\"") {
        if (source[i + 1] === "\"") { field += "\""; i++; }
        else inQuotes = false;
      } else field += char;
      continue;
    }
    if (char === "\"") { inQuotes = true; continue; }
    if (char === ",") { row.push(field); field = ""; continue; }
    if (char === "\n") { row.push(field); rows.push(row); row = []; field = ""; continue; }
    if (char !== "\r") field += char;
  }
  row.push(field);
  if (row.some((v) => String(v).trim() !== "")) rows.push(row);
  return rows;
}

function makeHeadersUnique(headers) {
  const counts = {};
  return headers.map((h) => {
    const base = String(h || "").trim() || "Column";
    counts[base] = (counts[base] || 0) + 1;
    return counts[base] === 1 ? base : `${base} (${counts[base]})`;
  });
}

function inferColumn(headers, aliases) {
  const normalized = headers.map((h) => ({ header: h, norm: normalizeToken(h) }));
  const normAliases = aliases.map(normalizeToken);
  for (const alias of normAliases) {
    const exact = normalized.find((h) => h.norm === alias);
    if (exact) return exact.header;
  }
  for (const alias of normAliases.filter((a) => a.length >= 5)) {
    const partial = normalized.find((h) => h.norm.includes(alias));
    if (partial) return partial.header;
  }
  return null;
}

function rowsToObjects(rows) {
  if (!rows.length) return { headers: [], records: [] };

  const scanLimit = Math.min(rows.length, 40);
  let headerRowIndex = 0;
  let bestScore = -1;

  for (let i = 0; i < scanLimit; i++) {
    const candidateHeaders = rows[i].map((v, idx) => String(v || "").trim() || `Column ${idx + 1}`);
    let score = 0;
    if (inferColumn(candidateHeaders, COLUMN_ALIASES.building)) score += 3;
    if (inferColumn(candidateHeaders, COLUMN_ALIASES.bedroom)) score += 1;
    if (score > bestScore) { bestScore = score; headerRowIndex = i; }
  }

  const rawHeaders = rows[headerRowIndex].map((v, idx) => String(v || "").trim() || `Column ${idx + 1}`);
  const headers = makeHeadersUnique(rawHeaders);
  const records = rows.slice(headerRowIndex + 1)
    .filter((row) => row.some((v) => String(v || "").trim() !== ""))
    .map((row) => {
      const record = {};
      headers.forEach((h, idx) => { record[h] = String(row[idx] ?? "").trim(); });
      return record;
    });
  return { headers, records };
}

function cleanBuildingName(raw) {
  let name = String(raw || "").trim();
  const aptMatch = name.match(/^(?:\[.*?\]\s*)?Apartment\s+[\w-]+(?:\s*\(.*?\))?\s*,\s*(.+)/i);
  if (aptMatch) {
    const parts = aptMatch[1].split(",").map((s) => s.trim());
    name = parts[0] || name;
  }
  name = name
    .replace(/\b(one|two|three|four|five|1|2|3|4|5)\s*[-\s]?\s*bed(room)?s?\b/gi, "")
    .replace(/\bstudio\b/gi, "")
    .replace(/\b\d+\s*bhk\b/gi, "")
    .replace(/\b\d+\s*br\b/gi, "");
  name = name
    .replace(/\((?:NOT\s+)?LIVE\)/gi, "")
    .replace(/\(FSA[^)]*\)/gi, "")
    .replace(/\(Not\s+Live\)/gi, "")
    .replace(/\(NOT\s+ON\s+PF\)/gi, "")
    .replace(/\[OFFLINE\]/gi, "")
    .replace(/\[NOT\s+LIVE\]/gi, "");
  name = name.replace(/^(?:Villa|Unit)\s+[\w-]+\s*,?\s*/i, "");
  name = name.replace(/[,\-/]+$/, "").replace(/\s+/g, " ").trim();
  return name || String(raw || "").trim();
}

function expandBoulevard(value) {
  return String(value || "").replace(/\bblvd\b\.?/gi, "Boulevard");
}

function replaceNumberWords(value) {
  const numberMap = {
    one: "1", two: "2", three: "3", four: "4", five: "5",
    six: "6", seven: "7", eight: "8", nine: "9", ten: "10",
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

function extractLocationId(loc) {
  return loc?.id || loc?.externalID || loc?.location_id || null;
}

function extractLocationName(loc) {
  return loc?.name || loc?.title || loc?.name_l1 || "Unknown";
}

function pickBestLocation(locations, buildingName) {
  const target = normalizeToken(buildingName);
  if (!target) return null;
  let best = null;
  let bestScore = -1;
  for (const loc of locations) {
    const name = extractLocationName(loc);
    const fullPath = loc?.full_name || loc?.path || (Array.isArray(loc?.location) ? loc.location.join(" ") : "");
    const normName = normalizeToken(name);
    const normFull = normalizeToken(fullPath);
    let score = 0;
    if (normName === target) score += 120;
    if (normName.includes(target) || target.includes(normName)) score += 70;
    if (normFull.includes(target)) score += 35;
    score += Math.max(0, 20 - Math.abs(name.length - buildingName.length));
    if (score > bestScore) { best = loc; bestScore = score; }
  }
  return best;
}

function toList(payload) {
  if (Array.isArray(payload)) return payload;
  if (!payload) return [];
  return payload.hits || payload.results || payload.transactions || [];
}

async function fetchWithRetry(url, options, retries) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(url, options);
    if (res.ok) return res.json();
    if (res.status === 429 && attempt < retries) {
      const delay = 2000 * Math.pow(2, attempt);
      console.log(`  429 rate limited, waiting ${delay}ms...`);
      await sleep(delay);
      continue;
    }
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text.slice(0, 200)}`);
  }
}

async function loadRegistryBuildings(buildingsFile) {
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

async function loadSheetBuildings(sheetUrl) {
  const sheetRes = await fetch(sheetUrl);
  if (!sheetRes.ok) throw new Error(`Sheet fetch failed (${sheetRes.status})`);
  const csvText = await sheetRes.text();

  const rows = parseCsvText(csvText);
  const { headers, records } = rowsToObjects(rows);
  const buildingCol = inferColumn(headers, COLUMN_ALIASES.building);
  if (!buildingCol) throw new Error("No building column found in sheet");

  const buildings = new Map();
  for (const record of records) {
    const raw = record[buildingCol];
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

async function loadBuildingTargets(buildingsFile, sheetUrl) {
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

async function main() {
  const dotEnv = await readDotEnv();
  const apiKey = process.env.RAPIDAPI_KEY || process.env.VITE_RAPIDAPI_KEY || dotEnv.RAPIDAPI_KEY || dotEnv.VITE_RAPIDAPI_KEY || await readApiKeyFromDotEnv();
  if (!apiKey) throw new Error("Missing RAPIDAPI_KEY");

  const buildingsFile = process.env.BUILDINGS_FILE || dotEnv.BUILDINGS_FILE || DEFAULT_BUILDINGS_FILE;
  const sheetUrl = process.env.SHEET_URL || dotEnv.SHEET_URL || DEFAULT_SHEET_URL;
  const monthWindow = Math.max(1, toInt(process.env.BAYUT_MONTH_WINDOW, 6));
  const requestDelayMs = Math.max(0, toInt(process.env.REQUEST_DELAY_MS, 1200));
  const retries = Math.max(0, toInt(process.env.REQUEST_RETRIES, 4));

  const apiHeaders = {
    "x-rapidapi-key": apiKey,
    "x-rapidapi-host": API_HOST,
    "Content-Type": "application/json",
  };

  const now = new Date();
  const startWindow = new Date(now.getFullYear(), now.getMonth() - monthWindow, now.getDate());
  const startDate = formatDate(startWindow);
  const endDate = formatDate(now);

  const targetSource = await loadBuildingTargets(buildingsFile, sheetUrl);
  const entries = targetSource.entries;
  console.log(`Loading ${entries.length} buildings from ${targetSource.sourceLabel} for a rolling ${monthWindow}-month Bayut window (${startDate} -> ${endDate})...`);

  const buildings = {};
  let succeeded = 0;
  let failed = 0;
  const errors = [];

  for (let i = 0; i < entries.length; i++) {
    const { buildingKey, searchName, searchCandidates, project, buildingType, status } = entries[i];
    console.log(`[${i + 1}/${entries.length}] ${searchName}`);

    if (i > 0 && requestDelayMs > 0) await sleep(requestDelayMs);

    try {
      let best = null;
      for (const candidate of searchCandidates) {
        const locPayload = await fetchWithRetry(
          `${BASE_URL}/locations_search?query=${encodeURIComponent(candidate)}`,
          { method: "GET", headers: apiHeaders },
          retries,
        );
        const locs = toList(locPayload);
        best = pickBestLocation(locs, candidate);
        if (best) break;
      }
      if (!best) throw new Error("No location match");

      const locationId = extractLocationId(best);
      if (!locationId) throw new Error("Location has no ID");
      const locationName = extractLocationName(best);

      if (requestDelayMs > 0) await sleep(requestDelayMs);

      // Fetch ALL pages of transactions
      let allTxs = [];
      let page = 0;
      while (true) {
        const txPayload = await fetchWithRetry(
          `${BASE_URL}/transactions?page=${page}`,
          {
            method: "POST",
            headers: apiHeaders,
            body: JSON.stringify({
              locations_ids: [locationId],
              start_date: startDate,
              end_date: endDate,
              purpose: "for-sale",
              category: "residential",
              completion_status: "completed",
              sort_by: "date",
              order: "desc",
            }),
          },
          retries,
        );
        const pageTxs = toList(txPayload);
        allTxs.push(...pageTxs);
        if (pageTxs.length < 20) break;
        page++;
        if (requestDelayMs > 0) await sleep(requestDelayMs);
      }

      buildings[buildingKey] = {
        searchName,
        locationName,
        locationId,
        project,
        buildingType,
        status,
        transactions: allTxs,
      };
      console.log(`  -> ${allTxs.length} transactions (${page + 1} pages)`);
      succeeded++;
    } catch (err) {
      console.error(`  -> ERROR: ${err.message}`);
      errors.push({ building: searchName, buildingKey, error: err.message });
      failed++;
    }
  }

  const totalTransactions = Object.values(buildings).reduce((sum, b) => sum + b.transactions.length, 0);

  // --- Sync to Supabase ---
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || dotEnv.SUPABASE_URL || dotEnv.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || dotEnv.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || dotEnv.VITE_SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseKey) {
    console.log(`\nSyncing to Supabase...`);
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Upsert buildings
    const buildingRows = Object.entries(buildings).map(([key, b]) => ({
      key,
      search_name: b.searchName || key,
      location_name: b.locationName || null,
      location_id: b.locationId || null,
    }));
    const { error: bErr } = await supabase.from("buildings").upsert(buildingRows, { onConflict: "key" });
    if (bErr) console.error("Buildings upsert error:", bErr.message);
    else console.log(`  Buildings upserted: ${buildingRows.length}`);

    // Delete old transactions for these buildings, then insert fresh
    const buildingKeys = Object.keys(buildings);
    const { error: delErr } = await supabase.from("transactions").delete().in("building_key", buildingKeys);
    if (delErr) console.error("Transactions delete error:", delErr.message);

    // Insert in batches
    let txCount = 0;
    const batchSize = 200;
    let txBatch = [];

    for (const [key, b] of Object.entries(buildings)) {
      for (const tx of b.transactions || []) {
        txBatch.push({
          building_key: key,
          amount: tx.amount ? parseFloat(tx.amount) : null,
          category: tx.category || null,
          date: tx.date || null,
          floor: tx.property?.floor || null,
          beds: tx.property?.beds || null,
          property_type: tx.property?.type || null,
          builtup_area_sqft: tx.property?.builtup_area?.sqft || null,
          occupancy_status: tx.property?.occupancy_status || null,
          location_name: tx.location?.location || null,
          full_location: tx.location?.full_location || null,
          latitude: tx.location?.coordinates?.latitude || null,
          longitude: tx.location?.coordinates?.longitude || null,
        });

        if (txBatch.length >= batchSize) {
          const { error } = await supabase.from("transactions").insert(txBatch);
          if (error) { console.error("Tx batch error:", error.message); break; }
          txCount += txBatch.length;
          txBatch = [];
        }
      }
    }
    if (txBatch.length) {
      const { error } = await supabase.from("transactions").insert(txBatch);
      if (error) console.error("Final batch error:", error.message);
      else txCount += txBatch.length;
    }
    console.log(`  Transactions synced: ${txCount}`);
  } else {
    console.log("\nNo SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY set, skipping Supabase sync.");
  }

  // --- Also write local JSON as fallback ---
  const output = {
    generatedAt: new Date().toISOString(),
    period: { startDate, endDate },
    summary: { totalBuildings: entries.length, succeeded, failed, totalTransactions },
    buildings,
    errors,
  };

  await fs.mkdir(path.dirname(OUTPUT_FILE), { recursive: true });
  await fs.writeFile(OUTPUT_FILE, JSON.stringify(output, null, 2), "utf8");

  console.log(`\nDone! Also written to ${OUTPUT_FILE}`);
  console.log(`Buildings: ${succeeded}/${entries.length} succeeded`);
  console.log(`Total transactions: ${totalTransactions}`);
  if (errors.length) console.log(`Errors: ${errors.length}`);

  if (process.env.GITHUB_STEP_SUMMARY) {
    const summary = [
      "## Bayut Batch Fetch",
      `- Date window: ${startDate} to ${endDate}`,
      `- Buildings: ${succeeded}/${entries.length} succeeded`,
      `- Total transactions: ${totalTransactions}`,
      `- Errors: ${errors.length}`,
    ].join("\n");
    await fs.appendFile(process.env.GITHUB_STEP_SUMMARY, `${summary}\n`, "utf8");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
