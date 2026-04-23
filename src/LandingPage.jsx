import { useEffect, useState } from "react";
import "./styles/landing.css";

const HERO_IMAGES = [
  "landing/new_seller_lead.png",
  "landing/market_update_prices_up.png",
  "landing/appraisal_scheduled.png",
  "landing/recent_sale.png",
];

const HERO_ROTATE_MS = 4500;

const FAQS = [
  {
    q: "What is Seller Signal, and how does it work?",
    a: "Seller Signal is a focused workspace for Dubai real estate brokers to track sellers, monitor building activity, and run follow-ups. You import or add your sellers, we keep their pipeline and the buildings you watch in one place — no more juggling spreadsheets.",
  },
  {
    q: "Can I try it before paying?",
    a: "Yes. The Beta plan is free and lets you import one spreadsheet and track one building. Upgrade to Professional (€20/month) only when you need more.",
  },
  {
    q: "How does importing spreadsheets work?",
    a: "Drop your existing Google Sheet or Excel file in and we'll map columns to seller fields. Your data lives in Seller Signal after import — Sheets stays as your export if you need it.",
  },
  {
    q: "What happens if I cancel?",
    a: "Your data stays accessible on the Beta tier. You keep access to the single spreadsheet and building limits and can export anything out at any time.",
  },
  {
    q: "Is there a mobile app?",
    a: "Yes — the mobile app is included with Professional. It's designed for the parts of the job that happen away from your desk: checking listing alerts, logging calls, pulling up a seller on the way to a viewing.",
  },
  {
    q: "How is this different from a CRM?",
    a: "A generic CRM tries to fit any business. Seller Signal is built around how Dubai brokers actually work — towers, seller statuses, listing portals. You get less to configure and more that just fits.",
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
      "Stopped juggling a dozen spreadsheets. My pipeline actually makes sense now — first real estate tool I've opened twice in a week.",
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
    title: "Worth the €20, easily",
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

export default function LandingPage({ onSignIn, onGetStarted }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [openFaq, setOpenFaq] = useState(null);

  useEffect(() => {
    const id = window.setInterval(() => {
      setActiveIndex((i) => (i + 1) % HERO_IMAGES.length);
    }, HERO_ROTATE_MS);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="landing">
      <header className="landing-header">
        <div className="landing-brand">Seller Signal</div>
        <nav className="landing-nav">
          <a href="#features">Product</a>
          <a href="#pricing">Pricing</a>
          <button type="button" className="landing-nav-link" onClick={onSignIn}>
            Sign in
          </button>
          <button type="button" className="landing-cta landing-cta-sm" onClick={onGetStarted}>
            Get started
          </button>
        </nav>
      </header>

      <section className="landing-hero">
        <div className="landing-hero-copy">
          <span className="landing-eyebrow-label">For Dubai brokers</span>
          <h1 className="landing-headline">Seller follow-up, done properly.</h1>
          <p className="landing-sub">
            Track sellers, monitor listings, and manage spreadsheets from one calm
            workspace.
          </p>
          <div className="landing-hero-actions">
            <button type="button" className="landing-cta" onClick={onGetStarted}>
              Get started
            </button>
            <a href="#features" className="landing-cta-ghost">
              See how it works
            </a>
          </div>

          <p className="landing-trust">Built for Dubai real estate professionals.</p>
        </div>

        <div className="landing-hero-art" aria-hidden="true">
          <div className="landing-hero-glow" />
          <div className="landing-hero-stack">
            {HERO_IMAGES.map((src, index) => (
              <img
                key={src}
                src={`${import.meta.env.BASE_URL}${src}`}
                alt=""
                className={`landing-hero-image ${index === activeIndex ? "is-active" : ""}`}
              />
            ))}
          </div>
        </div>

        <div className="landing-store-badges">
          <a href="#download" className="landing-badge" aria-label="Download on the App Store">
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"/>
            </svg>
            <span className="landing-badge-text">
              <span className="landing-badge-top">Download on the</span>
              <span className="landing-badge-main">App Store</span>
            </span>
          </a>

          <a href="#download" className="landing-badge" aria-label="Get it on Google Play">
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M22.018 13.298l-3.919 2.218-3.515-3.493 3.543-3.521 3.891 2.202a1.49 1.49 0 0 1 0 2.594zM1.337.924a1.486 1.486 0 0 0-.112.568v21.017c0 .217.045.419.124.6l11.155-11.087L1.337.924zm12.207 10.065l3.258-3.238L3.45.195a1.466 1.466 0 0 0-.946-.179l11.04 10.973zm0 2.067l-11 10.933c.298.036.612-.016.906-.183l13.324-7.54-3.23-3.21z"/>
            </svg>
            <span className="landing-badge-text">
              <span className="landing-badge-top">Get it on</span>
              <span className="landing-badge-main">Google Play</span>
            </span>
          </a>
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
              Your pipeline lives in a real workspace — not 40 Google Sheets
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
            Start free during beta. Upgrade when you're ready to scale.
          </p>
        </div>

        <div className="landing-pricing-grid">
          <article className="landing-plan">
            <div className="landing-plan-label">Beta</div>
            <div className="landing-plan-price">
              <span className="landing-plan-amount">€0</span>
              <span className="landing-plan-unit">free while in beta</span>
            </div>
            <p className="landing-plan-desc">
              Try Seller Signal with a single pipeline and one building to watch.
            </p>

            <ul className="landing-plan-features">
              <li>Import 1 spreadsheet</li>
              <li>Track 1 building</li>
              <li>Seller pipeline &amp; follow-ups</li>
              <li>Listing activity feed</li>
            </ul>

            <button type="button" className="landing-plan-cta" onClick={onGetStarted}>
              Get started
            </button>
          </article>

          <article className="landing-plan landing-plan-featured">
            <div className="landing-plan-label">Professional</div>
            <div className="landing-plan-price">
              <span className="landing-plan-amount">€20</span>
              <span className="landing-plan-unit">/ month</span>
            </div>
            <p className="landing-plan-desc">
              Everything you need to run seller follow-up at full scale.
            </p>

            <ul className="landing-plan-features">
              <li className="landing-plan-carry">Everything in Beta</li>
              <li>Up to 4 spreadsheets included</li>
              <li>Track up to 5 buildings</li>
              <li>Price drop alerts</li>
              <li>Mobile app access</li>
              <li>All future features included</li>
            </ul>

            <div className="landing-plan-addon">
              <span>+ €5</span>
              <p>per additional spreadsheet beyond 4</p>
            </div>

            <button type="button" className="landing-plan-cta landing-plan-cta-primary" onClick={onGetStarted}>
              Get started
            </button>
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
        <button type="button" className="landing-cta" onClick={onGetStarted}>
          Get started
        </button>
      </section>

      <footer className="landing-footer">
        <div className="landing-footer-row">
          <div className="landing-brand">Seller Signal</div>
          <nav className="landing-footer-nav">
            <a href="#features">Product</a>
            <a href="#pricing">Pricing</a>
            <button type="button" className="landing-nav-link" onClick={onSignIn}>
              Sign in
            </button>
            <a href="#privacy">Privacy</a>
            <a href="#terms">Terms</a>
          </nav>
        </div>
        <p className="landing-footer-tag">seller follow-up, reimagined</p>
      </footer>
    </div>
  );
}
