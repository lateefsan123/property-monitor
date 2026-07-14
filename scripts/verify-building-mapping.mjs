import fs from "node:fs/promises";
import pg from "pg";
import { createServer } from "vite";
import { extractLocationName } from "./lib/bayut-common.mjs";

const { Client } = pg;

function parseEnvText(text) {
  const env = new Map();

  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith("\"") && value.endsWith("\""))
      || (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    env.set(key, value);
  }

  return env;
}

async function loadDotEnv() {
  try {
    return parseEnvText(await fs.readFile(".env", "utf8"));
  } catch {
    return new Map();
  }
}

function getEnv(env, name) {
  return process.env[name] || env.get(name) || "";
}

function buildPgConfig(rawUrl) {
  const url = new URL(rawUrl);
  const userFromUrl = decodeURIComponent(url.username || "");

  return {
    host: process.env.SUPABASE_DB_HOST || "aws-1-eu-west-1.pooler.supabase.com",
    port: Number(process.env.SUPABASE_DB_PORT || 6543),
    user: process.env.SUPABASE_DB_USER || (userFromUrl.includes(".") ? userFromUrl : "postgres.zrqxaammmrydkekbphqa"),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, "") || "postgres",
    ssl: { rejectUnauthorized: false },
  };
}

function normalizeToken(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function dedupeIncomingLeads(leads, sourceId = null) {
  const seen = new Set();
  const result = [];

  for (const lead of leads || []) {
    const key = [
      sourceId ?? lead?.source_id ?? "legacy",
      normalizeToken(lead?.name),
      normalizeToken(lead?.building),
      normalizeToken(lead?.unit),
      normalizeToken(lead?.bedroom),
      String(lead?.phone || "").replace(/[^0-9]/g, ""),
    ].join(":");

    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(lead);
  }

  return result;
}

async function verifyRegistry(vite) {
  const buildingUtils = await vite.ssrLoadModule("/src/features/seller-signal/building-utils.js");
  const registry = JSON.parse(await fs.readFile("public/data/downtown-dubai-building-registry.json", "utf8"));
  const misses = [];
  const regressions = [];
  let checkedNames = 0;

  for (const building of registry.buildings || []) {
    const canonical = building.canonical_name || building.canonicalName || building.name;
    for (const name of [canonical, ...(building.aliases || [])]) {
      checkedNames += 1;
      const match = buildingUtils.getKnownBuildingMatch(name);
      if (match.status !== "matched") misses.push({ canonical, name, status: match.status });
    }
  }

  const expectedMappings = new Map([
    ["City Center Residences", "City Center Residences, Downtown Dubai"],
    ["Imperial Avenue", "Imperial Avenue, Downtown Dubai"],
    ["Burj Lake Hotel - The Address DownTown", "The Address Downtown Hotel, Downtown Dubai"],
    ["BD 29 BLVD PODIUM", "29 Boulevard, Downtown Dubai"],
  ]);
  for (const [input, expected] of expectedMappings) {
    const actual = buildingUtils.canonicalizeBuildingName(input);
    if (actual !== expected) regressions.push({ input, expected, actual });
  }

  return {
    checkedBuildings: registry.buildings?.length || 0,
    checkedNames,
    unmatchedNameCount: misses.length,
    misses: misses.slice(0, 20),
    regressionCount: regressions.length,
    regressions,
  };
}

async function openDatabase(env) {
  const dbUrl = getEnv(env, "SUPABASE_DB_URL");
  if (!dbUrl) return null;

  const client = new Client(buildPgConfig(dbUrl));
  await client.connect();
  return client;
}

async function fetchCachedBuildings(client) {
  if (!client) return [];
  const { rows } = await client.query("select key, search_name, location_name, location_id from buildings order by search_name");
  return rows;
}

function hasTruncationMarker(value) {
  return /\u2026|\.{3,}/.test(String(value || ""));
}

function isUsableCachedLabel(value) {
  const label = String(value || "").replace(/\s+/g, " ").trim();
  return Boolean(
    label
    && label !== "0"
    && /[a-z]/i.test(label)
    && !hasTruncationMarker(label),
  );
}

function verifyCachedBuildingCache(cachedBuildings) {
  const invalidLocationRows = [];
  const unusableRows = [];

  for (const building of cachedBuildings || []) {
    if (!isUsableCachedLabel(building.location_name)) {
      invalidLocationRows.push({
        key: building.key,
        searchName: building.search_name,
        locationName: building.location_name,
      });
    }

    if (!isUsableCachedLabel(building.location_name) && !isUsableCachedLabel(building.search_name)) {
      unusableRows.push({
        key: building.key,
        searchName: building.search_name,
        locationName: building.location_name,
      });
    }
  }

  return {
    checked: cachedBuildings?.length || 0,
    invalidLocationCount: invalidLocationRows.length,
    invalidLocationRows: invalidLocationRows.slice(0, 20),
    unusableRowCount: unusableRows.length,
    unusableRows: unusableRows.slice(0, 20),
  };
}

async function verifySheet(vite, env, cachedBuildings) {
  const sheetUrl = getEnv(env, "VERIFY_SHEET_URL");
  if (!sheetUrl) return { skipped: true, reason: "Set VERIFY_SHEET_URL to check a Google Sheet import." };

  const spreadsheet = await vite.ssrLoadModule("/src/features/seller-signal/spreadsheet.js");
  const leadUtils = await vite.ssrLoadModule("/src/features/seller-signal/lead-utils.js");
  const dataQuality = await vite.ssrLoadModule("/src/features/seller-signal/lead-data-quality.js");
  const qualityReport = await vite.ssrLoadModule("/src/features/seller-signal/import-quality-report.js");

  const response = await fetch(spreadsheet.buildGoogleCsvUrl(sheetUrl));
  if (!response.ok) throw new Error(`Sheet fetch failed ${response.status}`);

  const { headers, records } = spreadsheet.rowsToObjects(spreadsheet.parseCsvText(await response.text()));
  const mapping = spreadsheet.inferMapping(headers);
  const resolveBuilding = dataQuality.createLeadBuildingResolver([], cachedBuildings);
  const rawLeads = records
    .map((record) => leadUtils.createLeadInsertRecord(record, mapping, "verify-user", {
      sourceId: "verify-source",
      defaultStatus: "Prospect",
      resolveBuilding,
    }))
    .filter(Boolean);
  const dedupedLeads = dedupeIncomingLeads(rawLeads, "verify-source");
  const quality = qualityReport.buildImportQualityReport(rawLeads, dedupedLeads, { cachedBuildings });
  const sourceResolution = collectSourceResolutionReport(records, mapping, resolveBuilding);

  return {
    rows: records.length,
    validLeads: rawLeads.length,
    dedupedLeads: dedupedLeads.length,
    matchedBuildings: quality.building.matched,
    staticMatchedBuildings: quality.building.static,
    cachedMatchedBuildings: quality.building.cached,
    customAliasMatchedBuildings: quality.building.customAlias,
    matchedByMethod: quality.building.matchedByMethod,
    sourceResolution,
    sourceTruncatedBuildings: sourceResolution.byMethod.truncated || 0,
    sourceInvalidBuildings: sourceResolution.invalid,
    sourceUnmatchedBuildings: sourceResolution.unmatched,
    missingBuildings: quality.building.missing,
    invalidBuildings: quality.building.invalid,
    invalidExamples: quality.building.invalidExamples,
    unmatchedBuildings: quality.building.unmatched,
    unmatchedExamples: quality.building.unmatchedExamples,
    missing: quality.missing,
  };
}

function collectSourceResolutionReport(records, mapping, resolveBuilding, maxExamples = 5) {
  const examplesByMethod = new Map();
  const byMethod = {};
  const methodCounts = {};
  let matched = 0;
  let cached = 0;
  let customAlias = 0;
  let staticMatched = 0;
  let missing = 0;
  let invalid = 0;
  let unmatched = 0;

  for (const record of records || []) {
    const rawBuilding = mapping.building ? record[mapping.building] : "";
    const match = resolveBuilding(rawBuilding);
    const method = match.method || match.status || "unknown";
    byMethod[method] = (byMethod[method] || 0) + 1;

    if (match.status === "matched") {
      matched += 1;
      methodCounts[method] = (methodCounts[method] || 0) + 1;
      if (method.startsWith("cached_")) cached += 1;
      else if (method === "custom_alias") customAlias += 1;
      else staticMatched += 1;
    } else if (match.status === "missing") {
      missing += 1;
    } else if (match.status === "invalid") {
      invalid += 1;
    } else {
      unmatched += 1;
    }

    if (!examplesByMethod.has(method)) examplesByMethod.set(method, []);
    const examples = examplesByMethod.get(method);
    if (examples.length < maxExamples) {
      examples.push({
        input: match.inputName || rawBuilding || "",
        canonical: match.canonicalName || "",
        status: match.status,
        confidence: match.confidence,
      });
    }
  }

  return {
    matched,
    static: staticMatched,
    cached,
    customAlias,
    missing,
    invalid,
    unmatched,
    byMethod,
    matchedByMethod: methodCounts,
    examplesByMethod: Object.fromEntries([...examplesByMethod.entries()].sort(([left], [right]) => left.localeCompare(right))),
  };
}

async function verifyCachedImportCanonicalization(vite) {
  const leadUtils = await vite.ssrLoadModule("/src/features/seller-signal/lead-utils.js");
  const dataQuality = await vite.ssrLoadModule("/src/features/seller-signal/lead-data-quality.js");
  const cachedBuildings = [
    {
      key: "syntheticcachetower",
      search_name: "Synthetic Cache Tower",
      location_name: "Synthetic Cache Tower Official",
      location_id: "verify-only",
    },
  ];
  const resolveBuilding = dataQuality.createLeadBuildingResolver([], cachedBuildings);
  const lead = leadUtils.createLeadInsertRecord(
    {
      Name: "Verifier",
      Building: "Synthetic Cache Tower Official",
      Bedroom: "2BR",
      Phone: "971500000000",
    },
    {
      name: "Name",
      building: "Building",
      bedroom: "Bedroom",
      phone: "Phone",
    },
    "verify-user",
    {
      sourceId: "verify-source",
      defaultStatus: "Prospect",
      resolveBuilding,
    },
  );

  return {
    input: "Synthetic Cache Tower Official",
    storedBuilding: lead?.building || null,
    expectedBuilding: "Synthetic Cache Tower",
    passed: lead?.building === "Synthetic Cache Tower",
  };
}

async function verifyAddressBuildingParsing(vite) {
  const leadUtils = await vite.ssrLoadModule("/src/features/seller-signal/lead-utils.js");
  const dataQuality = await vite.ssrLoadModule("/src/features/seller-signal/lead-data-quality.js");
  const resolveBuilding = dataQuality.createLeadBuildingResolver([], []);
  const resolveWithCachedPrefixBuildings = dataQuality.createLeadBuildingResolver([], [
    {
      key: "trillionaireresid",
      search_name: "Trillionaire Residences by Binghatti",
      location_name: "Trillionaire Residences by Binghatti",
    },
  ]);
  const resolveWithEquivalentCachedPrefixBuildings = dataQuality.createLeadBuildingResolver([], [
    {
      key: "kempinskiblvd",
      search_name: "Kempinski BLVD...",
      location_name: "Kempinski The Boulevard (The Address The Blvd)",
    },
    {
      key: "kempinskitheboulevard",
      search_name: "Kempinski The Boulevard",
      location_name: "Kempinski The Boulevard",
    },
  ]);
  const resolveWithConflictingCachedPrefixBuildings = dataQuality.createLeadBuildingResolver([], [
    {
      key: "damacmaisonprive",
      search_name: "DAMAC Maison Prive",
      location_name: "DAMAC Maison Prive",
    },
    {
      key: "damacmaisondistinction",
      search_name: "DAMAC Maison Distinction",
      location_name: "DAMAC Maison The Distinction",
    },
  ]);
  const resolveWithResolvedTruncatedCacheBuildings = dataQuality.createLeadBuildingResolver([], [
    {
      key: "opera",
      search_name: "Opera…",
      location_name: "Opera Grand",
    },
  ]);

  const recoverable = resolveBuilding("Apartment 702, Boulevard Point, Downtown D...");
  const unrecoverable = resolveBuilding("Apartment 901 (NOT LIVE), The A...");
  const staticPrefix = resolveBuilding("Apartment 1603, Kempinski BLVD...");
  const staticPrefixWithEquivalentCache = resolveWithEquivalentCachedPrefixBuildings("Apartment 1516, Kempinski The B...");
  const cachedPrefix = resolveWithCachedPrefixBuildings("Apartment 1007, Trillionaire Resid...");
  const cachedResolvedTruncated = resolveWithResolvedTruncatedCacheBuildings("Apartment 804, Opera…");
  const projectLevelBoulevardCentral = resolveBuilding("Apartment 1108, Boulevard Centr...");
  const projectLevelBlvdHeights = resolveBuilding("Apartment 1706, BLVD Heights To...");
  const projectLevelForteTruncated = resolveBuilding("Apartment 1608 (NOT LIVE), Forte...");
  const projectLevelAykon = resolveBuilding("Apartment 1702, Aykon City Towe...");
  const terracesMarasi = resolveBuilding("Apartment 1705, Terraces Marasi...");
  const shortUniquePrefix = resolveBuilding("Apartment 1404 (NOT LIVE), Aha...");
  const ambiguousStaticPrefix = resolveBuilding("Apartment 1203, Damac Maiso...");
  const ambiguousCachePrefix = resolveWithConflictingCachedPrefixBuildings("Apartment 1203, Damac Maiso...");
  const projectLevelForte = resolveBuilding("Forte 3 bed");
  const projectLevelAddressTypo = resolveBuilding("Adress fountain views one bed");
  const numericBuilding = resolveBuilding("553923920");
  const statusBuilding = resolveBuilding("Prospect");
  const imported = leadUtils.createLeadInsertRecord(
    {
      Name: "Verifier",
      Building: "Apartment 702, Boulevard Point, Downtown Dubai",
      Bedroom: "2BR",
      Phone: "971500000000",
    },
    {
      name: "Name",
      building: "Building",
      bedroom: "Bedroom",
      phone: "Phone",
    },
    "verify-user",
    {
      sourceId: "verify-source",
      defaultStatus: "Prospect",
      resolveBuilding,
    },
  );
  const invalidImported = leadUtils.createLeadInsertRecord(
    {
      Name: "Verifier",
      Building: "553923920",
      Bedroom: "2BR",
      Phone: "971500000000",
    },
    {
      name: "Name",
      building: "Building",
      bedroom: "Bedroom",
      phone: "Phone",
    },
    "verify-user",
    {
      sourceId: "verify-source",
      defaultStatus: "Prospect",
      resolveBuilding,
    },
  );

  return {
    recoverable: {
      status: recoverable.status,
      method: recoverable.method,
      canonicalName: recoverable.canonicalName,
      passed: recoverable.status === "matched" && recoverable.canonicalName === "Boulevard Point, Downtown Dubai",
    },
    unrecoverable: {
      status: unrecoverable.status,
      method: unrecoverable.method,
      passed: unrecoverable.status === "unmatched" && unrecoverable.method === "truncated",
    },
    staticPrefix: {
      status: staticPrefix.status,
      method: staticPrefix.method,
      canonicalName: staticPrefix.canonicalName,
      passed: staticPrefix.status === "matched" && staticPrefix.canonicalName === "Kempinski The Boulevard (The Address The Blvd)",
    },
    staticPrefixWithEquivalentCache: {
      status: staticPrefixWithEquivalentCache.status,
      method: staticPrefixWithEquivalentCache.method,
      canonicalName: staticPrefixWithEquivalentCache.canonicalName,
      passed: staticPrefixWithEquivalentCache.status === "matched"
        && staticPrefixWithEquivalentCache.canonicalName === "Kempinski The Boulevard (The Address The Blvd)",
    },
    cachedPrefix: {
      status: cachedPrefix.status,
      method: cachedPrefix.method,
      canonicalName: cachedPrefix.canonicalName,
      passed: cachedPrefix.status === "matched" && cachedPrefix.canonicalName === "Trillionaire Residences by Binghatti",
    },
    cachedResolvedTruncated: {
      status: cachedResolvedTruncated.status,
      method: cachedResolvedTruncated.method,
      canonicalName: cachedResolvedTruncated.canonicalName,
      passed: cachedResolvedTruncated.status === "matched"
        && cachedResolvedTruncated.method === "truncated_cache_resolved"
        && cachedResolvedTruncated.canonicalName === "Opera Grand",
    },
    projectLevelBoulevardCentral: {
      status: projectLevelBoulevardCentral.status,
      method: projectLevelBoulevardCentral.method,
      canonicalName: projectLevelBoulevardCentral.canonicalName,
      passed: projectLevelBoulevardCentral.status === "matched"
        && projectLevelBoulevardCentral.method === "truncated_project"
        && projectLevelBoulevardCentral.canonicalName === "Boulevard Central, Downtown Dubai",
    },
    projectLevelBlvdHeights: {
      status: projectLevelBlvdHeights.status,
      method: projectLevelBlvdHeights.method,
      canonicalName: projectLevelBlvdHeights.canonicalName,
      passed: projectLevelBlvdHeights.status === "matched"
        && projectLevelBlvdHeights.method === "truncated_project"
        && projectLevelBlvdHeights.canonicalName === "BLVD Heights, Downtown Dubai",
    },
    projectLevelForteTruncated: {
      status: projectLevelForteTruncated.status,
      method: projectLevelForteTruncated.method,
      canonicalName: projectLevelForteTruncated.canonicalName,
      passed: projectLevelForteTruncated.status === "matched"
        && projectLevelForteTruncated.method === "truncated_project"
        && projectLevelForteTruncated.canonicalName === "Forte, Downtown Dubai",
    },
    projectLevelAykon: {
      status: projectLevelAykon.status,
      method: projectLevelAykon.method,
      canonicalName: projectLevelAykon.canonicalName,
      passed: projectLevelAykon.status === "matched"
        && ["truncated_project", "truncated_prefix"].includes(projectLevelAykon.method)
        && projectLevelAykon.canonicalName === "Aykon City, Business Bay",
    },
    terracesMarasi: {
      status: terracesMarasi.status,
      method: terracesMarasi.method,
      canonicalName: terracesMarasi.canonicalName,
      passed: terracesMarasi.status === "matched"
        && terracesMarasi.canonicalName === "Terraces Marasi Drive, Business Bay",
    },
    shortUniquePrefix: {
      status: shortUniquePrefix.status,
      method: shortUniquePrefix.method,
      canonicalName: shortUniquePrefix.canonicalName,
      passed: shortUniquePrefix.status === "matched"
        && shortUniquePrefix.method === "truncated_short_prefix"
        && shortUniquePrefix.canonicalName === "Ahad Residences, Business Bay",
    },
    ambiguousStaticPrefix: {
      status: ambiguousStaticPrefix.status,
      method: ambiguousStaticPrefix.method,
      passed: ambiguousStaticPrefix.status === "unmatched" && ambiguousStaticPrefix.method === "truncated",
    },
    ambiguousCachePrefix: {
      status: ambiguousCachePrefix.status,
      method: ambiguousCachePrefix.method,
      passed: ambiguousCachePrefix.status === "unmatched" && ambiguousCachePrefix.method === "truncated",
    },
    projectLevelForte: {
      status: projectLevelForte.status,
      method: projectLevelForte.method,
      canonicalName: projectLevelForte.canonicalName,
      passed: projectLevelForte.status === "matched" && projectLevelForte.canonicalName === "Forte, Downtown Dubai",
    },
    projectLevelAddressTypo: {
      status: projectLevelAddressTypo.status,
      method: projectLevelAddressTypo.method,
      canonicalName: projectLevelAddressTypo.canonicalName,
      passed: projectLevelAddressTypo.status === "matched"
        && projectLevelAddressTypo.canonicalName === "Address Fountain Views, Downtown Dubai",
    },
    numericBuilding: {
      status: numericBuilding.status,
      method: numericBuilding.method,
      passed: numericBuilding.status === "invalid" && numericBuilding.method === "numeric_building",
    },
    statusBuilding: {
      status: statusBuilding.status,
      method: statusBuilding.method,
      passed: statusBuilding.status === "invalid" && statusBuilding.method === "status_building",
    },
    importedUnit: {
      building: imported?.building || null,
      unit: imported?.unit || null,
      passed: imported?.building === "Boulevard Point, Downtown Dubai" && imported?.unit === "Unit 702",
    },
    invalidImportedBuilding: {
      building: invalidImported?.building || null,
      passed: invalidImported?.building === null,
    },
  };
}

function verifyBayutLocationExtraction() {
  const fromDirectName = extractLocationName({
    name: "0",
    title: "",
    full_name: "Dubai | Business Bay | Aykon City Tower C",
  });
  const fromPathArray = extractLocationName({
    name: "0",
    location: ["Dubai", "Business Bay", "The Terraces Marasi Drive"],
  });

  return {
    fromDirectName,
    fromPathArray,
    passed: fromDirectName === "Aykon City Tower C" && fromPathArray === "The Terraces Marasi Drive",
  };
}

async function verifyLiveAccount(vite, env, client, cachedBuildings) {
  const email = getEnv(env, "VERIFY_ACCOUNT_EMAIL");
  if (!email) return { skipped: true, reason: "Set VERIFY_ACCOUNT_EMAIL to check a live account." };
  if (!client) return { skipped: true, reason: "Set SUPABASE_DB_URL to check a live account." };

  const leadUtils = await vite.ssrLoadModule("/src/features/seller-signal/lead-utils.js");
  const dataQuality = await vite.ssrLoadModule("/src/features/seller-signal/lead-data-quality.js");
  const user = (await client.query("select id from auth.users where email = $1", [email])).rows[0];
  if (!user) throw new Error(`No auth user found for ${email}`);

  const { rows } = await client.query(`
    select id, name, building, bedroom, unit, phone, status, last_contact, source_id, sent_at
    from leads
    where user_id = $1
    order by id
  `, [user.id]);

  const today = leadUtils.startOfDay(new Date());
  const leads = rows.map((row, index) => leadUtils.mapStoredLeadRow(row, index, today));
  const enriched = dataQuality.enrichLeadsWithDataQuality(leads, [], cachedBuildings);
  const summary = dataQuality.summarizeLeadDataQuality(enriched);
  const unmatched = [...new Set(
    enriched
      .filter((lead) => lead.buildingMatch?.status === "unmatched")
      .map((lead) => lead.building),
  )].sort();
  const reviewIssues = enriched
    .filter((lead) => lead.dataQuality?.level === "review")
    .map((lead) => ({
      name: lead.name,
      building: lead.building,
      unit: lead.unit,
      issues: lead.dataQuality.issues.map((issue) => issue.id),
    }));

  return {
    total: leads.length,
    summary,
    unmatched,
    reviewIssues,
  };
}

async function verifyAllAccounts(vite, env, client, cachedBuildings) {
  const enabled = getEnv(env, "VERIFY_ALL_ACCOUNTS") === "1";
  if (!enabled) return { skipped: true, reason: "Set VERIFY_ALL_ACCOUNTS=1 to scan every lead with a building." };
  if (!client) return { skipped: true, reason: "Set SUPABASE_DB_URL to scan every account." };

  const dataQuality = await vite.ssrLoadModule("/src/features/seller-signal/lead-data-quality.js");
  const buildingUtils = await vite.ssrLoadModule("/src/features/seller-signal/building-utils.js");
  const { rows } = await client.query(`
    select l.id, l.user_id, u.email, l.name, l.building, l.unit, l.phone, l.source_id
    from leads l
    left join auth.users u on u.id = l.user_id
    where coalesce(l.building, '') <> ''
    order by l.user_id, l.id
  `);
  const resolveBuilding = dataQuality.createLeadBuildingResolver([], cachedBuildings);
  const byMethod = {};
  const unmatched = new Map();
  const invalid = new Map();
  const truncated = new Map();
  const cacheOnly = new Map();
  let missingCount = 0;
  let cacheOnlyCount = 0;
  let truncatedInputCount = 0;
  let truncatedCacheMatchCount = 0;

  for (const row of rows) {
    const match = resolveBuilding(row.building);
    const method = match.method || match.status || "unknown";
    byMethod[method] = (byMethod[method] || 0) + 1;

    if (containsTruncation(row.building)) truncatedInputCount += 1;
    if (containsTruncation(match.canonicalName)) truncatedCacheMatchCount += 1;
    if (match.status === "missing") missingCount += 1;
    if (match.status === "invalid") {
      addGroupedExample(invalid, match.inputName || row.building || "Unknown", {
        email: row.email,
        name: row.name,
        unit: row.unit,
        building: row.building,
        method,
        reason: match.issue?.label || "Invalid building value",
      });
    }
    if (match.status === "unmatched") {
      const targetMap = method === "truncated" ? truncated : unmatched;
      addGroupedExample(targetMap, match.inputName || row.building || "Unknown", {
        email: row.email,
        name: row.name,
        unit: row.unit,
        building: row.building,
        method,
      });
    }

    if (method.startsWith("cached_")) {
      cacheOnlyCount += 1;
      const staticMatch = buildingUtils.getKnownBuildingMatch(row.building);
      if (staticMatch.status !== "matched") {
        addGroupedExample(cacheOnly, match.canonicalName || row.building || "Unknown", {
          email: row.email,
          input: row.building,
          unit: row.unit,
          method,
        });
      }
    }
  }

  return {
    totalLeadBuildings: rows.length,
    byMethod,
    missingCount,
    invalidCount: sumGroupCounts(invalid),
    invalid: formatGroupedExamples(invalid),
    unmatchedCount: sumGroupCounts(unmatched),
    unmatched: formatGroupedExamples(unmatched),
    truncatedCount: sumGroupCounts(truncated),
    truncated: formatGroupedExamples(truncated),
    cacheOnlyCount,
    cacheOnly: formatGroupedExamples(cacheOnly),
    truncatedInputCount,
    truncatedCacheMatchCount,
  };
}

function containsTruncation(value) {
  return /\u2026|\.{3,}/.test(String(value || ""));
}

function addGroupedExample(map, key, item, maxExamples = 5) {
  if (!map.has(key)) map.set(key, { count: 0, examples: [] });
  const group = map.get(key);
  group.count += 1;
  if (group.examples.length < maxExamples) group.examples.push(item);
}

function sumGroupCounts(map) {
  return [...map.values()].reduce((sum, group) => sum + group.count, 0);
}

function formatGroupedExamples(map, limit = 30) {
  return [...map.entries()]
    .map(([name, value]) => ({ name, ...value }))
    .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name))
    .slice(0, limit);
}

