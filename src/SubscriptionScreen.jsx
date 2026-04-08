const FEATURE_ROWS = [
  [
    "Unlimited lead imports",
    "Building-level sales comps",
    "Due-only seller follow-ups",
  ],
  [
    "Ready-to-send WhatsApp copy",
    "Smart sheet column mapping",
    "Active and done pipeline tracking",
  ],
];

export default function SubscriptionScreen({
  billingError,
  billingMessage,
  checkoutPending,
  onStartCheckout,
  subscriptionLoading,
}) {
  const logoSrc = `${import.meta.env.BASE_URL}logo.png`;
  const backgroundSrc = `${import.meta.env.BASE_URL}dubaii.png`;
  const ctaLabel = checkoutPending
    ? "Redirecting to Stripe..."
    : subscriptionLoading
    ? "Checking subscription..."
    : "Continue to Stripe";

  return (
    <div className="subscription-screen">
      <div
        aria-hidden="true"
        className="subscription-backdrop"
        style={{ backgroundImage: `url("${backgroundSrc}")` }}
      />
      <div aria-hidden="true" className="subscription-overlay" />

      <div className="subscription-shell">
        <div className="subscription-content">
          <div className="subscription-brand">
            <img alt="Seller Signal" className="subscription-logo" src={logoSrc} />
            <span>seller signal</span>
          </div>

          <div className="subscription-copy">
            <h1>Turn raw owner lists into seller signals</h1>
            <p>
              Import your Google Sheet, enrich each lead with recent building sales,
              and move faster on owner outreach.
            </p>
          </div>

          <div className="subscription-feature-rows">
            {FEATURE_ROWS.map((row, rowIndex) => (
              <div className={`subscription-feature-row${rowIndex % 2 === 1 ? " reverse" : ""}`} key={row[0]}>
                {row.map((item) => (
                  <span className="subscription-feature-pill" key={item}>
                    {item}
                  </span>
                ))}
              </div>
            ))}
          </div>

          <div className="subscription-plan-single">
            <div className="subscription-plan-card selected">
              <div className="subscription-plan-top">
                <span>Seller Signal Pro</span>
                <span className="subscription-plan-badge">EUR 20 / month</span>
              </div>
              <strong>EUR 20</strong>
              <p>One monthly subscription per account. No yearly plan, no per-user pricing.</p>
            </div>
          </div>

          {billingMessage ? (
            <p className="subscription-status-note">{billingMessage}</p>
          ) : null}

          {billingError ? (
            <p className="subscription-error-note" role="alert">{billingError}</p>
          ) : null}
        </div>

        <div className="subscription-footer">
          <button
            className="subscription-unlock-btn"
            disabled={checkoutPending || subscriptionLoading}
            onClick={onStartCheckout}
            type="button"
          >
            {ctaLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
