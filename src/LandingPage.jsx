import { useEffect, useState } from "react";
import LandingProductStory from "./LandingProductStory";
import LandingConnectedStack from "./LandingConnectedStack";
import LandingBrokerFeedback from "./LandingBrokerFeedback";
import LandingClosing from "./LandingClosing";
import LandingPricing from "./LandingPricing";
import LandingBuildings from "./LandingBuildings";
import "./styles/landing.css";
import "./styles/landing-overview.css";
import "./styles/landing-product-story.css";
import "./styles/landing-dark.css";

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
  const [headerScrolled, setHeaderScrolled] = useState(false);
  useEffect(() => {
    const updateHeader = () => setHeaderScrolled(window.scrollY > 8);
    updateHeader();
    window.addEventListener("scroll", updateHeader, { passive: true });
    return () => window.removeEventListener("scroll", updateHeader);
  }, []);
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
    <div className={`landing${pricingOnly ? "" : " landing-dark"}`}>
      <div className={`landing-header-frame${headerScrolled || pricingOnly ? " is-scrolled" : ""}`}>
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
            src="/landing/hero-seller-follow-up-clean-v2.png"
            alt="Illustration of Repeat AI's seller workspace: fictional broker Omar Hassan's sample card with an anonymous suited silhouette, above a WhatsApp update on recent building transactions and an invitation to discuss selling."
            width="1858"
            height="846"
            fetchPriority="high"
            decoding="async"
          />
        </figure>
      </section>

      <LandingBuildings />

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
