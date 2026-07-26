import { useState } from "react";
import "./styles/landing.css";

const FAQS = [
  {
    q: "What is Seller Signal, and how does it work?",
    a: "Seller Signal is a focused workspace for Dubai real estate brokers to track sellers, monitor building activity, and run follow-ups. You import or add your sellers, and the app keeps your pipeline and watched buildings in one place instead of scattered spreadsheets.",
  },
  {
    q: "How does billing work?",
    a: "Seller Signal runs on a single Professional plan at EUR 20/month, billed through Stripe on the web. One subscription unlocks the full workspace and mobile access.",
  },
  {
    q: "How does importing spreadsheets work?",
    a: "Drop your existing Google Sheet or Excel file in and we'll map columns to seller fields. Your data lives in Seller Signal after import, while Sheets stays available as your export if you need it.",
  },
  {
    q: "What happens if I cancel?",
    a: "Access stays active through the end of your paid period. After that, signing in takes you back to the pricing page until you start a new monthly subscription.",
  },
  {
    q: "Is there a mobile app?",
    a: "Yes - the mobile app is included with Professional. It's built for the parts of the job that happen away from your desk: checking listing alerts, logging calls, and pulling up a seller on the way to a viewing.",
  },
  {
    q: "How is this different from a CRM?",
    a: "A generic CRM tries to fit any business. Seller Signal is built around how Dubai brokers actually work - towers, seller statuses, and listing portals - so there is less to configure and more that fits immediately.",
  },
  {
    q: "Is my seller data private?",
    a: "Your data is yours. It's not shared with other users, sold to third parties, or used to train anything. You can export or delete it whenever you want.",
  },
];

const TESTIMONIALS = [
  {
    title: "Finally an app built for us",
    body:
      "Stopped juggling a dozen spreadsheets. My pipeline actually makes sense now - first real estate tool I've opened twice in a week.",
    author: "Agent, Marina",
  },
  {
    title: "Cleanest workflow I've used",
    body:
      "The listing alerts are actually useful. I see new units come up before my junior even opens the portals.",
    author: "Senior broker, JBR",
  },
  {
    title: "Did what I wanted Excel to do",
    body:
      "Import once and it just works. Saved me an afternoon of copying cells and arguing with formatting.",
    author: "Independent agent",
  },
  {
    title: "Worth the EUR 20, easily",
    body:
      "The price drop alerts paid for it in my first month. Closed a 2BR because I was the first to call.",
    author: "Downtown specialist",
  },
  {
    title: "Great for a small team",
    body:
      "Three of us share the same pipeline now. Nothing gets missed, nothing gets called twice.",
    author: "Team lead, Business Bay",
  },
  {
    title: "Not bloated, just useful",
    body:
      "Doesn't try to be a CRM, a dialer, and a calendar at once. Does seller follow-up, does it well.",
    author: "Broker, Palm Jumeirah",
  },
];

