import { IconMoon, IconSun } from "@tabler/icons-react";

export default function ThemeToggleButton({ theme, onToggle }) {
  const isDark = theme === "dark";
  const label = isDark ? "Switch to light mode" : "Switch to dark mode";

  return (
    <button
      type="button"
      className="sheet-topbar-new-btn"
      onClick={onToggle}
      aria-label={label}
      aria-pressed={isDark}
      title={label}
    >
      {isDark ? (
        <IconSun size={18} stroke={1.8} aria-hidden="true" />
      ) : (
        <IconMoon size={18} stroke={1.8} aria-hidden="true" />
      )}
    </button>
  );
}
