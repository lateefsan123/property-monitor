import fs from "node:fs/promises";
import path from "node:path";

const TRANSACTIONS_FILE = "public/data/bayut-transactions.json";
const OUTPUT_PUBLIC_FILE = "public/data/building-images.json";
const OUTPUT_MOBILE_FILE = "mobile/src/data/building-images.json";
const OUTPUT_META_FILE = "public/data/building-images-meta.json";
const WIKIPEDIA_API = "https://en.wikipedia.org/w/api.php";
const RAPID_API_HOST = "uae-real-estate2.p.rapidapi.com";
const SATELLITE_TILE_ZOOM = 18;

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/…/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function significantTokens(value) {
  return normalizeText(value)
    .split(/\s+/)
    .filter((token) => token && token.length >= 3 && !["tower", "towers", "residence", "residences", "the", "dubai"].includes(token));
}

function lonToTile(lon, zoom) {
  return Math.floor(((lon + 180) / 360) * Math.pow(2, zoom));
}

function latToTile(lat, zoom) {
  const radians = (lat * Math.PI) / 180;
  return Math.floor(
    ((1 - Math.log(Math.tan(radians) + 1 / Math.cos(radians)) / Math.PI) / 2) * Math.pow(2, zoom),
  );
}

function satelliteTileUrl(latitude, longitude, zoom = SATELLITE_TILE_ZOOM) {
  const x = lonToTile(longitude, zoom);
  const y = latToTile(latitude, zoom);
  return `https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${zoom}/${y}/${x}`;
}

async function readRapidApiKey() {
  try {
    const raw = await fs.readFile(".env", "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (trimmed.startsWith("RAPIDAPI_KEY=")) return trimmed.split("=", 2)[1].trim();
      if (trimmed.startsWith("VITE_RAPIDAPI_KEY=")) return trimmed.split("=", 2)[1].trim();
    }
  } catch {
    // Ignore and fall through to env lookup.
  }

  return process.env.RAPIDAPI_KEY || process.env.VITE_RAPIDAPI_KEY || null;
}

function scoreWikipediaResult(buildingName, title) {
  const buildingNorm = normalizeText(buildingName);
  const titleNorm = normalizeText(title);
  const buildingTokens = significantTokens(buildingName);
  const titleTokens = significantTokens(title);
  const overlap = buildingTokens.filter((token) => titleTokens.includes(token)).length;

  let score = 0;
  if (titleNorm === buildingNorm) score += 100;
  if (titleNorm.includes(buildingNorm) || buildingNorm.includes(titleNorm)) score += 50;
  score += overlap * 10;

  return score;
}

async function fetchWikipediaImage(buildingName) {
  if (String(buildingName || "").includes("…")) return null;

  const query = `${buildingName} Dubai`;
  const url = new URL(WIKIPEDIA_API);
  url.searchParams.set("action", "query");
  url.searchParams.set("format", "json");
  url.searchParams.set("generator", "search");
  url.searchParams.set("gsrsearch", query);
  url.searchParams.set("gsrnamespace", "0");
  url.searchParams.set("gsrlimit", "5");
  url.searchParams.set("prop", "pageimages|info");
  url.searchParams.set("piprop", "original|thumbnail");
  url.searchParams.set("pithumbsize", "900");
  url.searchParams.set("inprop", "url");

  const response = await fetch(url, {
    headers: {
      "User-Agent": "property-monitor/1.0 (building exterior image fetcher)",
    },
  });

  if (!response.ok) {
    throw new Error(`Wikipedia ${response.status}`);
  }

  const payload = await response.json();
  const pages = Object.values(payload?.query?.pages || {});
  if (!pages.length) return null;

  const ranked = pages
    .map((page) => ({
      page,
      score: scoreWikipediaResult(buildingName, page.title),
    }))
    .filter((entry) => entry.score >= 60)
    .sort((left, right) => right.score - left.score);

  if (!ranked.length) return null;

  const best = ranked[0].page;
  const imageUrl = best?.original?.source || best?.thumbnail?.source || null;
  if (!imageUrl) return null;

  return {
    source: "wikipedia",
    imageUrl,
    pageTitle: best.title,
    pageUrl: best.fullurl || null,
  };
}

