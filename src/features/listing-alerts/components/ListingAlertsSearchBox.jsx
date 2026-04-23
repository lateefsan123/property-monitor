import { useEffect, useMemo, useRef, useState } from "react";
import { getSearchOptionLabel, getSearchOptionMeta } from "./ListingAlertsRows";

export default function ListingAlertsSearchBox({
  searchTerm,
  searchLoading,
  searchError,
  searchOptions,
  selectedOption,
  onSearchTermChange,
  onSelectOption,
  visible = true,
  inputRef,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const boxRef = useRef(null);

  useEffect(() => {
    function handlePointerDown(event) {
      if (!boxRef.current?.contains(event.target)) {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, []);

  const safeActiveIndex = searchOptions.length
    ? Math.min(activeIndex, searchOptions.length - 1)
    : 0;
  const showDropdown = visible
    && menuOpen
    && searchTerm.trim().length >= 2
    && (searchLoading || Boolean(searchError) || searchOptions.length > 0 || !selectedOption);

  const selectedLocationId = selectedOption?.locationId || null;
  const dropdownOptions = useMemo(
    () => searchOptions.map((option, index) => ({
      index,
      option,
      meta: getSearchOptionMeta(option),
      isActive: index === safeActiveIndex,
      isSelected: selectedLocationId === option.locationId,
    })),
    [safeActiveIndex, searchOptions, selectedLocationId],
  );

  function handleInputChange(event) {
    const nextValue = event.target.value;
    onSelectOption(null);
    setMenuOpen(nextValue.trim().length >= 2);
    setActiveIndex(0);
    onSearchTermChange(nextValue);
  }

  function handleOptionSelect(option) {
    if (!option) return;
    onSelectOption(option);
    setMenuOpen(false);
    setActiveIndex(0);
    onSearchTermChange(getSearchOptionLabel(option));
  }

  function handleKeyDown(event) {
    if (event.key === "Escape") {
      setMenuOpen(false);
      return;
    }

    if (searchTerm.trim().length < 2) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!menuOpen) {
        setMenuOpen(true);
        setActiveIndex(0);
        return;
      }
      if (!searchOptions.length) return;
      setActiveIndex((current) => (current + 1) % searchOptions.length);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!menuOpen) {
        setMenuOpen(true);
        setActiveIndex(Math.max(searchOptions.length - 1, 0));
        return;
      }
      if (!searchOptions.length) return;
      setActiveIndex((current) => (current - 1 + searchOptions.length) % searchOptions.length);
      return;
    }

    if (event.key === "Enter" && menuOpen && searchOptions.length) {
      event.preventDefault();
      handleOptionSelect(searchOptions[safeActiveIndex] || searchOptions[0]);
    }
  }

  if (!visible) return null;

  return (
    <div className="la-search-pill-wrap" ref={boxRef}>
      <label className="search-pill">
        <svg className="search-pill-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <circle cx="11" cy="11" r="7" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          placeholder="Search buildings"
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={() => {
            if (searchTerm.trim().length >= 2) {
              setMenuOpen(true);
            }
          }}
          onKeyDown={handleKeyDown}
          autoCapitalize="none"
          autoCorrect="off"
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={showDropdown}
          aria-label="Search buildings"
        />
      </label>

      {showDropdown ? (
        <div className="la-search-dropdown" role="listbox" aria-label="Available building options">
          {searchLoading ? (
            <div className="la-search-dropdown-state">Searching available buildings...</div>
          ) : searchError ? (
            <div className="la-search-dropdown-state">Search is unavailable right now.</div>
          ) : dropdownOptions.length ? (
            dropdownOptions.map(({ index, option, meta, isActive, isSelected }) => (
              <button
                key={option.locationId || index}
                type="button"
                className={`la-search-option${isActive ? " active" : ""}${isSelected ? " selected" : ""}`}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => handleOptionSelect(option)}
                role="option"
                aria-selected={isSelected}
              >
                <span className="la-search-option-copy">
                  <span className="la-search-option-title">
                    <span className="la-search-option-name">{getSearchOptionLabel(option)}</span>
                    {meta ? <span className="la-search-option-meta">, {meta}</span> : null}
                  </span>
                </span>
              </button>
            ))
          ) : (
            <div className="la-search-dropdown-state">No buildings match that search.</div>
          )}
        </div>
      ) : null}
    </div>
  );
}
