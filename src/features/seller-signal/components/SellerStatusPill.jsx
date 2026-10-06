// Dotted status pill used in the sellers table and the seller drawer.
// `color` (an account status's own colour) overrides the tone.
export default function SellerStatusPill({ tone, color, children, title }) {
  return <span className={`seller-status seller-status--${color ? "custom" : tone}`} style={color ? { "--status-color": color } : undefined} title={title}><span className="seller-status-dot" aria-hidden="true" />{children}</span>;
}
