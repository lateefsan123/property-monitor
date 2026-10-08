import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchBuildingChoices } from '../building-alias-services';
import { automaticAliasKey } from '../../../../shared/automatic-building-aliases';

const VISIBLE_ROWS = 3;
const dismissedKey = (userId) => `seller-signal:building-choices-dismissed:${userId}`;

function readDismissed(userId) {
  try { return new Set(JSON.parse(window.localStorage.getItem(dismissedKey(userId)) || '[]')); } catch { return new Set(); }
}

// "Which building?": building names that match more than one place, e.g.
// "Arabian Ranches" (1, 2 or 3). One tap saves the match for every seller with
// that name; "Not sure" hides it. Shows only when something needs picking.
export default function BuildingCleanupPanel({ userId, leads, aliases, onSaveAlias, savingAliasName }) {
  const client = useQueryClient();
  const [dismissed, setDismissed] = useState(() => readDismissed(userId));
  const [expanded, setExpanded] = useState(false);
  const choicesQuery = useQuery({
    queryKey: ['seller-signal', 'building-choices', userId],
    enabled: Boolean(userId),
    queryFn: () => fetchBuildingChoices(userId),
    staleTime: 5 * 60 * 1000,
  });

  const rows = useMemo(() => {
    const answered = new Set((aliases || []).map((alias) => automaticAliasKey(alias.aliasName)));
    const sellers = new Map();
    for (const lead of leads || []) {
      const key = automaticAliasKey(lead.building);
      if (key) sellers.set(key, (sellers.get(key) || 0) + 1);
    }
    return (choicesQuery.data || [])
      .map((choice) => ({ ...choice, key: automaticAliasKey(choice.rawName), sellers: sellers.get(automaticAliasKey(choice.rawName)) || 0 }))
      .filter((choice) => choice.sellers > 0 && !answered.has(choice.key) && !dismissed.has(choice.key))
      .sort((a, b) => b.sellers - a.sellers);
  }, [aliases, choicesQuery.data, dismissed, leads]);

  if (!rows.length) return null;
  const visible = expanded ? rows : rows.slice(0, VISIBLE_ROWS);

  function dismiss(key) {
    const next = new Set(dismissed).add(key);
    setDismissed(next);
    try { window.localStorage.setItem(dismissedKey(userId), JSON.stringify([...next])); } catch { /* Hidden for this visit only. */ }
  }

  async function pick(row, option) {
    const saved = await onSaveAlias?.(row.rawName, option.name);
    if (saved !== false) client.invalidateQueries({ queryKey: ['seller-signal', 'building-choices', userId] });
  }

  return (
    <section className="building-choice-card" aria-labelledby="building-choice-title">
      <h2 id="building-choice-title">Which building?</h2>
      <p>Pick the right one so these sellers get the right sales.</p>
      <ul>
        {visible.map((row) => {
          const saving = savingAliasName === row.rawName;
          return (
            <li key={row.key}>
              <div className="building-choice-name"><strong>{row.rawName}</strong><span>{row.sellers.toLocaleString()} seller{row.sellers === 1 ? '' : 's'}</span></div>
              <div className="building-choice-options" role="group" aria-label={`Which building is ${row.rawName}?`}>
                {row.options.map((option) => (
                  <button key={option.name} type="button" className="building-choice-option" disabled={Boolean(savingAliasName)} onClick={() => pick(row, option)}>{option.label}</button>
                ))}
                <button type="button" className="building-choice-skip" disabled={saving} onClick={() => dismiss(row.key)}>Not sure</button>
              </div>
            </li>
          );
        })}
      </ul>
      {rows.length > VISIBLE_ROWS && (
        <button type="button" className="building-choice-more" onClick={() => setExpanded((value) => !value)}>
          {expanded ? 'Show less' : `Show ${rows.length - VISIBLE_ROWS} more`}
        </button>
      )}
    </section>
  );
}