export default function LandingPage({
  billingError = null,
  billingMessage = null,
  checkoutPending = false,
  isAuthenticated = false,
  onGetStarted,
  onSignIn,
  onSignOut,
  onSubscribe,
}) {
  const [openFaq, setOpenFaq] = useState(null);
  const accountActionLabel = isAuthenticated ? "Sign out" : "Sign in";
  const accountAction = isAuthenticated ? onSignOut : onSignIn;
  const heroCtaLabel = isAuthenticated
    ? checkoutPending
      ? "Redirecting..."
      : "Continue to Stripe"
    : "Get started";
  const heroCtaAction = isAuthenticated ? onSubscribe : onGetStarted;
  const pricingCtaLabel = checkoutPending
    ? "Redirecting to Stripe..."
    : isAuthenticated
    ? "Continue to Stripe"
    : "Start subscription";

  return (
    <div className="landing">
      <header className="landing-header">
        <div className="landing-brand">Seller Signal</div>
        <nav className="landing-nav">
          <a href="#pricing">Pricing</a>
          <button type="button" className="landing-nav-link" onClick={accountAction}>
            {accountActionLabel}
          </button>
          <button type="button" className="landing-cta landing-cta-sm" onClick={heroCtaAction}>
            {heroCtaLabel}
          </button>
        </nav>
      </header>

      <section className="landing-hero">
        <div className="landing-hero-copy">
          <h1 className="landing-headline">Seller follow-up, done properly.</h1>
          <p className="landing-sub">
            Track sellers, monitor listings, and manage spreadsheets from one calm
            workspace.
          </p>

          <div className="landing-hero-actions">
            <button
              type="button"
              className="landing-cta landing-cta-lg"
              onClick={heroCtaAction}
            >
              {heroCtaLabel}
            </button>
            <a href="#features" className="landing-cta-ghost">
              See how it works
            </a>
          </div>
        </div>
      </section>

      <section className="landing-features" id="features">
        <h2 className="landing-features-title">Why brokers choose Seller Signal.</h2>
        <div className="landing-feature-grid">
          <article className="landing-feature-card">
            <div className="landing-feature-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="8" r="3.5" />
                <path d="M5 20c0-3.5 3.2-6 7-6s7 2.5 7 6" strokeLinecap="round" />
              </svg>
            </div>
            <h3>Sellers, tracked properly</h3>
            <p>
              Keep every prospect, status, contact detail, and follow-up in one
              focused pipeline. No more scrolling through a dozen spreadsheets
              to find who you promised to call back.
            </p>
            <p className="landing-feature-note">
              Built around how Dubai brokers actually work.
            </p>
          </article>

          <article className="landing-feature-card">
            <div className="landing-feature-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M4 20h16" strokeLinecap="round" />
                <rect x="5" y="4" width="6" height="16" rx="1" />
                <rect x="13" y="9" width="6" height="11" rx="1" />
                <path d="M7 8h2M7 11h2M7 14h2M15 12h2M15 15h2" strokeLinecap="round" />
              </svg>
            </div>
            <h3>Listings that actually matter</h3>
            <p>
              Monitor building activity, price drops, and new listings across
              the towers you care about. Get signal when the market moves,
              not noise from everywhere else.
            </p>
          </article>

          <article className="landing-feature-card">
            <div className="landing-feature-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3.5" y="3.5" width="17" height="17" rx="2" />
                <path d="M3.5 9h17M3.5 15h17M9 3.5v17M15 3.5v17" />
              </svg>
            </div>
            <h3>Spreadsheets without the mess</h3>
            <p>
              Import seller data once and let Seller Signal organize it.
              Your pipeline lives in a real workspace - not 40 Google Sheets
              tabs you can't find anymore.
            </p>
          </article>
        </div>
      </section>

      <section className="landing-testimonials">
        <div className="landing-testimonials-header">
          <h2 className="landing-testimonials-title">What brokers are saying.</h2>
          <p className="landing-testimonials-sub">
            Real feedback from the agents and teams who put Seller Signal
            to work on their daily pipelines.
          </p>
        </div>

        <div className="landing-marquee" aria-hidden="false">
          <div className="landing-marquee-track">
            {[...TESTIMONIALS, ...TESTIMONIALS].map((item, index) => (
              <article className="landing-testimonial-card" key={`${item.title}-${index}`}>
                <h3>{item.title}</h3>
                <p>&ldquo;{item.body}&rdquo;</p>
                <span className="landing-testimonial-meta">{item.author}</span>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-pricing" id="pricing">
        <div className="landing-pricing-header">
          <h2 className="landing-pricing-title">Simple pricing.</h2>
          <p className="landing-pricing-sub">
            One monthly plan for full Seller Signal access.
          </p>
        </div>

        <div className="landing-pricing-grid landing-pricing-grid--single">
          <article className="landing-plan landing-plan-featured">
            <div className="landing-plan-label">Professional</div>
            <div className="landing-plan-price">
              <span className="landing-plan-amount">EUR 20</span>
              <span className="landing-plan-unit">/ month</span>
            </div>
            <p className="landing-plan-desc">
              One subscription per account with the full web workspace, listing alerts, and mobile access.
            </p>

            <ul className="landing-plan-features">
              <li>Seller pipeline and follow-up workspace</li>
              <li>Spreadsheet imports and smart mapping</li>
              <li>Listing alerts and price-drop tracking</li>
              <li>Mobile app access</li>
              <li>Monthly billing through Stripe Checkout</li>
            </ul>

            <button
              type="button"
              className="landing-plan-cta landing-plan-cta-primary"
              disabled={checkoutPending}
              onClick={onSubscribe}
            >
              {pricingCtaLabel}
            </button>

            {!isAuthenticated ? (
              <p className="landing-plan-note">
                Create your account first, then we'll send you to Stripe.
              </p>
            ) : null}

            {billingMessage ? (
              <p className="landing-plan-status">{billingMessage}</p>
            ) : null}

            {billingError ? (
              <p className="landing-plan-error" role="alert">{billingError}</p>
            ) : null}
          </article>
        </div>
      </section>

      <section className="landing-faq" id="faq">
        <div className="landing-faq-header">
          <p className="landing-faq-eyebrow">Have questions?</p>
          <h2 className="landing-faq-title">Seller Signal FAQs</h2>
        </div>

        <ul className="landing-faq-list">
          {FAQS.map((item, index) => {
            const isOpen = openFaq === index;
            return (
              <li
                key={item.q}
                className={`landing-faq-item ${isOpen ? "is-open" : ""}`}
              >
                <button
                  type="button"
                  className="landing-faq-question"
                  onClick={() => setOpenFaq(isOpen ? null : index)}
                  aria-expanded={isOpen}
                >
                  <span>{item.q}</span>
                  <span className="landing-faq-icon" aria-hidden="true">
                    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <circle cx="10" cy="10" r="9" />
                      <path d="M6 10h8" strokeLinecap="round" />
                      <path d="M10 6v8" strokeLinecap="round" className="landing-faq-icon-v" />
                    </svg>
                  </span>
                </button>
                <div className="landing-faq-answer">
                  <p>{item.a}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="landing-final-cta">
        <h2>Built for brokers who want a cleaner workflow.</h2>
        <p>Manage sellers, listings, and spreadsheets from one focused workspace.</p>
        <button type="button" className="landing-cta" onClick={heroCtaAction}>
          {heroCtaLabel}
        </button>
      </section>

      <footer className="landing-footer">
        <div className="landing-footer-row">
          <div className="landing-brand">Seller Signal</div>
          <nav className="landing-footer-nav">
            <a href="#features">Product</a>
            <a href="#pricing">Pricing</a>
            <button type="button" className="landing-nav-link" onClick={accountAction}>
              {accountActionLabel}
            </button>
            <a href="/privacy">Privacy</a>
            <a href="/terms">Terms</a>
          </nav>
        </div>
        <p className="landing-footer-tag">seller follow-up, reimagined</p>
      </footer>
    </div>
  );
}
