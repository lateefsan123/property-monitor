import { useEffect, useState } from "react";
import LandingClosing from "./LandingClosing";
import "./styles/landing.css";
import "./styles/landing-overview.css";
import "./styles/landing-product-story.css";
import "./styles/landing-dark.css";
import "./styles/export-landing.css";

// Sales page for the seller export extension (getrepeatai.com and /export).
// Built from the main landing's own header, hero, product-story sections and
// closing, so both pages look like one site. Shots come from the how-to film.
const STEPS = [
  {
    id: "export-open",
    title: "Open your seller list.",
    description: "Use your CRM as normal. Any filters you set stay in place.",
    image: "/export/step-crm.webp",
    alt: "A CRM seller list with building, unit, rooms, size and name columns, and the Repeat AI icon in the browser toolbar.",
    color: "#dcecf7",
  },
  {
    id: "export-find",
    title: "Every page, one click.",
    description: "Press Find my sellers. It reads every page for you, even when the CRM only shows 100 at a time.",
    image: "/export/step-scan.webp",
    alt: "The Repeat AI extension finding sellers while it moves through the CRM's pages.",
    color: "#f7dfd1",
  },
  {
    id: "export-pick",
    title: "Sorted by building.",
    description: "Your sellers are grouped by building. Untick the ones you don't need.",
    image: "/export/step-list.webp",
    alt: "144 sellers in 3 buildings, with one building unticked.",
    color: "#e6dff4",
  },
  {
    id: "export-download",
    title: "One spreadsheet per building.",
    description: "Download them and upload to Repeat AI. Your list is read in your browser and never leaves your computer.",
    image: "/export/step-files.webp",
    alt: "Chrome's downloads panel with one Excel file for each chosen building.",
    color: "#dde9d4",
  },
];

export default function ExportLandingPage({ isAuthenticated = false, onGetExtension, onSignIn, onSignOut }) {
  const [headerScrolled, setHeaderScrolled] = useState(false);
  useEffect(() => {
    const update = () => setHeaderScrolled(window.scrollY > 8);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);
  const accountAction = isAuthenticated ? onSignOut : onSignIn;
  const accountActionLabel = isAuthenticated ? "Sign out" : "Log in";

  return (
    <div className="landing landing-dark xl">
      <div className={`landing-header-frame${headerScrolled ? " is-scrolled" : ""}`}>
        <header className="landing-header">
          <a className="landing-brand" href="https://repeatai.org" aria-label="Repeat AI home">
            <img src="/brand/repeat-ai-logo.png" alt="Repeat AI" className="landing-brand-logo" width="140" height="25" />
          </a>
          <nav className="landing-nav" aria-label="Account">
            <a className="landing-nav-link" href="#export-how" aria-current="page">Extension</a>
            <a className="landing-nav-link" href="https://repeatai.org/pricing">Pricing</a>
            {accountAction ? <button type="button" className="landing-nav-link" onClick={accountAction}>{accountActionLabel}</button> : null}
          </nav>
        </header>
      </div>

      <section className="landing-hero" aria-labelledby="xl-headline">
        <div className="landing-hero-copy">
          <h1 className="landing-headline" id="xl-headline">
            Get your sellers out of <em>any</em> CRM.
          </h1>
          <p className="landing-sub">
            A Chrome extension for Repeat AI. Open your seller list, press one button,{" "}
            <br className="landing-hero-break" />
            and get a spreadsheet for every building.
          </p>
          <div className="landing-hero-actions">
            <button type="button" className="landing-cta landing-cta-lg" onClick={onGetExtension}>Get the extension</button>
            <p className="landing-hero-note">Part of Repeat AI Pro</p>
          </div>
        </div>
        <figure className="landing-product-artwork xl-art xl-hero-art" style={{ "--product-artwork-background": "#f3f0ea" }}>
          <img src="/export/hero.webp" alt="The Repeat AI extension open over a CRM seller list, showing 144 sellers in 3 buildings." width="1600" height="900" fetchPriority="high" />
        </figure>
      </section>

      <section className="landing-product-story" id="export-how" aria-labelledby="export-how-heading">
        <div className="landing-product-story-inner">
          <h2 id="export-how-heading">How it works.</h2>
          <p>Four steps, and the extension does the paging for you.</p>
          <ol className="xl-steps">
            {STEPS.map((step, index) => (
              <li key={step.id} id={step.id}>
                <figure className="landing-product-artwork xl-art" style={{ "--product-artwork-background": step.color }}>
                  <img src={step.image} alt={step.alt} width="1600" height="900" loading="lazy" decoding="async" />
                </figure>
                <h3><span>{index + 1}</span>{step.title}</h3>
                <p>{step.description}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="landing-product-story" id="export-video" aria-labelledby="export-video-heading">
        <div className="landing-product-story-inner">
          <h2 id="export-video-heading">See it work in a minute.</h2>
          <p>From installing the extension to uploading your spreadsheets.</p>
          <figure className="landing-product-artwork xl-video">
            <video controls preload="metadata" poster="/export/video-poster.webp" src="/video/seller-export-how-to.mp4" />
          </figure>
        </div>
      </section>

      <LandingClosing
        homePrefix="https://repeatai.org/"
        isAuthenticated={false}
        onGetStarted={onGetExtension}
        onSubscribe={onGetExtension}
        accountAction={accountAction}
        accountActionLabel={accountActionLabel}
      />
    </div>
  );
}
