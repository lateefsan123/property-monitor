import { VIEW_TAB_OPTIONS } from "../constants";

export default function ViewTabs({ activeCount, doneCount, onChange, value }) {
  const counts = {
    active: activeCount,
    done: doneCount,
  };

  return (
    <div className="view-tabs">
      {VIEW_TAB_OPTIONS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={`view-tab${value === tab.id ? " active" : ""}`}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
          <span className="view-tab-count">{counts[tab.id]}</span>
        </button>
      ))}
    </div>
  );
}
