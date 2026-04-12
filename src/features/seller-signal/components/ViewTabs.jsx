import { VIEW_TAB_OPTIONS } from "../constants";

export default function ViewTabs({ onChange, value }) {
  return (
    <div className="tabs">
      {VIEW_TAB_OPTIONS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={`tab${value === tab.id ? " active" : ""}`}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