async function verifyDldFallback(vite) {
  const insightServices = await vite.ssrLoadModule("/src/features/seller-signal/lead-insight-services.js");
  const buildingUtils = await vite.ssrLoadModule("/src/features/seller-signal/building-utils.js");
  const dld = await vite.ssrLoadModule("/src/features/seller-signal/dld.js");
  const targets = [
    {
      id: "st-regis-2",
      name: "Verifier",
      building: "The St. Regis The Residences Tower 2, Downtown Dubai",
      bedFilterValues: [2],
    },
    {
      id: "imperial",
      name: "Verifier",
      building: "Imperial Avenue, Downtown Dubai",
      bedFilterValues: [2],
    },
  ];
  const buildingKeys = [...new Set(targets.flatMap((lead) => buildingUtils.getBuildingKeyVariants(lead.building)))];
  const marketData = await insightServices.fetchBuildingMarketData(buildingKeys);
  const missingNames = insightServices.getMissingFallbackBuildingNames(targets, marketData.transactionsByBuilding);
  const fallbackData = missingNames.length ? await dld.fetchDldFallbackTransactions(missingNames) : {};
  const insights = insightServices.computeLeadInsights(targets, marketData, { data: fallbackData, pending: false });

  return {
    matched: insights.matched,
    statuses: Object.fromEntries(
      Object.entries(insights.updates).map(([id, value]) => [
        id,
        {
          status: value.status,
          count: value.count,
          recent: value.recentTransactions?.length || 0,
          locationName: value.locationName || null,
          error: value.error || null,
        },
      ]),
    ),
  };
}

