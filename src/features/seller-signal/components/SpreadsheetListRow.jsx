import { useEffect, useRef } from "react";
import { IconDots, IconFileSpreadsheet, IconPinned, IconStar, IconStarFilled } from "@tabler/icons-react";

export default function SpreadsheetListRow({ name, count, favorited, pinned, selected, selectionActive, onClick, onToggleSelect, onToggleFavorite, onTogglePin }) {
  const menu = useRef(null);
  useEffect(() => {
    function dismiss(event) {
      if (!menu.current?.open) return;
      if (event.type === "keydown" && event.key === "Escape") {
        menu.current.open = false;
        menu.current.querySelector("summary")?.focus();
      } else if (event.type === "pointerdown" && !menu.current.contains(event.target)) {
        menu.current.open = false;
      }
    }
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", dismiss);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", dismiss);
    };
  }, []);
  function action(callback) {
    menu.current.open = false;
    callback();
  }
  const Star = favorited ? IconStarFilled : IconStar;
  return (
    <div className={`ss-list-row${selected ? " is-selected" : ""}`}>
      {selectionActive && <input type="checkbox" checked={selected} onChange={onToggleSelect} aria-label={`Select ${name}`} />}
      <button type="button" className="ss-list-open" onClick={onClick}>
        <IconFileSpreadsheet size={24} stroke={1.4} aria-hidden="true" />
        <span className="ss-list-name">{name}{pinned && <IconPinned size={14} aria-label="Pinned" />}</span>
        <span className="ss-list-count">{count} seller{count === 1 ? "" : "s"}</span>
      </button>
      <button type="button" className="ss-list-action" onClick={onToggleFavorite} aria-label={`${favorited ? "Unfavorite" : "Favorite"} ${name}`} aria-pressed={favorited}>
        <Star size={19} stroke={1.5} aria-hidden="true" />
      </button>
      <details className="ss-list-more" ref={menu}>
        <summary className="ss-list-action" aria-label={`More actions for ${name}`}><IconDots size={20} aria-hidden="true" /></summary>
        <div className="ss-list-menu">
          <button type="button" onClick={() => action(onTogglePin)}>{pinned ? "Unpin" : "Pin"}</button>
          <button type="button" onClick={() => action(onToggleSelect)}>{selected ? "Deselect" : "Select"}</button>
        </div>
      </details>
    </div>
  );
}
