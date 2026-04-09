import fs from "node:fs/promises";
import path from "node:path";

const INPUT_FILE = "public/data/bayut-transactions.json";
const OUTPUT_DIR = "reports/bayut-apartment-images";
const OUTPUT_JSON = path.join(OUTPUT_DIR, "manifest.json");
const OUTPUT_HTML = path.join(OUTPUT_DIR, "index.html");
const API_HOST = "uae-real-estate2.p.rapidapi.com";
const PAGE_SIZE = 25;

const PURPOSE = process.env.BAYUT_PURPOSE || "for-sale";
const REQUEST_DELAY_MS = Math.max(0, toInt(process.env.REQUEST_DELAY_MS, 800));
const REQUEST_RETRIES = Math.max(0, toInt(process.env.REQUEST_RETRIES, 4));
const BUILDING_LIMIT = Math.max(0, toInt(process.env.BAYUT_IMAGE_BUILDING_LIMIT, 0));
const MAX_PAGES = Math.max(1, toInt(process.env.BAYUT_IMAGE_MAX_PAGES, 20));

function toInt(raw, fallback) {
  const value = Number(raw);
  return Number.isFinite(value) ? Math.floor(value) : fallback;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function readApiKey() {
  try {
    const raw = await fs.readFile(".env", "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (trimmed.startsWith("RAPIDAPI_KEY=")) return trimmed.split("=", 2)[1].trim();
      if (trimmed.startsWith("VITE_RAPIDAPI_KEY=")) return trimmed.split("=", 2)[1].trim();
    }
  } catch {
    // Ignore missing .env and fall back to process env.
  }

  return process.env.RAPIDAPI_KEY || process.env.VITE_RAPIDAPI_KEY || null;
}

function normalizeBuildingName(value) {
  return String(value || "").trim().toLowerCase();
}

function isUsableBuilding(entry) {
  if (!entry || !entry.locationId || !entry.searchName) return false;

  const name = normalizeBuildingName(entry.searchName);
  if (!name) return false;
  if (name === "building name") return false;

  return true;
}

async function fetchJson(url, options, retries = REQUEST_RETRIES) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(url, options);

    if (res.ok) return res.json();

    if ((res.status === 429 || res.status >= 500) && attempt < retries) {
      const delay = 1500 * Math.pow(2, attempt);
      console.log(`  ${res.status} retrying in ${delay}ms`);
      await sleep(delay);
      continue;
    }

    const text = await res.text();
    throw new Error(`API ${res.status}: ${text.slice(0, 300)}`);
  }

  throw new Error("API request failed");
}

function buildRequestHeaders(apiKey) {
  return {
    "x-rapidapi-key": apiKey,
    "x-rapidapi-host": API_HOST,
    "Content-Type": "application/json",
  };
}

function createListingPayload(locationId) {
  return {
    purpose: PURPOSE,
    categories: ["apartments"],
    locations_ids: [locationId],
    index: "popular",
    is_completed: true,
  };
}

function pickCoverPhoto(listing) {
  return listing?.media?.cover_photo || listing?.media?.photos?.[0] || null;
}

function simplifyListing(listing) {
  const photos = Array.isArray(listing?.media?.photos) ? listing.media.photos.filter(Boolean) : [];

  return {
    id: listing?.id ?? null,
    title: listing?.title || "",
    purpose: listing?.purpose || PURPOSE,
    price: listing?.price ?? null,
    beds: listing?.details?.bedrooms ?? null,
    baths: listing?.details?.bathrooms ?? null,
    furnished: listing?.details?.is_furnished ?? null,
    areaSqft: listing?.area?.built_up ?? null,
    bayutUrl: listing?.meta?.url || null,
    referenceNumber: listing?.reference_number || null,
    coverPhoto: pickCoverPhoto(listing),
    photoCount: listing?.media?.photo_count ?? photos.length,
    photos,
    location: {
      community: listing?.location?.community?.name || null,
      subCommunity: listing?.location?.sub_community?.name || null,
      cluster: listing?.location?.cluster?.name || null,
    },
    verification: {
      isVerified: listing?.verification?.is_verified ?? false,
      verifiedAt: listing?.verification?.verified_at || null,
    },
  };
}