function assertVerifierResult(result) {
  const failures = [];

  if (result.registry.regressionCount > 0) {
    failures.push(`Building registry has ${result.registry.regressionCount} named mapping regressions.`);
  }

  if (result.registry.unmatchedNameCount !== 0) {
    failures.push(`Registry has ${result.registry.unmatchedNameCount} unmatched names.`);
  }

  if (!result.cachedImportCanonicalization.passed) {
    failures.push(
      `Cached import canonicalization stored "${result.cachedImportCanonicalization.storedBuilding}" instead of "${result.cachedImportCanonicalization.expectedBuilding}".`,
    );
  }

  if (!result.addressBuildingParsing.recoverable.passed) {
    failures.push("Recoverable truncated address building did not resolve.");
  }

  if (!result.addressBuildingParsing.unrecoverable.passed) {
    failures.push("Unrecoverable truncated address building was not blocked.");
  }

  if (!result.addressBuildingParsing.staticPrefix.passed) {
    failures.push("Static unique truncated prefix did not resolve.");
  }

  if (!result.addressBuildingParsing.staticPrefixWithEquivalentCache.passed) {
    failures.push("Static unique truncated prefix with equivalent cache rows did not resolve.");
  }

  if (!result.addressBuildingParsing.cachedPrefix.passed) {
    failures.push("Cached unique truncated prefix did not resolve.");
  }

  if (!result.addressBuildingParsing.cachedResolvedTruncated.passed) {
    failures.push("Resolved cached truncated input did not resolve.");
  }

  if (!result.addressBuildingParsing.projectLevelBoulevardCentral.passed) {
    failures.push("Project-level Boulevard Central truncated prefix did not resolve.");
  }

  if (!result.addressBuildingParsing.projectLevelBlvdHeights.passed) {
    failures.push("Project-level BLVD Heights truncated prefix did not resolve.");
  }

  if (!result.addressBuildingParsing.projectLevelForteTruncated.passed) {
    failures.push("Project-level Forte truncated prefix did not resolve.");
  }

  if (!result.addressBuildingParsing.projectLevelAykon.passed) {
    failures.push("Project-level Aykon City truncated prefix did not resolve.");
  }

  if (!result.addressBuildingParsing.terracesMarasi.passed) {
    failures.push("Terraces Marasi truncated prefix did not resolve.");
  }

  if (!result.addressBuildingParsing.shortUniquePrefix.passed) {
    failures.push("Short unique truncated prefix did not resolve.");
  }

  if (!result.addressBuildingParsing.ambiguousStaticPrefix.passed) {
    failures.push("Ambiguous static truncated prefix was not blocked.");
  }

  if (!result.addressBuildingParsing.ambiguousCachePrefix.passed) {
    failures.push("Ambiguous cached truncated prefix was not blocked.");
  }

  if (!result.addressBuildingParsing.projectLevelForte.passed) {
    failures.push("Project-level Forte did not resolve.");
  }

  if (!result.addressBuildingParsing.projectLevelAddressTypo.passed) {
    failures.push("Project-level Address Fountain Views typo did not resolve.");
  }

  if (!result.addressBuildingParsing.numericBuilding.passed) {
    failures.push("Numeric building value was not classified as invalid.");
  }

  if (!result.addressBuildingParsing.statusBuilding.passed) {
    failures.push("Status-like building value was not classified as invalid.");
  }

  if (!result.addressBuildingParsing.importedUnit.passed) {
    failures.push("Address-style building import did not extract the unit.");
  }

  if (!result.addressBuildingParsing.invalidImportedBuilding.passed) {
    failures.push("Invalid imported building value was stored.");
  }

  if (!result.bayutLocationExtraction.passed) {
    failures.push("Bayut location extraction accepted a placeholder label.");
  }

  if (result.cachedBuildingCache.invalidLocationCount > 0) {
    failures.push(`Cached building cache has ${result.cachedBuildingCache.invalidLocationCount} invalid location labels.`);
  }

  if (result.cachedBuildingCache.unusableRowCount > 0) {
    failures.push(`Cached building cache has ${result.cachedBuildingCache.unusableRowCount} unusable canonical rows.`);
  }

  if (!result.sheet.skipped && result.sheet.unmatchedBuildings !== 0) {
    failures.push(`Sheet has ${result.sheet.unmatchedBuildings} unmatched buildings.`);
  }

  if (!result.live.skipped && result.live.unmatched.length) {
    failures.push(`Live account has unmatched buildings: ${result.live.unmatched.join(", ")}`);
  }

  if (!result.allAccounts.skipped && result.allAccounts.truncatedCacheMatchCount > 0) {
    failures.push(`All-account scan found ${result.allAccounts.truncatedCacheMatchCount} truncated cache matches.`);
  }

  if (result.dldFallback.matched < 2) {
    failures.push("DLD fallback did not return ready insights for both verifier buildings.");
  }

  if (failures.length) {
    const error = new Error(failures.join(" "));
    error.failures = failures;
    throw error;
  }
}

async function main() {
  const env = await loadDotEnv();
  const vite = await createServer({ server: { middlewareMode: true, hmr: false }, appType: "custom", logLevel: "error" });
  const client = await openDatabase(env);

  try {
    const cachedBuildings = await fetchCachedBuildings(client);
    const result = {
      registry: await verifyRegistry(vite),
      cachedImportCanonicalization: await verifyCachedImportCanonicalization(vite),
      addressBuildingParsing: await verifyAddressBuildingParsing(vite),
      bayutLocationExtraction: verifyBayutLocationExtraction(),
      cachedBuildingCache: verifyCachedBuildingCache(cachedBuildings),
      sheet: await verifySheet(vite, env, cachedBuildings),
      live: await verifyLiveAccount(vite, env, client, cachedBuildings),
      allAccounts: await verifyAllAccounts(vite, env, client, cachedBuildings),
      dldFallback: await verifyDldFallback(vite),
      cachedBuildings: cachedBuildings.length,
    };

    assertVerifierResult(result);
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await client?.end();
    await vite.close();
  }
}

main().catch((error) => {
  console.error(error?.failures?.join("\n") || error?.message || error);
  process.exitCode = 1;
});
