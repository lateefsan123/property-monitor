import { useState } from "react";
import { IconBrandChrome, IconDownload, IconLock, IconFileSpreadsheet, IconFiles, IconBuildingEstate } from "@tabler/icons-react";
import "./styles/export-landing.css";

// Sales page for the seller export extension (getrepeatai.com and /export).
// Hero follows Aboard's extension page (Mobbin f2b2832d), the steps follow
// folk's extension section (Mobbin 55ff2354).
const STEPS = [
  { id: "open", title: "Open your seller list", body: "Use your CRM as normal. Any filters you set stay in place.", image: "/export/step-crm.webp" },
  { id: "find", title: "Press Find my sellers", body: "It reads every page for you, even when the CRM only shows 100 at a time.", image: "/export/step-scan.webp" },
  { id: "pick", title: "Pick your buildings", body: "Your sellers are sorted by building. Untick the ones you don't need.", image: "/export/step-list.webp" },
  { id: "download", title: "Download the spreadsheets", body: "One Excel file per building, ready to upload to Repeat AI.", image: "/export/step-files.webp" },
];

const POINTS = [
  { icon: IconFiles, title: "Every page, one click", body: "Hundreds of pages of sellers without copying a row by hand." },
  { icon: IconBuildingEstate, title: "Sorted by building", body: "One spreadsheet per building, so each list is ready to work." },
  { icon: IconFileSpreadsheet, title: "Works with your CRM", body: "If your sellers are in a table in Chrome, it can read them." },
  { icon: IconLock, title: "Stays on your computer", body: "Your list is read and saved in your browser. Nothing is uploaded." },
];

export default function ExportLandingPage({ isAuthenticated = false, onGetExtension, onSignIn }) {
  const [step, setStep] = useState(STEPS[0].id);
  const active = STEPS.find((item) => item.id === step) || STEPS[0];
  const cta = (
    <button type="button" className="xl-cta" onClick={onGetExtension}>
      <IconDownload size={20} stroke={2.2} aria-hidden="true" />
      <span>Get the extension</span>
    </button>
  );

  return (
    <div className="xl">
      <header className="xl-nav-wrap">
        <nav className="xl-nav" aria-label="Main">
          <a className="xl-logo" href="https://repeatai.org" aria-label="Repeat AI">
            <img src="/logo.png" alt="" width="28" height="28" />
            <span>Repeat AI</span>
          </a>
          <div className="xl-nav-links">
            <a href="#how">How it works</a>
            <a href="#video">Video</a>
            <a href="#pricing">Pricing</a>
          </div>
          <div className="xl-nav-actions">
            {isAuthenticated ? null : <button type="button" className="xl-login" onClick={onSignIn}>Log in</button>}
            <button type="button" className="xl-nav-cta" onClick={onGetExtension}>Try it free</button>
          </div>
        </nav>
      </header>

      <main>
        <section className="xl-hero" aria-labelledby="xl-title">
          <div className="xl-hero-text">
            <span className="xl-badge">Chrome extension</span>
            <h1 id="xl-title">Get your sellers out of any CRM</h1>
          </div>
          <div className="xl-hero-action">
            {cta}
            <p><IconBrandChrome size={18} stroke={1.8} aria-hidden="true" /> For Chrome. Free for 7 days.</p>
          </div>
        </section>

        <div className="xl-stage">
          <img src="/export/hero.webp" alt="The Repeat AI extension open over a CRM seller list, showing 144 sellers in 3 buildings" width="1600" height="900" />
        </div>

        <section className="xl-how" id="how" aria-labelledby="xl-how-title">
          <h2 id="xl-how-title">Your whole seller list in one click</h2>
          <p className="xl-lead">Open your list, press one button, and get a spreadsheet for every building.</p>
          <div className="xl-how-body">
            <div className="xl-steps" role="tablist" aria-label="How it works">
              {STEPS.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  id={`xl-tab-${item.id}`}
                  aria-selected={item.id === active.id}
                  aria-controls="xl-step-panel"
                  className={`xl-step${item.id === active.id ? " is-active" : ""}`}
                  onClick={() => setStep(item.id)}
                >
                  <span className="xl-step-num">{index + 1}</span>
                  <span className="xl-step-text">
                    <strong>{item.title}</strong>
                    {item.id === active.id ? <span>{item.body}</span> : null}
                  </span>
                </button>
              ))}
            </div>
            <div className="xl-shot" id="xl-step-panel" role="tabpanel" aria-labelledby={`xl-tab-${active.id}`}>
              <img key={active.id} src={active.image} alt={active.title} width="1600" height="900" />
            </div>
          </div>
        </section>

        <section className="xl-video" id="video" aria-labelledby="xl-video-title">
          <h2 id="xl-video-title">See it work in a minute</h2>
          <video controls preload="metadata" poster="/export/video-poster.webp" src="/video/seller-export-how-to.mp4" />
        </section>

        <section className="xl-points" aria-label="Why brokers use it">
          {POINTS.map((point) => (
            <div key={point.title} className="xl-point">
              <point.icon size={26} stroke={1.7} aria-hidden="true" />
              <h3>{point.title}</h3>
              <p>{point.body}</p>
            </div>
          ))}
        </section>

        <section className="xl-pricing" id="pricing" aria-labelledby="xl-pricing-title">
          <h2 id="xl-pricing-title">Included with Repeat AI</h2>
          <div className="xl-plan">
            <p className="xl-plan-name">Repeat AI Pro</p>
            <p className="xl-plan-price"><strong>€25</strong> / month</p>
            <p className="xl-plan-trial">First 7 days free. Cancel any time.</p>
            <ul>
              <li>The seller export extension</li>
              <li>Upload your spreadsheets and see who to call each day</li>
              <li>Recent sales in your sellers' buildings</li>
            </ul>
            {cta}
          </div>
        </section>
      </main>

      <footer className="xl-footer">
        <span>© {new Date().getFullYear()} Repeat AI</span>
        <nav aria-label="Footer">
          <a href="https://repeatai.org">repeatai.org</a>
          <a href="https://repeatai.org/privacy">Privacy</a>
          <a href="https://repeatai.org/terms">Terms</a>
          <a href="https://repeatai.org/support">Support</a>
        </nav>
      </footer>
    </div>
  );
}
