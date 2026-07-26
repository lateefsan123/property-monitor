import { useState } from "react";
import "./styles/landing.css";

const FAQS = [
  {
    q: "What is Repeat AI, and how does it work?",
    a: "Repeat AI is a focused workspace for Dubai real estate brokers to track sellers, monitor building activity, and run follow-ups. You import or add your sellers, and the app keeps your pipeline and watched buildings in one place instead of scattered spreadsheets.",
  },
  {
    q: "How does billing work?",
    a: "Repeat AI runs on a single Professional plan at EUR 50/month, billed through Stripe on the web. One subscription unlocks the full workspace and mobile access.",
  },
  {
    q: "How does importing spreadsheets work?",
    a: "Drop your existing Google Sheet or Excel file in and we'll map columns to seller fields. Your data lives in Repeat AI after import, while Sheets stays available as your export if you need it.",
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
    a: "A generic CRM tries to fit any business. Repeat AI is built around how Dubai brokers actually work - towers, seller statuses, and listing portals - so there is less to configure and more that fits immediately.",
  },
  {
    q: "Is my seller data private?",
    a: "Your data is yours. It's not shared with other users, sold to third parties, or used to train anything. You can export or delete it whenever you want.",
  },
];

const PRODUCT_SECTIONS = [
  {
    id: "dashboard",
    title: "See the day at a glance.",
    description:
      "The dashboard shows follow-ups due today, messages sent, and price drops across watched buildings. Open Repeat AI and know where to start.",
    image: "/landing/home.png",
    imageAlt: "Repeat AI dashboard showing follow-ups, sent messages, and watched-building price drops",
  },
  {
    id: "listings",
    title: "Track listings as they change.",
    description:
      "See new listings, price drops, status changes, and live units in the buildings you cover. Open a building to review the listings that need attention.",
    image: "/landing/listings.png",
    imageAlt: "Repeat AI listings page showing tracked units and recent price drops",
  },
  {
    id: "sellers",
    title: "Keep every seller in one place.",
    description:
      "Store each seller's contact details, property, status, notes, and next follow-up together. Filter the pipeline and pick up exactly where you left off.",
    image: "/landing/sellers.png",
    imageAlt: "Repeat AI sellers page showing seller records, statuses, and follow-up actions",
  },
  {
    id: "spreadsheets",
    title: "Bring your spreadsheets with you.",
    description:
      "Import the spreadsheets you already use. Repeat AI maps the rows into your seller pipeline and keeps every source organised.",
    image: "/landing/spreadsheets.png",
    imageAlt: "Repeat AI spreadsheets page showing imported seller data sources",
  },
  {
    id: "messages",
    title: "Turn a market signal into a conversation.",
    description:
      "Repeat AI matches relevant activity to the right seller, sends your WhatsApp template and image, and keeps the reply connected to the follow-up.",
    image: "/landing/whatsapp-agent-conversation.png",
    imageAlt: "Example WhatsApp outreach sent by a real estate agent with a seller reply",
  },
];

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
    name: "Museum of the Future",
    logo: "/landing/tower-logos/museum-of-the-future.svg",
    logoAlt: "Museum of the Future",
    logoKey: "museum",
  },
  {
    name: "Dubai Opera",
    logo: "/landing/tower-logos/dubai-opera.webp",
    logoAlt: "Dubai Opera",
    logoKey: "dubai-opera",
  },
  {
    name: "Dubai Frame",
    logo: "/landing/tower-logos/dubai-frame.png",
    logoAlt: "Dubai Frame",
    logoKey: "dubai-frame",
  },
  {
    name: "ICD Brookfield Place",
    logo: "/landing/tower-logos/icd-brookfield-place.svg",
    logoAlt: "ICD Brookfield Place",
    logoKey: "icd-brookfield",
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
        <a className="landing-brand" href="/" aria-label="Repeat AI home">
          <img
            src="/brand/repeat-ai-logo.png"
            alt="Repeat AI"
            className="landing-brand-logo"
            width="140"
            height="25"
          />
        </a>
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
        <figure className="landing-hero-visual">
          <img
            src="/landing/home.png"
            alt="Repeat AI dashboard showing follow-ups, sent messages, and watched-building price drops"
          />
        </figure>
      </section>

      <section className="landing-tower-strip" aria-label="Dubai towers">
        <div className="landing-tower-track">
          {DUBAI_TOWERS.map((tower) => (
            <div className="landing-tower" key={tower.name} aria-label={tower.name} title={tower.name}>
              <span className={`landing-tower-logo landing-tower-logo--${tower.logoKey}`}>
                <img src={tower.logo} alt={tower.logoAlt} loading="lazy" />
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="landing-features" id="features">
        {PRODUCT_SECTIONS.map((section, index) => (
          <article
            className={`landing-feature-row ${index % 2 === 1 ? "is-reversed" : ""}`}
            key={section.id}
          >
            <div className="landing-feature-copy">
              <h2>{section.title}</h2>
              <p>{section.description}</p>
            </div>
            <figure className={`landing-feature-visual landing-feature-visual--${section.id}`}>
              {section.image ? (
                <img src={section.image} alt={section.imageAlt} loading="lazy" />
              ) : (
                <div className="landing-feature-placeholder" aria-label={section.placeholder}>
                  <span>{section.placeholder}</span>
                </div>
              )}
            </figure>
          </article>
        ))}
      </section>

      <section className="landing-pricing" id="pricing">
        <div className="landing-pricing-header">
          <h2 className="landing-pricing-title">Simple pricing.</h2>
          <p className="landing-pricing-sub">
            One monthly plan for full Repeat AI access.
          </p>
        </div>

        <div className="landing-pricing-grid landing-pricing-grid--single">
          <article className="landing-plan landing-plan-featured">
            <div className="landing-plan-label">Professional</div>
            <div className="landing-plan-price">
              <span className="landing-plan-amount">EUR 50</span>
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
          <h2 className="landing-faq-title">Repeat AI FAQs</h2>
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
        <img
          className="landing-final-skyline"
          src="/landing/dubai-skyline-transparent.png"
          alt=""
          aria-hidden="true"
        />
        <div className="landing-final-cta-content">
          <h2>Built for brokers who want a cleaner workflow.</h2>
          <p>Manage sellers, listings, and spreadsheets from one focused workspace.</p>
          <button type="button" className="landing-cta" onClick={heroCtaAction}>
            {heroCtaLabel}
          </button>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="landing-footer-row">
          <a className="landing-brand" href="/" aria-label="Repeat AI home">
            <img
              src="/brand/repeat-ai-logo.png"
              alt="Repeat AI"
              className="landing-brand-logo"
              width="140"
              height="25"
            />
          </a>
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
