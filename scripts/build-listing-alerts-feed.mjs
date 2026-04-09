import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const MANIFEST_PATH = path.join(ROOT, "reports", "bayut-apartment-images", "manifest.json");
const BUILDING_META_PATH = path.join(ROOT, "public", "data", "building-images-meta.json");
const OUTPUT_PATH = path.join(ROOT, "mobile", "src", "data", "listing-alerts-feed.json");
const LISTINGS_PER_BUILDING = 8;

function parseVerifiedAt(value) {
  if (!value) return 0;
  const date = new Date(String(value).replace(" ", "T"));
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function toCompactListing(listing) {
  return {
    id: listing.id,
    title: listing.title || "",
    price: listing.price ?? null,
    beds: listing.beds ?? null,
    baths: listing.baths ?? null,
    areaSqft: listing.areaSqft ?? null,
    bayutUrl: listing.bayutUrl || null,
    coverPhoto: listing.coverPhoto || null,
    verifiedAt: listing.verification?.verifiedAt || null,
    isVerified: Boolean(listing.verification?.isVerified),
    referenceNumber: listing.referenceNumber || null,
    cluster: listing.location?.cluster || null,
    community: listing.location?.community || null,
  };
}

function toCompactBuilding(building, buildingMeta) {
  const listings = (building.listings || [])
    .map(toCompactListing)
    .sort((left, right) => parseVerifiedAt(right.verifiedAt) - parseVerifiedAt(left.verifiedAt))
    .slice(0, LISTINGS_PER_BUILDING);

  const prices = listings
    .map((listing) => listing.price)
    .filter((value) => Number.isFinite(value));

  return {
    key: building.key,
    locationId: building.locationId ?? null,
    buildingName: buildingMeta?.buildingName || building.searchName,
    searchName: buildingMeta?.searchName || building.searchName,
    imageUrl: buildingMeta?.imageUrl || listings[0]?.coverPhoto || null,
    listingCount: building.listingCount ?? listings.length,
    latestVerifiedAt: listings[0]?.verifiedAt || null,
    lowestPrice: prices.length ? Math.min(...prices) : null,
    highestPrice: prices.length ? Math.max(...prices) : null,
    listings,
  };
}

async function main() {
  const [manifestRaw, buildingMetaRaw] = await Promise.all([
    fs.readFile(MANIFEST_PATH, "utf8"),
    fs.readFile(BUILDING_META_PATH, "utf8"),
  ]);

  const manifest = JSON.parse(manifestRaw);
  const buildingMeta = JSON.parse(buildingMetaRaw);

  const buildings = (manifest.buildings || [])
    .map((building) => toCompactBuilding(building, buildingMeta[building.key]))
    .sort((left, right) => {
      const verifiedDelta = parseVerifiedAt(right.latestVerifiedAt) - parseVerifiedAt(left.latestVerifiedAt);
      if (verifiedDelta !== 0) return verifiedDelta;
      return right.listingCount - left.listingCount;
    });

  const output = {
    generatedAt: manifest.generatedAt || new Date().toISOString(),
    source: manifest.source || "Bayut",
    purpose: manifest.purpose || "for-sale",
    summary: {
      buildingCount: buildings.length,
      listingsIncluded: buildings.reduce((sum, building) => sum + building.listings.length, 0),
    },
    buildings,
  };

  await fs.writeFile(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`, "utf8");

  console.log(
    `Wrote ${buildings.length} buildings / ${output.summary.listingsIncluded} listings to ${path.relative(ROOT, OUTPUT_PATH)}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