async function fetchListingsForBuilding(building, apiKey) {
  const headers = buildRequestHeaders(apiKey);
  const payload = createListingPayload(building.locationId);
  const deduped = new Map();
  const pageSummaries = [];

  let page = 0;

  while (page < MAX_PAGES) {
    const response = await fetchJson(
      `https://${API_HOST}/properties_search?page=${page}`,
      {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      },
    );

    const results = Array.isArray(response?.results) ? response.results : [];
    let addedThisPage = 0;

    for (const listing of results) {
      if (listing?.id == null || deduped.has(listing.id)) continue;
      deduped.set(listing.id, simplifyListing(listing));
      addedThisPage += 1;
    }

    pageSummaries.push({
      page,
      apiCount: response?.count ?? null,
      resultsReturned: results.length,
      newListings: addedThisPage,
    });

    if (!results.length) break;
    if (results.length < PAGE_SIZE) break;
    if (addedThisPage === 0) break;

    page += 1;
    if (REQUEST_DELAY_MS > 0) await sleep(REQUEST_DELAY_MS);
  }

  const listings = [...deduped.values()];
  const totalPhotoCount = listings.reduce((sum, item) => sum + (item.photoCount || 0), 0);

  return {
    searchName: building.searchName,
    locationId: building.locationId,
    purpose: PURPOSE,
    listingCount: listings.length,
    pageCount: pageSummaries.length,
    totalPhotoCount,
    pages: pageSummaries,
    listings,
  };
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatBeds(value) {
  if (value == null) return "Beds n/a";
  return Number(value) === 0 ? "Studio" : `${value} bed`;
}

function formatPrice(value) {
  if (typeof value !== "number") return "Price n/a";
  return `AED ${Math.round(value).toLocaleString("en-US")}`;
}

function buildGalleryHtml(manifest) {
  const buildingSections = manifest.buildings
    .map((building) => {
      const listingCards = building.listings
        .map((listing) => {
          const cover = listing.coverPhoto
            ? `<img src="${escapeHtml(listing.coverPhoto)}" alt="${escapeHtml(listing.title)}" loading="lazy">`
            : `<div class="placeholder">No image</div>`;

          const listingUrl = listing.bayutUrl
            ? `<a href="${escapeHtml(listing.bayutUrl)}" target="_blank" rel="noreferrer">Open Bayut listing</a>`
            : `<span class="muted">No Bayut URL</span>`;

          return `
            <article class="card">
              <div class="media">${cover}</div>
              <div class="content">
                <div class="eyebrow">${escapeHtml(building.searchName)}</div>
                <h3>${escapeHtml(listing.title || `Listing ${listing.id}`)}</h3>
                <p>${escapeHtml(formatBeds(listing.beds))} | ${escapeHtml(String(listing.baths ?? "Baths n/a"))} bath | ${escapeHtml(String(listing.areaSqft ?? "Area n/a"))} sqft</p>
                <p>${escapeHtml(formatPrice(listing.price))} | ${escapeHtml(String(listing.photoCount || 0))} photos</p>
                <div class="links">
                  ${listingUrl}
                </div>
              </div>
            </article>
          `;
        })
        .join("\n");

      return `
        <section class="building">
          <header class="building-header">
            <h2>${escapeHtml(building.searchName)}</h2>
            <p>${escapeHtml(String(building.listingCount))} listings | ${escapeHtml(String(building.totalPhotoCount))} total photos</p>
          </header>
          <div class="grid">
            ${listingCards || '<p class="muted">No live listings found.</p>'}
          </div>
        </section>
      `;
    })
    .join("\n");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Bayut Apartment Images</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f5efe8;
      --panel: #fffaf5;
      --ink: #182321;
      --muted: #5d6a67;
      --border: #dfd3c5;
      --accent: #006169;
      --shadow: 0 10px 30px rgba(24, 35, 33, 0.08);
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      font-family: Georgia, "Times New Roman", serif;
      color: var(--ink);
      background:
        radial-gradient(circle at top right, rgba(0, 97, 105, 0.08), transparent 25rem),
        linear-gradient(180deg, #f8f3ed 0%, var(--bg) 100%);
    }

    main {
      width: min(1200px, calc(100vw - 2rem));
      margin: 0 auto;
      padding: 2rem 0 4rem;
    }

    .hero {
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 1.5rem;
      box-shadow: var(--shadow);
      padding: 1.5rem;
      margin-bottom: 1.5rem;
    }

    .hero h1 {
      margin: 0 0 0.5rem;
      font-size: clamp(2rem, 4vw, 3.4rem);
      line-height: 1;
    }

    .hero p,
    .building-header p,
    .card p,
    .muted {
      color: var(--muted);
      margin: 0.35rem 0 0;
    }

    .building {
      margin-top: 1.5rem;
      background: rgba(255, 250, 245, 0.65);
      border: 1px solid var(--border);
      border-radius: 1.5rem;
      padding: 1.25rem;
      backdrop-filter: blur(10px);
    }

    .building-header h2 {
      margin: 0;
      font-size: clamp(1.4rem, 2vw, 2rem);
    }

    .grid {
      margin-top: 1rem;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 1rem;
    }

    .card {
      background: #fff;
      border: 1px solid var(--border);
      border-radius: 1.25rem;
      overflow: hidden;
      box-shadow: var(--shadow);
    }

    .media {
      background: #ece5dd;
      aspect-ratio: 4 / 3;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .media img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .placeholder {
      color: var(--muted);
      font-size: 0.95rem;
    }

    .content {
      padding: 1rem;
    }

    .eyebrow {
      font-size: 0.78rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--accent);
      font-weight: 700;
      margin-bottom: 0.5rem;
    }

    .content h3 {
      margin: 0;
      font-size: 1.1rem;
      line-height: 1.2;
    }

    .links {
      margin-top: 0.85rem;
    }

    a {
      color: var(--accent);
      font-weight: 700;
      text-decoration: none;
    }

    a:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <main>
    <section class="hero">
      <h1>Bayut Apartment Images</h1>
      <p>Generated ${escapeHtml(manifest.generatedAt)}.</p>
      <p>${escapeHtml(String(manifest.summary.buildingsWithListings))} buildings with live ${escapeHtml(PURPOSE)} apartment listings, ${escapeHtml(String(manifest.summary.totalListings))} listings total.</p>
      <p>Each card shows the first Bayut image for that listing. Full photo arrays are stored in <code>manifest.json</code>.</p>
    </section>
    ${buildingSections}
  </main>
</body>
</html>`;
}

async function main() {
  const apiKey = await readApiKey();
  if (!apiKey) throw new Error("Missing RAPIDAPI_KEY or VITE_RAPIDAPI_KEY");

  const raw = JSON.parse(await fs.readFile(INPUT_FILE, "utf8"));
  const buildings = Object.entries(raw.buildings || {})
    .map(([key, value]) => ({
      key,
      searchName: value?.searchName || key,
      locationId: value?.locationId || null,
    }))
    .filter(isUsableBuilding);

  const selectedBuildings = BUILDING_LIMIT > 0 ? buildings.slice(0, BUILDING_LIMIT) : buildings;

  console.log(`Fetching Bayut apartment images for ${selectedBuildings.length} buildings (${PURPOSE})`);

  const outputBuildings = [];
  const skipped = [];
  const errors = [];

  for (let index = 0; index < selectedBuildings.length; index++) {
    const building = selectedBuildings[index];
    console.log(`[${index + 1}/${selectedBuildings.length}] ${building.searchName}`);

    if (index > 0 && REQUEST_DELAY_MS > 0) await sleep(REQUEST_DELAY_MS);

    try {
      const result = await fetchListingsForBuilding(building, apiKey);
      if (!result.listings.length) {
        skipped.push({
          key: building.key,
          searchName: building.searchName,
          locationId: building.locationId,
          reason: "No live listings found",
        });
        console.log("  -> no listings");
        continue;
      }

      outputBuildings.push({
        key: building.key,
        searchName: building.searchName,
        locationId: building.locationId,
        listingCount: result.listingCount,
        pageCount: result.pageCount,
        totalPhotoCount: result.totalPhotoCount,
        listings: result.listings,
      });
      console.log(`  -> ${result.listingCount} listings, ${result.totalPhotoCount} photos`);
    } catch (error) {
      errors.push({
        key: building.key,
        searchName: building.searchName,
        locationId: building.locationId,
        error: error.message,
      });
      console.log(`  -> error: ${error.message}`);
    }
  }

  outputBuildings.sort((a, b) => b.listingCount - a.listingCount || a.searchName.localeCompare(b.searchName));

  const manifest = {
    generatedAt: new Date().toISOString(),
    purpose: PURPOSE,
    source: "Bayut via uae-real-estate2 RapidAPI",
    summary: {
      requestedBuildings: selectedBuildings.length,
      buildingsWithListings: outputBuildings.length,
      skippedBuildings: skipped.length,
      erroredBuildings: errors.length,
      totalListings: outputBuildings.reduce((sum, item) => sum + item.listingCount, 0),
      totalPhotos: outputBuildings.reduce((sum, item) => sum + item.totalPhotoCount, 0),
    },
    buildings: outputBuildings,
    skipped,
    errors,
  };

  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await fs.writeFile(OUTPUT_JSON, JSON.stringify(manifest, null, 2), "utf8");
  await fs.writeFile(OUTPUT_HTML, buildGalleryHtml(manifest), "utf8");

  console.log(`\nWrote ${OUTPUT_JSON}`);
  console.log(`Wrote ${OUTPUT_HTML}`);
  console.log(`Buildings with listings: ${manifest.summary.buildingsWithListings}`);
  console.log(`Total listings: ${manifest.summary.totalListings}`);
  console.log(`Total photos: ${manifest.summary.totalPhotos}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
