import { useEffect } from "react";
import LandingProductStory from "./LandingProductStory";
import LandingConnectedStack from "./LandingConnectedStack";
import LandingBrokerFeedback from "./LandingBrokerFeedback";
import LandingClosing from "./LandingClosing";
import LandingPricing from "./LandingPricing";
import "./styles/landing.css";
import "./styles/landing-overview.css";
import "./styles/landing-product-story.css";

const DUBAI_TOWERS = [
  {
    name: "Marina Gate",
    logo: "/landing/tower-logos/marina-gate.png",
    logoAlt: "Jumeirah Living Marina Gate",
    logoKey: "marina-gate",
  },
  {
    name: "Burj Khalifa",
    logo: "/landing/tower-logos/burj-khalifa.svg",
    logoAlt: "Burj Khalifa",
    logoKey: "burj-khalifa",
  },
  {
    name: "One Za'abeel",
    logo: "/landing/tower-logos/one-zaabeel.svg",
    logoAlt: "One Za'abeel",
    logoKey: "one-zaabeel",
  },
  {
    name: "Atlantis The Royal",
    logo: "/landing/tower-logos/atlantis-the-royal.png",
    logoAlt: "Atlantis The Royal Dubai",
    logoKey: "atlantis",
  },
  {
    name: "St. Regis Residences",
    logo: "/landing/tower-logos/st-regis.svg",
    logoAlt: "The St. Regis Residences Financial Center Road Dubai",
    logoKey: "st-regis",
  },
  {
    name: "Address Sky View",
    logo: "/landing/tower-logos/address-sky-view.svg",
    logoAlt: "Address Sky View",
    logoKey: "address",
  },
];

export default function LandingPage({
  billingError = null,
  billingMessage = null,
  checkoutPending = false,
  isAuthenticated = false,
  pricingOnly = false,
  hasSubscription = false,
  onGetStarted,
  onSignIn,
  onSignOut,
  onSubscribe,
}) {
  const accountActionLabel = isAuthenticated ? "Sign out" : "Log in";
  const accountAction = isAuthenticated ? onSignOut : onSignIn;
  const heroCtaLabel = isAuthenticated
    ? checkoutPending
      ? "Redirecting..."
      : "Continue to Stripe"
    : "Get started";
  const heroCtaAction = isAuthenticated ? onSubscribe : onGetStarted;

  useEffect(() => {
    // Public pages mount after session lookup, later than native hash scrolling.
    const target = document.getElementById(window.location.hash.slice(1));
    target?.scrollIntoView({ block: "start" });
  }, [pricingOnly]);

  return (
    <div className="landing">
      <div className="landing-header-frame">
        <header className="landing-header">
          <a className="landing-brand" href="/" aria-label="Repeat AI home">
            <img src="/brand/repeat-ai-logo.png" alt="Repeat AI" className="landing-brand-logo" width="140" height="25" />
          </a>
          <nav className="landing-nav" aria-label="Account">
            <a className="landing-nav-link" href="/pricing" aria-current={pricingOnly ? "page" : undefined}>Pricing</a>
            <button type="button" className="landing-nav-link" onClick={accountAction}>
              {accountActionLabel}
            </button>
          </nav>
        </header>
      </div>

      {pricingOnly ? (
        <LandingPricing checkoutPending={checkoutPending} billingError={billingError} billingMessage={billingMessage} hasSubscription={hasSubscription} onGetStarted={heroCtaAction} />
      ) : <>
      <section className="landing-hero" aria-labelledby="landing-headline">
        <div className="landing-hero-copy">
          <h1 className="landing-headline" id="landing-headline">
            Seller follow-up that <em>works</em> for you.
          </h1>
          <p className="landing-sub">
            Keep your sellers, spreadsheets and listing alerts together.{" "}
            <br className="landing-hero-break" />
            Automate up to 50 seller follow-ups a day on WhatsApp.
          </p>

          <div className="landing-hero-actions">
            <button
              type="button"
              className="landing-cta landing-cta-lg"
              onClick={heroCtaAction}
              disabled={checkoutPending}
              aria-busy={checkoutPending}
            >
              {isAuthenticated ? heroCtaLabel : "Try Repeat AI for free"}
            </button>
            <p className="landing-hero-note">7-day free trial</p>
          </div>
          {billingError ? <p className="landing-hero-feedback" role="alert">{billingError}</p> : null}
          {billingMessage ? <p className="landing-hero-feedback" role="status">{billingMessage}</p> : null}
        </div>
        <figure className="landing-hero-artwork">
          <img
            src="/landing/hero-seller-follow-up-dubai-v1.png"
            alt="Illustration of Repeat AI's seller workspace: fictional broker Omar Hassan's sample card with an anonymous suited silhouette, above a WhatsApp update on recent building transactions and an invitation to discuss selling."
            width="1859"
            height="846"
            fetchPriority="high"
            decoding="async"
          />
        </figure>
      </section>

      <section className="landing-tower-strip" aria-labelledby="landing-buildings-heading">
        <h2 id="landing-buildings-heading">Your buildings. One workspace.</h2>
        <ul className="landing-tower-track" aria-label="Dubai residential buildings">
          {DUBAI_TOWERS.map((tower) => (
            <li className="landing-tower" key={tower.name}>
              <span className={`landing-tower-logo landing-tower-logo--${tower.logoKey}`}>
                <img src={tower.logo} alt={tower.logoAlt} width="160" height="52" loading="lazy" decoding="async" />
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="landing-overview" id="features" aria-labelledby="landing-overview-heading">
        <div className="landing-overview-inner">
          <h2 id="landing-overview-heading">Bring your seller data together.<br />Keep the conversation going.</h2>
          <figure className="landing-overview-artwork">
            <picture>
              <source media="(max-width: 600px)" srcSet="/landing/connected-workspace-mobile-v1.png" width="1060" height="1484" />
              <img
                src="/landing/connected-workspace-v1.png"
                alt="Excel and Google Sheets, Bayut market data, WhatsApp, and AI tools Claude and ChatGPT via MCP connect with Repeat AI for organised sellers, market activity and WhatsApp follow-ups."
                width="1983"
                height="793"
                loading="lazy"
                decoding="async"
              />
            </picture>
            <figcaption>Claude and ChatGPT connect via MCP. Ask Repeat is built in, with access currently limited to approved early-access accounts.</figcaption>
          </figure>
        </div>
      </section>

      <LandingProductStory />
      <LandingConnectedStack />
      <LandingBrokerFeedback />
      </>}

      <LandingClosing
        showTrial={!pricingOnly}
        homePrefix={pricingOnly ? "/" : ""}
        billingError={billingError}
        billingMessage={billingMessage}
        checkoutPending={checkoutPending}
        isAuthenticated={isAuthenticated}
        onGetStarted={onGetStarted}
        onSubscribe={onSubscribe}
        accountAction={accountAction}
        accountActionLabel={accountActionLabel}
      />
    </div>
  );
}
