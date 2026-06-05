function toCount(value) {
  return Number(value || 0);
}

function plural(value, singular, pluralLabel = `${singular}s`) {
  return `${value} ${value === 1 ? singular : pluralLabel}`;
}

function buildStats(report) {
  const result = report?.result || {};
  const quality = result.quality || {};
  const building = quality.building || {};
  const missing = quality.missing || {};
  const matched = toCount(building.matched);
  const invalid = toCount(building.invalid);
  const unmatched = toCount(building.unmatched);
  const missingBuilding = toCount(building.missing);
  const missingPhone = toCount(missing.phone);
  const missingUnit = toCount(missing.unit);
  const duplicateRows = toCount(quality.duplicateRows ?? result.skippedCount);
  const reviewBuildings = invalid + unmatched + missingBuilding;

  return {
    duplicateRows,
    invalid,
    matched,
    missingBuilding,
    missingPhone,
    missingUnit,
    reviewBuildings,
    totalRows: toCount(result.totalRows),
    importedRows: toCount(result.count),
    unmatched,
  };
}

function getExamples(report) {
  const building = report?.result?.quality?.building || {};
  return [
    ...(building.invalidExamples || []).map((example) => ({
      label: example.name,
      meta: example.reason || "Invalid",
      type: "invalid",
    })),
    ...(building.unmatchedExamples || []).map((example) => ({
      label: example.name,
      meta: plural(toCount(example.count), "lead"),
      type: "unmatched",
    })),
  ].slice(0, 5);
}

export default function ImportHealthPanel({ onReviewRows, report }) {
  if (!report?.result?.quality) return null;

  const stats = buildStats(report);
  const examples = getExamples(report);
  const hasReview = stats.reviewBuildings > 0 || stats.missingPhone > 0 || stats.missingUnit > 0;
  const reviewFilter = stats.reviewBuildings > 0 ? "review" : "partial";
  const statusText = hasReview ? "Needs review" : "Clean import";

  return (
    <section className="import-health-panel" aria-label="Import health">
      <div className="import-health-head">
        <div>
          <h2 className="import-health-title">Import health</h2>
          <p className="import-health-meta">
            {report.sourceLabel ? `${report.sourceLabel} - ` : ""}
            {plural(stats.importedRows, "seller")} imported
            {stats.duplicateRows > 0 && ` - ${plural(stats.duplicateRows, "duplicate")} skipped`}
          </p>
        </div>
        <span className={`import-health-status${hasReview ? " is-review" : " is-clean"}`}>
          {statusText}
        </span>
      </div>

      <div className="import-health-stats">
        <div className="import-health-stat">
          <span className="import-health-stat-value">{stats.matched}</span>
          <span className="import-health-stat-label">Matched</span>
        </div>
        <div className="import-health-stat">
          <span className="import-health-stat-value">{stats.reviewBuildings}</span>
          <span className="import-health-stat-label">Building review</span>
        </div>
        <div className="import-health-stat">
          <span className="import-health-stat-value">{stats.missingPhone}</span>
          <span className="import-health-stat-label">Missing phone</span>
        </div>
        <div className="import-health-stat">
          <span className="import-health-stat-value">{stats.missingUnit}</span>
          <span className="import-health-stat-label">Missing unit</span>
        </div>
      </div>

      {examples.length > 0 && (
        <div className="import-health-examples">
          {examples.map((example) => (
            <span className={`import-health-example import-health-example-${example.type}`} key={`${example.type}:${example.label}`}>
              <span className="import-health-example-label">{example.label}</span>
              <span className="import-health-example-meta">{example.meta}</span>
            </span>
          ))}
        </div>
      )}

      {hasReview && (
        <button type="button" className="btn-sm import-health-review" onClick={() => onReviewRows?.(reviewFilter)}>
          Review rows
        </button>
      )}
    </section>
  );
}
