import { parseBuildingAddressValue } from "./building-utils";
import { getInvalidBuildingValueIssue } from "./lead-data-quality";

const IMPORT_TRUNCATION_PATTERN = /\u2026|\.{3,}/;
const IMPORT_TRUNCATION_FIELDS = [
  { key: "building", label: "building" },
  { key: "unit", label: "unit" },
];

function containsImportTruncation(value) {
  const raw = String(value || "").trim();
  return Boolean(raw) && IMPORT_TRUNCATION_PATTERN.test(raw);
}

function getSuspiciousImportField(field, value) {
  if (containsImportTruncation(value)) {
    if (field.key !== "building") {
      return {
        label: field.label,
        value: summarizeImportValue(value),
        reason: "possible truncation",
      };
    }

    const address = parseBuildingAddressValue(value);
    if (!address.recoverableTruncation) {
      return {
        label: field.label,
        value: summarizeImportValue(value),
        reason: "possible truncation",
      };
    }
  }

  if (field.key === "building") {
    const invalidIssue = getInvalidBuildingValueIssue(value);
    if (invalidIssue) {
      return {
        label: field.label,
        value: summarizeImportValue(value),
        reason: invalidIssue.label,
      };
    }
  }

  return null;
}

function summarizeImportValue(value, limit = 44) {
  const raw = String(value || "").replace(/\s+/g, " ").trim();
  if (raw.length <= limit) return raw;
  return `${raw.slice(0, limit - 3).trim()}...`;
}

export function collectSuspiciousImportRows(records, mapping, options = {}) {
  const {
    defaultBuilding = null,
    overrideBuilding = false,
    maxExamples = 5,
  } = options;

  let count = 0;
  const examples = [];

  for (const record of records || []) {
    const values = {
      name: mapping.name ? record[mapping.name] : "",
      building: overrideBuilding ? (defaultBuilding || "") : (mapping.building ? record[mapping.building] : (defaultBuilding || "")),
      unit: mapping.unit ? record[mapping.unit] : "",
    };

    const flaggedFields = IMPORT_TRUNCATION_FIELDS
      .map((field) => getSuspiciousImportField(field, values[field.key]))
      .filter(Boolean);

    if (!flaggedFields.length) continue;

    count += 1;
    if (examples.length < maxExamples) {
      examples.push({
        rowNumber: record.__row || "?",
        flaggedFields,
      });
    }
  }

  return { count, examples };
}

export function buildSuspiciousImportError(summary) {
  if (!summary?.count) return null;

  const exampleText = summary.examples
    .map((example) => {
      const fields = example.flaggedFields
        .map((field) => `${field.label} "${field.value}" (${field.reason})`)
        .join(", ");
      return `row ${example.rowNumber}: ${fields}`;
    })
    .join("; ");

  const remaining = summary.count - summary.examples.length;
  const remainingText = remaining > 0 ? ` (+${remaining} more)` : "";

  return `Import blocked: ${summary.count} row(s) contain building or unit values that cannot be trusted.${remainingText} ${exampleText} Fix the sheet values and re-import.`;
}
