import fs from "node:fs/promises";
import path from "node:path";

const DEFAULT_SHEET_URL = "https://docs.google.com/spreadsheets/d/1-DgZjG5T93t5zmrHmyekKkOLwCRIYEMMOK4AbOrYOVU/export?format=csv&gid=865690319";
const BASE_URL = "https://uae-real-estate2.p.rapidapi.com";
const API_HOST = "uae-real-estate2.p.rapidapi.com";
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

const COLUMN_ALIASES = {
  name: ["name", "seller", "seller name", "owner", "owner name", "client", "lead name", "full name"],
  building: ["building", "tower", "project", "community", "building name", "tower name"],
  bedroom: ["bedroom", "bedrooms", "beds", "bed", "unit type", "bhk"],
  status: ["status", "stage", "category", "lead status", "pipeline", "contact status"],
  lastContact: ["last contact", "last contact date", "contact date", "last followup", "last follow up", "last message", "last contacted", "date"],
};

function toInt(raw, fallback) {
  const value = Number(raw);
  if (!Number.isFinite(value)) return fallback;
  return Math.floor(value);
}

async function readApiKeyFromDotEnv() {
  try {
    const raw = await fs.readFile(".env", "utf8");
    const lines = raw.split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      if (trimmed.startsWith("RAPIDAPI_KEY=")) return trimmed.split("=", 2)[1].trim();
      if (trimmed.startsWith("VITE_RAPIDAPI_KEY=")) return trimmed.split("=", 2)[1].trim();
    }
  } catch {
    return null;
  }
  return null;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeToken(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function inferColumn(headers, aliases) {
  const normalizedHeaders = headers.map((header) => ({ header, normalized: normalizeToken(header) }));
  const normalizedAliases = aliases.map((alias) => normalizeToken(alias));

  for (const alias of normalizedAliases) {
    const exactMatch = normalizedHeaders.find((header) => header.normalized === alias);
    if (exactMatch) return exactMatch.header;
  }

  for (const alias of normalizedAliases.filter((value) => value.length >= 5)) {
    const partialMatch = normalizedHeaders.find((header) => header.normalized.includes(alias));
    if (partialMatch) return partialMatch.header;
  }

  return null;
}

function inferMapping(headers) {
  return {
    name: inferColumn(headers, COLUMN_ALIASES.name),
    building: inferColumn(headers, COLUMN_ALIASES.building),
    bedroom: inferColumn(headers, COLUMN_ALIASES.bedroom),
    status: inferColumn(headers, COLUMN_ALIASES.status),
    lastContact: inferColumn(headers, COLUMN_ALIASES.lastContact),
  };
}

function mappingScore(mapping) {
  let score = 0;
  if (mapping.name) score += 2;
  if (mapping.building) score += 3;
  if (mapping.bedroom) score += 1;
  if (mapping.status) score += 3;
  if (mapping.lastContact) score += 3;
  return score;
}

function parseCsvText(text) {
  const source = String(text || "").replace(/^\uFEFF/, "");
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];

    if (inQuotes) {
      if (char === "\"") {
        if (source[i + 1] === "\"") {
          field += "\"";
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === "\"") {
      inQuotes = true;
      continue;
    }
    if (char === ",") {
      row.push(field);
      field = "";
      continue;
    }
    if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      continue;
    }
    if (char !== "\r") field += char;
  }

  row.push(field);
  if (row.some((value) => String(value).trim() !== "")) rows.push(row);
  return rows;
}

function makeHeadersUnique(headers) {
  const counts = {};
  return headers.map((header) => {
    const base = String(header || "").trim() || "Column";
    counts[base] = (counts[base] || 0) + 1;
    return counts[base] === 1 ? base : `${base} (${counts[base]})`;
  });
}

