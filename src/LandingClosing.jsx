import "./styles/landing-closing.css";

export default function LandingClosing({
  billingError = null,
  billingMessage = null,
  checkoutPending = false,
  isAuthenticated = false,
  onGetStarted,
  onSubscribe,
  accountAction,
  accountActionLabel = "Log in",
}) {
  const actionLabel = checkoutPending
    ? "Redirecting…"
    : isAuthenticated ? "Continue to Stripe" : "Start for free";

  return (
    <div className="landing-closing">
      <section className="landing-trial" id="start-free" aria-labelledby="landing-trial-heading">
        <span id="pricing" className="landing-trial-anchor" aria-hidden="true" />
        <h2 id="landing-trial-heading">Start your<br />7-day free trial.</h2>
        <div className="landing-trial-action">
          <button
            type="button"
            className="landing-trial-button"
            onClick={isAuthenticated ? onSubscribe : onGetStarted}
            disabled={checkoutPending}
            aria-busy={checkoutPending}
          >
            {actionLabel}
          </button>
          <p className="landing-trial-terms">7 days free, then EUR 25/month.</p>
          {billingError ? <p className="landing-trial-error" role="alert">{billingError}</p> : null}
          {billingMessage ? <p className="landing-trial-status" role="status">{billingMessage}</p> : null}
        </div>
      </section>

      <footer className="landing-end-footer">
        <div className="landing-end-main">
          <a className="landing-end-brand" href="/" aria-label="Repeat AI home">
            <img src="/brand/repeat-ai-logo.png" alt="Repeat AI" width="140" height="25" />
          </a>
          <nav aria-label="Product" className="landing-end-links">
            <h2>Product</h2>
            <a href="#product-details">How it works</a>
            <a href="#connected-stack">Connected tools</a>
            <a href="/api/desktop/download">Windows app</a>
          </nav>
          <nav aria-label="Account" className="landing-end-links">
            <h2>Get started</h2>
            <a href="#start-free">Free trial</a>
            <button type="button" onClick={accountAction}>{accountActionLabel}</button>
          </nav>
          <nav aria-label="Legal" className="landing-end-links">
            <h2>Legal</h2>
            <a href="/privacy">Privacy</a>
            <a href="/terms">Terms</a>
          </nav>
        </div>
        <div className="landing-end-bottom">
          <span>© {new Date().getFullYear()} Repeat AI</span>
          <span>Made for Dubai brokers.</span>
        </div>
      </footer>
    </div>
  );
}
