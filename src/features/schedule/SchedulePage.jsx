import { useEffect, useRef, useState } from "react";
import { IconCircleCheckFilled, IconPencil, IconPlus, IconSettings, IconX } from "@tabler/icons-react";
import { supabase } from "../../supabase";
import { useBuildingSchedule } from "../../../shared/use-building-schedule.js";
import { useSpreadsheetBuildings } from "./useSpreadsheetBuildings";
import SearchField from "../../components/SearchField";
import SchedulePreferences from "./SchedulePreferences";
import { SCHEDULE_DAYS, scheduleBuildingKey } from "../../../supabase/functions/_shared/building-schedule.js";
import scheduleArt from "../../../mobile/assets/schedule-empty.png";
import "./schedule.css";

// Same layout as the mobile schedule (mobile/src/workspace/schedule-editor.js):
// one card per scheduled building with its days, an editor with seven day
// buttons, an Add building picker, and a Save bar only when there are edits.
// The Weekly schedule / Fill unused switches (mobile Settings → Schedule)
// sit behind the settings button and save on their own, like mobile.
const daysFor = (value, name) => SCHEDULE_DAYS.filter((day) => value.days[day].some((item) => scheduleBuildingKey(item) === scheduleBuildingKey(name)));

function Sheet({ title, subtitle, onClose, children, footer }) {
  const panel = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    panel.current?.querySelector("input, button:not(.sch-sheet-close)")?.focus();
    function onKey(event) { if (event.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("keydown", onKey); previous?.focus?.(); };
  }, [onClose]);
  return (
    <div className="sch-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div ref={panel} className="sch-sheet" role="dialog" aria-modal="true" aria-labelledby="sch-sheet-title">
        <header className="sch-sheet-head">
          <div>
            <h2 id="sch-sheet-title">{title}</h2>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          <button type="button" className="sch-sheet-close" onClick={onClose} aria-label="Close"><IconX size={18} stroke={1.8} aria-hidden="true" /></button>
        </header>
        <div className="sch-sheet-body">{children}</div>
        {footer ? <footer className="sch-sheet-foot">{footer}</footer> : null}
      </div>
    </div>
  );
}