function rowsToObjects(rows) {
  if (!rows.length) return { headers: [], records: [] };

  const scanLimit = Math.min(rows.length, 40);
  let headerRowIndex = 0;
  let bestScore = -1;

  for (let rowIndex = 0; rowIndex < scanLimit; rowIndex += 1) {
    const candidateHeaders = rows[rowIndex].map((value, index) => {
      const label = String(value || "").trim();
      return label || `Column ${index + 1}`;
    });
    const score = mappingScore(inferMapping(candidateHeaders));
    if (score > bestScore) {
      bestScore = score;
      headerRowIndex = rowIndex;
    }
  }

  const rawHeaders = rows[headerRowIndex].map((value, index) => {
    const label = String(value || "").trim();
    return label || `Column ${index + 1}`;
  });
  const headers = makeHeadersUnique(rawHeaders);

  const records = rows
    .slice(headerRowIndex + 1)
    .filter((row) => row.some((value) => String(value || "").trim() !== ""))
    .map((row, dataIndex) => {
      const record = { __row: headerRowIndex + 2 + dataIndex };
      headers.forEach((header, colIndex) => {
        record[header] = String(row[colIndex] ?? "").trim();
      });
      return record;
    });

  return { headers, records };
}

function cleanBuildingName(raw) {
  let name = String(raw || "").trim();

  const aptMatch = name.match(/^(?:\[.*?\]\s*)?Apartment\s+[\w-]+(?:\s*\(.*?\))?\s*,\s*(.+)/i);
  if (aptMatch) {
    const parts = aptMatch[1].split(",").map((part) => part.trim());
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

function parseBedroom(rawValue) {
  const raw = String(rawValue || "").trim();
  if (!raw) return { label: "unit", beds: null };
  const lower = raw.toLowerCase();
  if (lower.includes("studio")) return { label: "studio", beds: [0] };
  const match = lower.match(/(\d+)/);
  if (match) {
    const bedCount = Number(match[1]);
    if (Number.isFinite(bedCount) && bedCount >= 0 && bedCount <= 8) {
      return { label: `${bedCount}-bed`, beds: [bedCount] };
    }
  }
  return { label: raw, beds: null };
}

function parseNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const parsed = Number(value.replace(/[,\s]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function extractPrice(tx) {
  for (const value of [tx?.price, tx?.amount, tx?.sale_price, tx?.sold_price, tx?.transaction_value, tx?.value]) {
    const parsed = parseNumber(value);
    if (parsed && parsed > 0) return parsed;
  }
  return null;
}

function extractArea(tx) {
  for (const value of [
    tx?.area,
    tx?.built_up_area,
    tx?.size,
    tx?.sqft,
    tx?.area_sqft,
    tx?.property?.builtup_area?.sqft,
  ]) {
    const parsed = parseNumber(value);
    if (parsed && parsed > 0) return parsed;
  }
  return null;
}

function summarizeTransactions(transactions) {
  const prices = [];
  const psfValues = [];

  for (const tx of transactions) {
    const price = extractPrice(tx);
    if (!price) continue;
    prices.push(price);
    const area = extractArea(tx);
    if (area) psfValues.push(price / area);
  }

  if (!prices.length) return { count: transactions.length, avg: null, min: null, max: null, psf: null };

  return {
    count: transactions.length,
    avg: prices.reduce((sum, price) => sum + price, 0) / prices.length,
    min: Math.min(...prices),
    max: Math.max(...prices),
    psf: psfValues.length ? psfValues.reduce((sum, value) => sum + value, 0) / psfValues.length : null,
  };
}

function toList(payload) {
  if (Array.isArray(payload)) return payload;
  if (!payload) return [];
  return payload.hits || payload.results || payload.transactions || [];
}

function extractLocationId(location) {
  return location?.id || location?.externalID || location?.location_id || null;
}

function extractLocationName(location) {
  return location?.name || location?.title || location?.name_l1 || "Unknown";
}

function pickBestLocation(locations, buildingName) {
  const target = normalizeToken(buildingName);
  if (!target) return null;

  let best = null;
  let bestScore = -1;

  for (const location of locations) {
    const name = extractLocationName(location);
    const fullPath = location?.full_name
      || location?.path
      || (Array.isArray(location?.location) ? location.location.join(" ") : "");

    const normalizedName = normalizeToken(name);
    const normalizedFullPath = normalizeToken(fullPath);

    let score = 0;
    if (normalizedName === target) score += 120;
    if (normalizedName.includes(target) || target.includes(normalizedName)) score += 70;
    if (normalizedFullPath.includes(target)) score += 35;
    score += Math.max(0, 20 - Math.abs(name.length - buildingName.length));

    if (score > bestScore) {
      best = location;
      bestScore = score;
    }
  }

  return best;
}

async function fetchWithRetry(url, options, endpoint, usage, retries) {
  usage.requests.logical += 1;
  usage.requests.byEndpoint[endpoint] = (usage.requests.byEndpoint[endpoint] || 0) + 1;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    usage.requests.attempts += 1;
    const response = await fetch(url, options);
    usage.requests.byStatus[response.status] = (usage.requests.byStatus[response.status] || 0) + 1;

    const responseText = await response.text();
    let json;
    try {
      json = JSON.parse(responseText);
    } catch {
      json = { raw: responseText };
    }

    if (response.ok) return json;

    if (response.status === 429 && attempt < retries) {
      usage.requests.retry429 += 1;
      const delay = 2000 * Math.pow(2, attempt);
      await sleep(delay);
      continue;
    }

    const message = json?.message || json?.raw || `HTTP ${response.status}`;
    throw new Error(`${endpoint} failed (${response.status}): ${message}`);
  }

  throw new Error(`${endpoint} failed after retries`);
}

async function main() {
  const apiKey = process.env.RAPIDAPI_KEY || process.env.VITE_RAPIDAPI_KEY || await readApiKeyFromDotEnv();
  if (!apiKey) throw new Error("Missing RAPIDAPI_KEY secret");

  const sheetUrl = process.env.SHEET_URL || DEFAULT_SHEET_URL;
  const groupLimit = Math.max(0, toInt(process.env.ENRICH_GROUP_LIMIT, 0));
  const requestDelayMs = Math.max(0, toInt(process.env.REQUEST_DELAY_MS, 1200));
  const retries = Math.max(0, toInt(process.env.REQUEST_RETRIES, 4));
  const reportDir = process.env.REPORT_DIR || "reports";
  const failOnError = String(process.env.FAIL_ON_ERROR || "0") === "1";

  const usage = {
    requests: {
      logical: 0,
      attempts: 0,
      retry429: 0,
      byEndpoint: {
        locations_search: 0,
        transactions: 0,
      },
      byStatus: {},
    },
  };

  const apiHeaders = {
    "x-rapidapi-key": apiKey,
    "x-rapidapi-host": API_HOST,
    "Content-Type": "application/json",
  };

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const startDate = `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, "0")}-${String(monthStart.getDate()).padStart(2, "0")}`;
  const endDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const sheetResponse = await fetch(sheetUrl);
  if (!sheetResponse.ok) throw new Error(`Sheet fetch failed (${sheetResponse.status})`);
  const csvText = await sheetResponse.text();

  const rows = parseCsvText(csvText);
  const { headers, records } = rowsToObjects(rows);
  const mapping = inferMapping(headers);

  if (!mapping.name || !mapping.building || !mapping.status || !mapping.lastContact) {
    throw new Error("Could not detect required columns (name, building, status, date)");
  }

  const leads = records
    .map((record, index) => ({
      id: `${record.__row || index + 2}-${index}`,
      name: mapping.name ? record[mapping.name] : "",
      building: mapping.building ? record[mapping.building] : "",
      bedroom: mapping.bedroom ? record[mapping.bedroom] : "",
      bedroomInfo: parseBedroom(mapping.bedroom ? record[mapping.bedroom] : ""),
    }))
    .filter((lead) => lead.building);

  const groupsByKey = {};
  for (const lead of leads) {
    const cleanedBuilding = cleanBuildingName(lead.building);
    const buildingKey = normalizeToken(cleanedBuilding);
    if (!buildingKey) continue;

    const beds = Array.isArray(lead.bedroomInfo.beds) && lead.bedroomInfo.beds.length
      ? [...lead.bedroomInfo.beds].sort((a, b) => a - b)
      : null;
    const bedKey = beds ? beds.join(",") : "any";
    const groupKey = `${buildingKey}::${bedKey}`;

    if (!groupsByKey[groupKey]) {
      groupsByKey[groupKey] = {
        groupKey,
        buildingKey,
        searchName: cleanedBuilding,
        beds,
        leadCount: 0,
      };
    }
    groupsByKey[groupKey].leadCount += 1;
  }

  const allGroups = Object.values(groupsByKey);
  const activeGroups = groupLimit > 0 ? allGroups.slice(0, groupLimit) : allGroups;
  if (!activeGroups.length) throw new Error("No groups to process");

  const locationByBuilding = new Map();
  const groupResults = [];
  const errors = [];

  for (let i = 0; i < activeGroups.length; i += 1) {
    const group = activeGroups[i];

    if (i > 0 && requestDelayMs > 0) await sleep(requestDelayMs);

    try {
      let location = locationByBuilding.get(group.buildingKey) || null;
      if (!location) {
        const locPayload = await fetchWithRetry(
          `${BASE_URL}/locations_search?query=${encodeURIComponent(group.searchName)}`,
          { method: "GET", headers: apiHeaders },
          "locations_search",
          usage,
          retries,
        );
        const locations = toList(locPayload);
        const best = pickBestLocation(locations, group.searchName);
        if (!best) throw new Error(`No location match for "${group.searchName}"`);
        location = best;
        locationByBuilding.set(group.buildingKey, location);
      }

      const locationId = extractLocationId(location);
      if (!locationId) throw new Error("Location has no ID");

      if (requestDelayMs > 0) await sleep(requestDelayMs);

      const strictPayload = await fetchWithRetry(
        `${BASE_URL}/transactions?page=0`,
        {
          method: "POST",
          headers: apiHeaders,
          body: JSON.stringify({
            locations_ids: [locationId],
            start_date: startDate,
            end_date: endDate,
            beds: group.beds || undefined,
            purpose: "for-sale",
            category: "residential",
            completion_status: "completed",
            sort_by: "date",
            order: "desc",
          }),
        },
        "transactions",
        usage,
        retries,
      );

      let transactions = toList(strictPayload);
      let usedFallback = false;

      if (!transactions.length && group.beds?.length) {
        usedFallback = true;
        if (requestDelayMs > 0) await sleep(Math.max(400, Math.floor(requestDelayMs / 2)));
        const fallbackPayload = await fetchWithRetry(
          `${BASE_URL}/transactions?page=0`,
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
          "transactions",
          usage,
          retries,
        );
        transactions = toList(fallbackPayload);
      }

      const metrics = summarizeTransactions(transactions);
      groupResults.push({
        groupKey: group.groupKey,
        searchName: group.searchName,
        leadCount: group.leadCount,
        beds: group.beds,
        usedFallback,
        locationName: extractLocationName(location),
        locationId,
        metrics,
      });
    } catch (error) {
      errors.push({
        groupKey: group.groupKey,
        searchName: group.searchName,
        leadCount: group.leadCount,
        message: error.message,
      });
    }
  }

  const totals = {
    leadsWithBuilding: leads.length,
    totalGroups: allGroups.length,
    groupsProcessed: activeGroups.length,
    groupsSucceeded: groupResults.length,
    groupsFailed: errors.length,
  };

  const report = {
    generatedAt: new Date().toISOString(),
    sheetUrl,
    period: {
      startDate,
      endDate,
    },
    config: {
      groupLimit,
      requestDelayMs,
      retries,
    },
    totals,
    usage,
    groups: groupResults,
    errors,
  };

  await fs.mkdir(reportDir, { recursive: true });
  const reportFile = path.join(reportDir, `daily-enrichment-${endDate}.json`);
  await fs.writeFile(reportFile, JSON.stringify(report, null, 2), "utf8");

  console.log(`Report written: ${reportFile}`);
  console.log(`Groups: ${totals.groupsSucceeded}/${totals.groupsProcessed} succeeded`);
  console.log(`Requests (logical): ${usage.requests.logical}`);
  console.log(`Requests (attempts): ${usage.requests.attempts}`);
  console.log(`429 retries: ${usage.requests.retry429}`);

  const summary = [
    "## Daily Enrichment Report",
    "",
    `- Date window: ${startDate} to ${endDate}`,
    `- Groups processed: ${totals.groupsProcessed}`,
    `- Groups succeeded: ${totals.groupsSucceeded}`,
    `- Groups failed: ${totals.groupsFailed}`,
    `- API requests (logical): ${usage.requests.logical}`,
    `- API requests (attempts): ${usage.requests.attempts}`,
    `- 429 retries: ${usage.requests.retry429}`,
    `- Report file: \`${reportFile}\``,
  ].join("\n");

  console.log(summary);
  if (process.env.GITHUB_STEP_SUMMARY) {
    await fs.appendFile(process.env.GITHUB_STEP_SUMMARY, `${summary}\n`, "utf8");
  }

  if (groupResults.length === 0) {
    throw new Error("No groups succeeded");
  }
  if (failOnError && errors.length > 0) {
    throw new Error(`Run had ${errors.length} group errors`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
