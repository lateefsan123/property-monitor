import { useMemo } from 'react';
import { summarizeUnmatchedBuildings } from '../lead-data-quality';

export default function BuildingCleanupPanel({ leads }) {
  const groups = useMemo(() => summarizeUnmatchedBuildings(leads), [leads]);
  if (!groups.length) return null;
  return (
    <section className="building-cleanup-panel" aria-label="Building matching">
      <div className="building-cleanup-head">
        <div>
          <h2 className="building-cleanup-title">We handle building matching</h2>
          <p className="building-cleanup-meta" role="status">
            {groups.length} building name{groups.length === 1 ? '' : 's'} awaiting a verified match.
            {' '}Repeat AI matches names automatically and keeps uncertain cases for internal review.
            {' '}You can keep working without mapping buildings yourself.
          </p>
        </div>
      </div>
    </section>
  );
}
