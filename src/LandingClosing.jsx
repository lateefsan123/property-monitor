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
  showTrial = true,
  homePrefix = "",
}) {
  const actionLabel = checkoutPending
    ? "Redirecting…"
    : isAuthenticated ? "Continue to Stripe" : "Start for free";

  return (
    <div className="landing-closing">
      {showTrial ? <section className="landing-trial" id="start-free" aria-labelledby="landing-trial-heading">
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
      </section> : null}

      <footer className="landing-end-footer">
        <div className="landing-end-inner">
          <a className="landing-end-brand" href="/" aria-label="Repeat AI home">
            <img src="/brand/repeat-ai-logo.png" alt="Repeat AI" width="140" height="25" />
          </a>
          <div className="landing-end-main">
            <nav aria-label="Product" className="landing-end-links">
              <h2>Product</h2>
              <a href={`${homePrefix}#product-details`}>How it works</a>
              <a href={`${homePrefix}#connected-stack`}>Connected tools</a>
              <a href="/pricing">Pricing</a>
              <a href={`${homePrefix}#start-free`}>Free trial</a>
            </nav>
            <nav aria-label="Sellers" className="landing-end-links">
              <h2>Sellers</h2>
              <a href={`${homePrefix}#seller-workspace`}>Seller workspace</a>
              <a href={`${homePrefix}#market-activity`}>Market activity</a>
            </nav>
            <nav aria-label="Outreach" className="landing-end-links">
              <h2>Outreach</h2>
              <a href={`${homePrefix}#message-templates`}>Message templates</a>
              <a href={`${homePrefix}#whatsapp-follow-ups`}>WhatsApp follow-ups</a>
            </nav>
            <nav aria-label="Account" className="landing-end-links">
              <h2>Get started</h2>
              <a href="/api/desktop/download">Windows app</a>
              <button type="button" onClick={accountAction}>{accountActionLabel}</button>
            </nav>
          </div>
          <div className="landing-end-bottom">
            <nav aria-label="Legal" className="landing-end-legal">
              <a href="/terms">Terms of Use</a>
              <a href="/privacy">Privacy Policy</a>
            </nav>
            <span>© {new Date().getFullYear()} Repeat AI</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
