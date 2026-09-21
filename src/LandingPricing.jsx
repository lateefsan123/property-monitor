import "./styles/landing-pricing.css";

const FEATURES = [
  "Seller workspace and follow-up reminders",
  "Excel and Google Sheets imports",
  "Listing alerts and price-drop tracking",
  "Recent building transactions",
  "Personalised templates and broker cards",
  "Up to 50 automated WhatsApp follow-ups a day",
  "Mobile and desktop access",
];

export default function LandingPricing({
  checkoutPending = false,
  billingError = null,
  billingMessage = null,
  hasSubscription = false,
  onGetStarted,
}) {
  return (
    <main className="repeat-pricing" id="pricing" aria-labelledby="pricing-heading">
      <h1 id="pricing-heading">Pricing</h1>
      <div className="repeat-pricing-plan-wrap">
        <div className="repeat-pricing-context"><span>Monthly</span><span>Price in EUR</span></div>
        <section className="repeat-pricing-plan" aria-labelledby="pro-heading">
          <h2 id="pro-heading">Pro</h2>
          <p className="repeat-pricing-price">€25 <span>/month</span></p>
          <p className="repeat-pricing-billing">Billed monthly · Cancel anytime</p>
          <div className="repeat-pricing-features">
            <p>Included</p>
            <ul>{FEATURES.map(feature => <li key={feature}><span aria-hidden="true">✓</span>{feature}</li>)}</ul>
          </div>
          <button type="button" className="repeat-pricing-button" onClick={onGetStarted} disabled={checkoutPending} aria-busy={checkoutPending}>
            {checkoutPending ? "Redirecting…" : hasSubscription ? "Open your workspace" : "Try for free"}
          </button>
          {!hasSubscription ? <p className="repeat-pricing-trial">7 days free, then €25/month.</p> : null}
          {billingError ? <p className="repeat-pricing-error" role="alert">{billingError}</p> : null}
          {billingMessage ? <p className="repeat-pricing-status" role="status">{billingMessage}</p> : null}
        </section>
      </div>
    </main>
  );
}
