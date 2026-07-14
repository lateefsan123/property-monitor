import { createServer } from "vite";

const DEFAULT_MASTER_SHEET = "https://docs.google.com/spreadsheets/d/1h-6Zgnzpwcn-6iA1Nu2MBetBA_8IheB2/export?format=csv&gid=1481963952";
const sheetUrl = process.argv[2] || DEFAULT_MASTER_SHEET;
const vite = await createServer({
  server: { middlewareMode: true, hmr: false },
  appType: "custom",
  logLevel: "error",
});

try {
  const spreadsheet = await vite.ssrLoadModule("/src/features/seller-signal/spreadsheet.js");
  const buildingUtils = await vite.ssrLoadModule("/src/features/seller-signal/building-utils.js");
  const response = await fetch(spreadsheet.buildGoogleCsvUrl(sheetUrl));
  if (!response.ok) throw new Error(`Master sheet fetch failed (${response.status}).`);

  const { headers, records } = spreadsheet.rowsToObjects(spreadsheet.parseCsvText(await response.text()));
  const mapping = spreadsheet.inferMapping(headers);
  if (!mapping.building) throw new Error("Master sheet has no building column.");

  const names = [...new Set(records
    .map((record) => String(record[mapping.building] || "").trim())
    .filter(Boolean))]
    .sort((left, right) => left.localeCompare(right));
  const results = names.map((name) => ({ name, ...buildingUtils.getKnownBuildingMatch(name) }));
  const approved = results.filter((item) => item.method === "exact" || item.method === "alias");
  const heuristic = results.filter((item) => item.method === "loose");
  const review = results.filter((item) => item.status !== "matched");

  console.log(JSON.stringify({
    sheetUrl,
    rows: records.length,
    distinctBuildingNames: names.length,
    approved: approved.length,
    needsReview: review.length,
    unsafeHeuristicMatches: heuristic.length,
    reviewNames: review.map((item) => item.name),
    heuristicMatches: heuristic.map((item) => ({ input: item.name, suggestion: item.canonicalName })),
  }, null, 2));

  if (heuristic.length) {
    throw new Error(`${heuristic.length} master-sheet building names still rely on unsafe heuristic matching.`);
  }
} finally {
  await vite.close();
}