function findCoordinates(buildingRecord) {
  const firstWithCoords = (buildingRecord?.transactions || []).find(
    (transaction) => transaction?.location?.coordinates?.latitude && transaction?.location?.coordinates?.longitude,
  );

  if (!firstWithCoords) return null;

  return {
    latitude: firstWithCoords.location.coordinates.latitude,
    longitude: firstWithCoords.location.coordinates.longitude,
  };
}

async function lookupCoordinatesByName(buildingName, apiKey) {
  if (!apiKey) return null;

  const url = `https://${RAPID_API_HOST}/locations_search?query=${encodeURIComponent(buildingName)}`;
  const response = await fetch(url, {
    headers: {
      "x-rapidapi-key": apiKey,
      "x-rapidapi-host": RAPID_API_HOST,
    },
  });

  if (!response.ok) return null;

  const payload = await response.json();
  const result = Array.isArray(payload?.results) ? payload.results[0] : null;
  const lat = result?.coordinates?.lat;
  const lng = result?.coordinates?.lng;
  if (!lat || !lng) return null;

  return {
    latitude: lat,
    longitude: lng,
  };
}

function inferBuildingName(key, buildingRecord, manifestLookup) {
  const manifestName = manifestLookup.get(key)?.listings?.find((item) => item?.location?.cluster)?.location?.cluster;
  if (manifestName) return manifestName;

  const txLocation = (buildingRecord?.transactions || []).find((transaction) => transaction?.location?.location)?.location?.location;
  if (txLocation) return txLocation;

  return buildingRecord?.searchName || key;
}

function buildLookupByKey(manifest) {
  return new Map((manifest?.buildings || []).map((building) => [building.key, building]));
}

async function main() {
  const rapidApiKey = await readRapidApiKey();
  const [transactionsRaw, manifestRaw] = await Promise.all([
    fs.readFile(TRANSACTIONS_FILE, "utf8"),
    fs.readFile("reports/bayut-apartment-images/manifest.json", "utf8").catch(() => JSON.stringify({ buildings: [] })),
  ]);

  const transactions = JSON.parse(transactionsRaw);
  const manifest = JSON.parse(manifestRaw);
  const manifestLookup = buildLookupByKey(manifest);
  const targetKeys = Object.entries(transactions?.buildings || {})
    .filter(([key, record]) => key !== "buildingname" && (record?.searchName || record?.transactions?.length))
    .map(([key]) => key);

  const nextImages = {};
  const meta = {};

  for (const key of targetKeys) {
    const buildingRecord = transactions?.buildings?.[key];
    if (!buildingRecord) continue;

    const buildingName = inferBuildingName(key, buildingRecord, manifestLookup);
    const coordinates = findCoordinates(buildingRecord) || await lookupCoordinatesByName(buildingName, rapidApiKey);

    let resolved = null;
    try {
      resolved = await fetchWikipediaImage(buildingName);
    } catch (error) {
      resolved = null;
      console.log(`${buildingName}: Wikipedia lookup failed (${error.message})`);
    }

    if (!resolved && coordinates) {
      resolved = {
        source: "arcgis-world-imagery",
        imageUrl: satelliteTileUrl(coordinates.latitude, coordinates.longitude),
        pageTitle: null,
        pageUrl: null,
      };
    }

    if (!resolved) {
      console.log(`${buildingName}: no external image source found`);
      continue;
    }

    nextImages[key] = resolved.imageUrl;
    meta[key] = {
      buildingName,
      searchName: buildingRecord.searchName || key,
      coordinates,
      source: resolved.source,
      imageUrl: resolved.imageUrl,
      sourcePageTitle: resolved.pageTitle,
      sourcePageUrl: resolved.pageUrl,
    };

    console.log(`${buildingName}: ${resolved.source}`);
  }

  const jsonText = `${JSON.stringify(nextImages, null, 2)}\n`;
  await Promise.all([
    fs.writeFile(OUTPUT_PUBLIC_FILE, jsonText, "utf8"),
    fs.writeFile(OUTPUT_MOBILE_FILE, jsonText, "utf8"),
    fs.writeFile(OUTPUT_META_FILE, `${JSON.stringify(meta, null, 2)}\n`, "utf8"),
  ]);

  console.log(`\nWrote ${OUTPUT_PUBLIC_FILE}`);
  console.log(`Wrote ${OUTPUT_MOBILE_FILE}`);
  console.log(`Wrote ${OUTPUT_META_FILE}`);
  console.log(`Entries: ${Object.keys(nextImages).length}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
