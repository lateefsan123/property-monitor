import { useEffect, useRef } from "react";
import { IconBuildingSkyscraper, IconChevronRight, IconFileSpreadsheet, IconMessage, IconUserPlus, IconX } from "@tabler/icons-react";
import "../../styles/create-new-modal.css";

// "Create new" from the top bar: one clean list, styled like the spreadsheet
// import modal (icon tile, title, one line, chevron).
const OPTIONS = [
  { id: "seller", icon: IconUserPlus, title: "Seller", description: "Add a seller to follow up with." },
  { id: "listing-search", icon: IconBuildingSkyscraper, title: "Listing search", description: "Watch a building for new listings and price drops." },
  { id: "spreadsheet", icon: IconFileSpreadsheet, title: "Spreadsheet", description: "Import sellers from a file, a link, Google Sheets or Excel." },
  { id: "message-template", icon: IconMessage, title: "Message template", description: "Write the WhatsApp message your sellers receive." },
];

export default function CreateNewModal({ onClose, onSelect }) {
  const listRef = useRef(null);

  useEffect(() => {
    const previous = document.activeElement;
    listRef.current?.querySelector("button")?.focus();
    function handleKey(event) {
      if (event.key === "Escape") onClose?.();
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
      const buttons = [...(listRef.current?.querySelectorAll("button") || [])];
      const index = buttons.indexOf(document.activeElement);
      if (index < 0) return;
      event.preventDefault();
      buttons[(index + (event.key === "ArrowDown" ? 1 : -1) + buttons.length) % buttons.length].focus();
    }
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
      previous?.focus?.();
    };
  }, [onClose]);

  return (
    <div className="cn-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose?.(); }}>
      <div className="cn-modal" role="dialog" aria-modal="true" aria-labelledby="cn-title">
        <header className="cn-head">
          <h2 id="cn-title">Create new</h2>
          <button type="button" className="cn-close" onClick={onClose} aria-label="Close"><IconX size={18} stroke={2} aria-hidden="true" /></button>
        </header>
        <ul ref={listRef} className="cn-list">
          {OPTIONS.map((option) => (
            <li key={option.id}>
              <button type="button" onClick={() => onSelect?.(option.id)}>
                <span className="cn-icon" aria-hidden="true"><option.icon size={21} stroke={1.7} /></span>
                <span className="cn-text"><strong>{option.title}</strong><span>{option.description}</span></span>
                <IconChevronRight className="cn-chevron" size={18} stroke={1.8} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
