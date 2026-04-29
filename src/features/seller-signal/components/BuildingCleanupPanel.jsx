import { useMemo, useState } from "react";
import { DOWNTOWN_DUBAI_BUILDINGS } from "../building-registry";
import { summarizeUnmatchedBuildings } from "../lead-data-quality";

const MAX_VISIBLE_GROUPS = 8;

export default function BuildingCleanupPanel({
  aliases,
  leads,
  onSaveAlias,
  savingAliasName,
}) {
  const groups = useMemo(() => summarizeUnmatchedBuildings(leads), [leads]);
  const visibleGroups = groups.slice(0, MAX_VISIBLE_GROUPS);
  const [drafts, setDrafts] = useState({});

  if (!visibleGroups.length) return null;

  function updateDraft(groupKey, value) {
    setDrafts((current) => ({ ...current, [groupKey]: value }));
  }

  async function saveAlias(group) {
    const canonicalName = drafts[group.key] || "";
    const saved = await onSaveAlias?.(group.name, canonicalName);
    if (saved) {
      setDrafts((current) => {
        const next = { ...current };
        delete next[group.key];
        return next;
      });
    }
  }

  return (
    <section className="building-cleanup-panel" aria-label="Building cleanup">
      <div className="building-cleanup-head">
        <div>
          <h2 className="building-cleanup-title">Building cleanup</h2>
          <p className="building-cleanup-meta">
            {groups.length} unmatched name{groups.length === 1 ? "" : "s"}
            {aliases?.length ? ` - ${aliases.length} saved alias${aliases.length === 1 ? "" : "es"}` : ""}
          </p>
        </div>
      </div>

      <div className="building-cleanup-list">
        {visibleGroups.map((group) => {
          const selectedBuilding = drafts[group.key] || "";
          const saving = savingAliasName === group.name;
          return (
            <div className="building-cleanup-row" key={group.key}>
              <div className="building-cleanup-name">
                <span className="building-cleanup-alias" title={group.name}>{group.name}</span>
                <span className="building-cleanup-count">
                  {group.count} lead{group.count === 1 ? "" : "s"}
                </span>
              </div>

              <select
                className="building-cleanup-select"
                value={selectedBuilding}
                onChange={(event) => updateDraft(group.key, event.target.value)}
                aria-label={`Canonical building for ${group.name}`}
              >
                <option value="">Choose building</option>
                {DOWNTOWN_DUBAI_BUILDINGS.map((building) => (
                  <option key={building} value={building}>{building}</option>
                ))}
              </select>

              <button
                type="button"
                className="btn-sm btn-primary building-cleanup-save"
                disabled={!selectedBuilding || saving}
                onClick={() => saveAlias(group)}
              >
                {saving ? "Saving..." : "Map"}
              </button>
            </div>
          );
        })}
      </div>

      {groups.length > visibleGroups.length && (
        <p className="building-cleanup-more">
          +{groups.length - visibleGroups.length} more unmatched names
        </p>
      )}
    </section>
  );
}
