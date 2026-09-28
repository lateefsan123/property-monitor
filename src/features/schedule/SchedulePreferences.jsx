import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../supabase";
import { createBuildingScheduleServices } from "../../../shared/building-schedule-services.js";
import { buildingScheduleOptions } from "../../../shared/building-schedule-queries.js";
import { emptySchedule } from "../../../supabase/functions/_shared/building-schedule.js";
import "./schedule.css";

// Mobile's Settings → Schedule switches (mobile/src/workspace/schedule-settings.js).
// Used on the Schedule page (settings button) and in Settings → Schedule.
// Each change saves on its own and updates the shared schedule cache.
const PREFERENCES = [
  ["enabled", "Weekly schedule", "Use the days chosen for each building. Off returns to account-wide automation."],
  ["fill_unused", "Fill unused slots", "Use other buildings when selected buildings run out. Empty days stay off."],
];

export default function SchedulePreferences({ userId, client = supabase, className = "" }) {
  const cache = useQueryClient();
  const options = buildingScheduleOptions(client, userId).schedule;
  const query = useQuery(options);
  const mutation = useMutation({
    mutationFn: (next) => createBuildingScheduleServices(client).savePreferences(userId, next),
    onSuccess: (flags) => cache.setQueryData(options.queryKey, (previous) => ({ ...(previous || emptySchedule()), ...flags })),
  });
  const saved = query.data || emptySchedule();
  const current = { enabled: saved.enabled, fill_unused: saved.fill_unused, ...(mutation.isPending ? mutation.variables : {}) };
  const disabled = !query.data || query.isError || mutation.isPending;

  return (
    <div className={`sch-prefs ${className}`.trim()}>
      {PREFERENCES.map(([key, title, description]) => (
        <label key={key} className="sch-pref">
          <span>
            <strong>{title}</strong>
            <small>{description}</small>
          </span>
          <input type="checkbox" role="switch" className="sch-switch" checked={Boolean(current[key])} disabled={disabled}
            onChange={(event) => mutation.mutate({ ...current, [key]: event.target.checked })} />
        </label>
      ))}
      <p className="sch-note" aria-live="polite">
        {query.error ? <span className="sch-error">{query.error.message}</span>
          : mutation.error ? <span className="sch-error">{mutation.error.message}</span>
            : query.isPending ? "Loading…"
              : mutation.isPending ? "Saving…" : "Changes save automatically. All schedules use Dubai time."}
      </p>
    </div>
  );
}
