import { useEffect, useRef, useState } from "react";
import { IconPlus, IconX } from "@tabler/icons-react";
import { supabase } from "../../supabase";
import { useBuildingSchedule } from "../../../shared/use-building-schedule.js";
import { SCHEDULE_DAYS, scheduleBuildingKey } from "../../../supabase/functions/_shared/building-schedule.js";
import "./schedule.css";

export default function SchedulePage({ userId, client = supabase }) {
  const state = useBuildingSchedule(client, userId);
  const [day, setDay] = useState(null);
  const [search, setSearch] = useState("");
  const dialog = useRef(null);
  useEffect(() => {
    if (day) dialog.current?.showModal();
    else dialog.current?.close();
  }, [day]);
  const blocked = state.loading || Boolean(state.loadError) || state.saving;
  return (
    <main className="schedule-page">
      <header className="schedule-heading">
        <h1>Schedule</h1>
        <div className="schedule-heading-actions"><button className="schedule-save" disabled={blocked || !state.dirty} onClick={state.save}>{state.saving ? "Saving…" : state.saved ? "Saved" : "Save"}</button></div>
      </header>
      {state.loadError ? <div role="alert" className="schedule-feedback">{state.loadError.message} <button onClick={state.retry}>Retry</button></div> : null}
      {state.error ? <p role="alert" className="schedule-feedback">{state.error.message}</p> : null}
      <div role="status" className="schedule-sr-only">{state.loading ? "Loading your schedule…" : state.saved ? "Schedule saved" : state.dirty ? "Unsaved changes" : ""}</div>
      <fieldset disabled={blocked} className="schedule-controls">
        <label className="schedule-enable" title="Repeats weekly in Dubai time. Turning this off restores account-wide automation; it does not pause sending."><input type="checkbox" checked={state.value.enabled} onChange={event => state.change({ enabled: event.target.checked })} />Weekly schedule</label>
        <div className="schedule-board" aria-label="Weekly building schedule">
          {SCHEDULE_DAYS.map(name => <section key={name} className="schedule-day" aria-label={name}>
            <h2>{name}</h2>
            <div className="schedule-buildings">
              {state.value.days[name].map(building => <div className="schedule-building" key={building}><span>{building}</span><button aria-label={`Remove ${building} from ${name}`} onClick={() => state.toggleBuilding(name, building)}><IconX size={15} /></button></div>)}
              {!state.value.days[name].length ? <p className="schedule-off">No sends</p> : null}
            </div>
            <button className="schedule-add" aria-label={`Add buildings to ${name}`} onClick={() => { setSearch(""); setDay(name); }}><IconPlus size={16} />Add buildings</button>
          </section>)}
        </div>
        <label className="schedule-fallback" title="Use other buildings when selected buildings run out. Empty days stay off; existing sending limits still apply."><input type="checkbox" checked={state.value.fill_unused} onChange={event => state.change({ fill_unused: event.target.checked })} /><span>Fill unused slots from other buildings</span></label>
      </fieldset>
      <dialog ref={dialog} className="schedule-picker" onCancel={() => setDay(null)} onClose={() => setDay(null)} onClick={event => { if (event.target === dialog.current) setDay(null); }}>
        <header><h2>{day} buildings</h2><button aria-label="Close building picker" onClick={() => setDay(null)}><IconX size={20} /></button></header>
        <input aria-label="Search your buildings" placeholder="Search your buildings" value={search} onChange={event => setSearch(event.target.value)} />
        <div className="schedule-picker-list">
          {state.buildings.filter(name => name.toLowerCase().includes(search.toLowerCase())).map(name => <label key={name}><input type="checkbox" checked={Boolean(day && state.value.days[day].some(item => scheduleBuildingKey(item) === scheduleBuildingKey(name)))} onChange={() => state.toggleBuilding(day, name)} /><span>{name}</span></label>)}
          {!state.buildings.length ? <p>Add sellers with building names to see them here.</p> : !state.buildings.some(name => name.toLowerCase().includes(search.toLowerCase())) ? <p>No matching buildings.</p> : null}
        </div>
        <button className="schedule-save" onClick={() => setDay(null)}>Done</button>
      </dialog>
    </main>
  );
}
