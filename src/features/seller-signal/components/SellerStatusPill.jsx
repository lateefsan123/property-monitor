// Dotted status pill used in the sellers table and the seller drawer.
export default function SellerStatusPill({ tone, children, title }) {
  return <span className={`seller-status seller-status--${tone}`} title={title}><span className="seller-status-dot" aria-hidden="true" />{children}</span>;
}
