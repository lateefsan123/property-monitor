import { IconChevronRight } from "@tabler/icons-react";

// Web versions of mobile's SettingsLayout pieces (mobile/src/components/
// SettingsLayout.js): titled rounded groups of icon rows, switches, and the
// profile card.
export function SettingsGroup({ title, children }) {
  return (
    <section className="st-group">
      {title ? <h3 className="st-group-title">{title}</h3> : null}
      <div className="st-group-card">{children}</div>
    </section>
  );
}

export function SettingsItem({ icon: Icon, label, value, description, onClick, href, children, destructive = false, disabled = false }) {
  const content = (
    <>
      {Icon ? <Icon className="st-item-icon" size={21} stroke={1.7} aria-hidden="true" /> : null}
      <span className="st-item-body">
        <span className="st-item-text">
          <span className="st-item-label">{label}</span>
          {description ? <small>{description}</small> : null}
        </span>
        {value ? <span className="st-item-value">{value}</span> : null}
        {children || (onClick || href ? <IconChevronRight className="st-item-chevron" size={17} stroke={1.8} aria-hidden="true" /> : null)}
      </span>
    </>
  );
  const className = `st-item${destructive ? " is-destructive" : ""}`;
  if (href) return <a className={className} href={href} target="_blank" rel="noopener noreferrer">{content}</a>;
  if (onClick) return <button type="button" className={className} disabled={disabled} onClick={onClick}>{content}</button>;
  return <div className={className}>{content}</div>;
}

export function SettingsToggle({ label, checked, disabled, onChange }) {
  return (
    <input type="checkbox" role="switch" className="st-switch" aria-label={label} checked={Boolean(checked)} disabled={disabled}
      onChange={(event) => onChange(event.target.checked)} />
  );
}

function initialsFor(name) {
  return String(name || "Your account").trim().split(/\s+/).slice(0, 2).map((part) => Array.from(part)[0] || "").join("").toUpperCase();
}

export function Avatar({ name, url, size = 48 }) {
  return (
    <span className="st-avatar" style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}>
      {url ? <img src={url} alt="" /> : initialsFor(name)}
    </span>
  );
}

export function SettingsProfile({ name, avatarUrl, onClick, compact = false }) {
  const shown = name?.trim() || "Your account";
  const body = (
    <>
      <Avatar name={shown} url={avatarUrl} size={compact ? 40 : 48} />
      <span className="st-profile-text">
        <strong>{shown}</strong>
        <small>{onClick ? "Manage your account" : "Repeat AI account"}</small>
      </span>
      {onClick ? <IconChevronRight size={18} stroke={1.8} aria-hidden="true" /> : null}
    </>
  );
  return onClick
    ? <button type="button" className={`st-profile${compact ? " is-compact" : ""}`} onClick={onClick} aria-label={`Manage account for ${shown}`}>{body}</button>
    : <div className={`st-profile${compact ? " is-compact" : ""}`}>{body}</div>;
}