export default function SchedulePage({ userId, client = supabase }) {
  const spreadsheets = useSpreadsheetBuildings(userId);
  const state = useBuildingSchedule(client, userId, spreadsheets);
  const [sheet, setSheet] = useState(null);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null);
  const [selectedDays, setSelectedDays] = useState([]);
  const blocked = state.loading || Boolean(state.loadError) || state.saving;

  const scheduled = [...new Map(SCHEDULE_DAYS.flatMap((day) => state.value.days[day]).map((name) => [scheduleBuildingKey(name), name])).values()];
  const editingExisting = scheduled.some((name) => scheduleBuildingKey(name) === scheduleBuildingKey(editing));
  const available = state.buildings.filter((name) => !scheduled.some((item) => scheduleBuildingKey(item) === scheduleBuildingKey(name))
    && name.toLowerCase().includes(search.trim().toLowerCase()));

  function openAdd() { setSearch(""); setSheet("add"); }
  function edit(name) { setEditing(name); setSelectedDays(daysFor(state.value, name)); setSheet("edit"); }
  function toggleDay(day) { setSelectedDays((previous) => previous.includes(day) ? previous.filter((item) => item !== day) : [...previous, day]); }
  function done() {
    // Keep a building where it is on days it already had, so cards don't jump.
    state.change((current) => ({ days: Object.fromEntries(SCHEDULE_DAYS.map((day) => {
      const items = current.days[day];
      const has = items.some((name) => scheduleBuildingKey(name) === scheduleBuildingKey(editing));
      if (selectedDays.includes(day)) return [day, has ? items : [...items, editing]];
      return [day, items.filter((name) => scheduleBuildingKey(name) !== scheduleBuildingKey(editing))];
    })) }));
    setSheet(null);
  }
  const close = () => setSheet(null);

  return (
    <main className="sch-page" aria-label="Schedule">
      <div className="sch-toolbar">
        <span className={`sch-state${state.value.enabled ? " is-on" : ""}`}>{state.value.enabled ? "Schedule on" : "Schedule off"}</span>
        <button type="button" className="sch-icon-btn" onClick={() => setSheet("settings")} aria-label="Schedule settings" data-tooltip="Settings" disabled={state.loading || Boolean(state.loadError)}>
          <IconSettings size={19} stroke={1.7} aria-hidden="true" />
        </button>
        {scheduled.length ? (
          <button type="button" className="sch-add" onClick={openAdd} disabled={blocked}>
            <IconPlus size={17} stroke={2} aria-hidden="true" />Add building
          </button>
        ) : null}
      </div>

      {state.loading ? <p className="sch-status" role="status">Loading your schedule…</p> : null}
      {state.loadError ? (
        <div className="sch-status is-error" role="alert">{state.loadError.message} <button type="button" onClick={state.retry}>Retry</button></div>
      ) : null}

      {scheduled.length ? (
        <ul className="sch-list">
          {scheduled.map((name) => (
            <li key={scheduleBuildingKey(name)}>
              <button type="button" className="sch-card" disabled={blocked} onClick={() => edit(name)} aria-label={`Edit schedule for ${name}`}>
                <span className="sch-card-top">
                  <strong>{name}</strong>
                  <IconPencil size={17} stroke={1.8} aria-hidden="true" />
                  <IconCircleCheckFilled className="sch-card-check" size={20} aria-hidden="true" />
                </span>
                <span className="sch-days">
                  {daysFor(state.value, name).map((day) => <span key={day}>{day.slice(0, 3)}</span>)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : !state.loading && !state.loadError ? (
        <section className="sch-empty">
          <img src={scheduleArt} alt="" />
          <h2>Plan your first send</h2>
          <p>Choose a building and the days to reach its sellers.</p>
          <button type="button" className="sch-primary" onClick={openAdd} disabled={blocked}>Add building</button>
        </section>
      ) : null}

      {state.dirty ? (
        <div className="sch-savebar">
          {state.error ? <p role="alert" className="sch-error">{state.error.message}</p> : null}
          <button type="button" className="sch-primary is-round" disabled={blocked || !state.dirty} onClick={state.save}>
            {state.saving ? "Saving…" : state.saved ? "Saved" : "Save schedule"}
          </button>
        </div>
      ) : null}

      {sheet === "add" && (
        <Sheet title="Add building" onClose={close}>
          <label className="sch-source">
            <span>Spreadsheet</span>
            <select value={spreadsheets.sourceId} onChange={(event) => { spreadsheets.setSourceId(event.target.value); setSearch(""); }}>
              <option value="">{spreadsheets.sources.length ? "Choose a spreadsheet" : "No spreadsheets yet"}</option>
              {spreadsheets.sources.map((source) => <option key={source.id} value={source.id}>{source.label}</option>)}
            </select>
          </label>
          {spreadsheets.sourceId ? (
            <SearchField className="is-full" placeholder="Search buildings" value={search} onChange={(event) => setSearch(event.target.value)} onClear={() => setSearch("")} />
          ) : null}
          <ul className="sch-pick">
            {available.map((name) => (
              <li key={scheduleBuildingKey(name)}>
                <button type="button" disabled={blocked} onClick={() => edit(name)}>
                  <span>{name}</span>
                  <IconPlus size={17} stroke={1.8} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
          {!available.length ? (
            <p className="sch-note is-center">
              {!spreadsheets.sourceId ? "Choose a spreadsheet to see its buildings."
                : search ? "No matching buildings."
                  : state.buildings.length ? "All of this spreadsheet’s buildings are already scheduled."
                    : "This spreadsheet has no sellers with building names yet."}
            </p>
          ) : null}
        </Sheet>
      )}

      {sheet === "edit" && (
        <Sheet
          title={editingExisting ? "Edit schedule" : "New schedule"}
          subtitle={editing}
          onClose={close}
          footer={(
            <>
              {editingExisting ? (
                <button type="button" className="sch-danger" disabled={blocked} onClick={() => { state.removeBuilding(editing); close(); }}>Remove</button>
              ) : null}
              <button type="button" className="sch-primary is-round" disabled={blocked || (!editingExisting && !selectedDays.length)} onClick={done}>Done</button>
            </>
          )}
        >
          <div className="sch-day-picker" role="group" aria-label="Days to send">
            {SCHEDULE_DAYS.map((day) => {
              const checked = selectedDays.includes(day);
              return (
                <button key={day} type="button" role="checkbox" aria-checked={checked} aria-label={day} disabled={blocked}
                  className={checked ? "is-on" : ""} onClick={() => toggleDay(day)}>
                  {day.slice(0, 2)}
                </button>
              );
            })}
          </div>
          {!selectedDays.length ? (
            <p className="sch-note is-center">{editingExisting ? "No days selected. Done removes this building from the schedule." : "Choose the days to send."}</p>
          ) : null}
        </Sheet>
      )}

      {sheet === "settings" && (
        <Sheet title="Schedule settings" onClose={close}>
          <SchedulePreferences userId={userId} client={client} />
        </Sheet>
      )}
    </main>
  );
}
