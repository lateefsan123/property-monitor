import { IconSearch, IconX } from "@tabler/icons-react";
import "../styles/search-field.css";

// The Sellers page search pill, shared by every search box in the app:
// 44px rounded outline, search icon, and a clear button once there is text.
export default function SearchField({ value, onChange, onClear, label, placeholder, className = "", inputRef, ...inputProps }) {
  return (
    <label className={`app-search${className ? ` ${className}` : ""}`}>
      <IconSearch size={18} stroke={2} aria-hidden="true" />
      <input
        ref={inputRef}
        type="search"
        aria-label={label || placeholder}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        {...inputProps}
      />
      {value && onClear ? (
        <button type="button" className="app-search-clear" aria-label={`Clear ${(label || placeholder || "search").toLowerCase()}`} onClick={onClear}>
          <IconX size={15} stroke={2} aria-hidden="true" />
        </button>
      ) : null}
    </label>
  );
}
