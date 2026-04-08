import { useState } from "react";

const ONBOARDING_SLIDES = [
  {
    key: "welcome",
    title: "Your Dubai owner CRM",
    body: "Seller Signal helps you track confirmed property owners, organize them by readiness to sell, and send recurring market updates that keep you top of mind.",
  },
  {
    key: "how-it-works",
    title: "One system for every owner",
    body: "Every owner receives market updates. The categories simply show how close they are to selling, so you know how to follow up and how urgently to act.",
    labels: ["Prospects", "Market Appraisals", "For Sale Available"],
  },
  {
    key: "prospects",
    title: "Prospects",
    body: "Confirmed owners who are not looking to sell yet.",
    support: "These are long-term nurture contacts. You stay relevant with recurring building and unit-specific market updates until timing changes.",
    goal: "Goal: turn passive owners into future sellers.",
  },
  {
    key: "market-appraisals",
    title: "Market Appraisals",
    body: "Owners who are likely to come to market soon.",
    support: "They are warmer than prospects and need stronger pricing context, sharper market updates, and closer follow-up.",
    goal: "Goal: position yourself before they fully decide to sell.",
  },
  {
    key: "for-sale",
    title: "For Sale Available",
    body: "Owners actively looking to sell.",
    support: "This is the hottest category. They still receive updates, but speed matters more because the focus is now conversion.",
    goal: "Goal: win the listing.",
  },
  {
    key: "what-you-send",
    title: "Market updates built for each owner",
    body: "Seller Signal helps you send a relevant market report for the owner's unit or building.",
    bullets: [
      "Recent building transactions",
      "Price movement",
      "Market context",
      "A WhatsApp-ready update",
    ],
    support: "This is how you stay consistent and become the area specialist they trust.",
  },
  {
    key: "data-lives",
    title: "Built around your current workflow",
    body: "Your owner numbers already live in WhatsApp and your spreadsheet. When you get a new owner, you save them in both places. Seller Signal works on top of that system.",
  },
  {
    key: "import-sheet",
    title: "Import your owners",
    body: "Paste your Google Sheet and Seller Signal will organize your owners by category and prepare them for follow-up.",
    fields: ["name", "phone", "building", "unit", "status", "last contact", "notes"],
  },
  {
    key: "daily-workflow",
    title: "How you use it every day",
    body: "Review owners by category, open their record, check the market update, send the WhatsApp message, and keep nurturing until they are ready to sell.",
    steps: [
      "Check category",
      "Review market update",
      "Send follow-up",
      "Mark progress",
    ],
  },
  {
    key: "reports",
    title: "Stay consistent with follow-up",
    body: "Everyone gets updates. The category changes the urgency.",
    settings: [
      { label: "Prospects", desc: "Recurring nurture" },
      { label: "Market Appraisals", desc: "Closer follow-up" },
      { label: "For Sale Available", desc: "Fastest action" },
    ],
  },
];

const CATEGORY_COLORS = [
  { accent: "#334155", background: "rgba(15, 23, 42, 0.08)" },
  { accent: "#c2410c", background: "rgba(194, 65, 12, 0.10)" },
  { accent: "#b91c1c", background: "rgba(185, 28, 28, 0.10)" },
];

function SlideIcon({ slideKey }) {
  switch (slideKey) {
    case "welcome":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
          <path d="M9 22V12h6v10" />
        </svg>
      );
    case "how-it-works":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 20V10M18 20V4M6 20v-4" />
        </svg>
      );
    case "prospects":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
        </svg>
      );
    case "market-appraisals":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </svg>
      );
    case "for-sale":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
        </svg>
      );
    case "what-you-send":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
          <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
        </svg>
      );
    case "data-lives":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
          <path d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12" />
        </svg>
      );
    case "import-sheet":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
        </svg>
      );
    case "daily-workflow":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
      );
    case "reports":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />
        </svg>
      );
    default:
      return null;
  }
}

function CategoryLabel({ index, text }) {
  const colors = CATEGORY_COLORS[index] || CATEGORY_COLORS[0];

  return (
    <div
      className="onboarding-category-label"
      style={{ backgroundColor: colors.background, borderColor: colors.accent }}
    >
      <span className="onboarding-category-dot" style={{ backgroundColor: colors.accent }} />
      <span style={{ color: colors.accent }}>{text}</span>
    </div>
  );
}

export default function OnboardingScreen({ onComplete }) {
  const [step, setStep] = useState(0);
  const slide = ONBOARDING_SLIDES[step];
  const isFirst = step === 0;
  const isLast = step === ONBOARDING_SLIDES.length - 1;
  const logoSrc = `${import.meta.env.BASE_URL}logo.png`;

  function handleBack() {
    setStep((currentStep) => Math.max(0, currentStep - 1));
  }

  function handleNext() {
    if (isLast) {
      onComplete();
      return;
    }

    setStep((currentStep) => Math.min(ONBOARDING_SLIDES.length - 1, currentStep + 1));
  }

  return (
    <div className="onboarding-flow">
      <div className="onboarding-shell">
        <div className="onboarding-progress-row">
          {ONBOARDING_SLIDES.map((item, index) => (
            <span
              key={item.key}
              className={`onboarding-progress-dash${index <= step ? " active" : ""}`}
            />
          ))}
        </div>

        <div className="onboarding-layout">
          <aside className="onboarding-rail">
            <img alt="Seller Signal" className="onboarding-rail-logo" src={logoSrc} />
            <p className="onboarding-rail-kicker">Seller Signal</p>
            <h1>Learn the workflow before you import a single owner.</h1>
            <p className="onboarding-rail-copy">
              This walkthrough shows how the app organizes owners, what gets sent,
              and how the spreadsheet import fits into your daily follow-up.
            </p>

            <div className="onboarding-rail-meta">
              <div>
                <span className="onboarding-rail-meta-label">Step</span>
                <strong>{step + 1} / {ONBOARDING_SLIDES.length}</strong>
              </div>
              <div>
                <span className="onboarding-rail-meta-label">Outcome</span>
                <strong>Ready for the paywall gate</strong>
              </div>
            </div>
          </aside>

          <section className="onboarding-panel">
            <div className="onboarding-panel-icon">
              <SlideIcon slideKey={slide.key} />
            </div>

            <div className="onboarding-panel-copy">
              <p className="onboarding-panel-step">Onboarding</p>
              <h2>{slide.title}</h2>
              <p className="onboarding-panel-body">{slide.body}</p>
            </div>

            {slide.labels && (
              <div className="onboarding-category-row">
                {slide.labels.map((label, index) => (
                  <CategoryLabel index={index} key={label} text={label} />
                ))}
              </div>
            )}

            {slide.support && (
              <div className="onboarding-support-box">
                <p>{slide.support}</p>
              </div>
            )}

            {slide.goal && (
              <div className="onboarding-goal-row">
                <span className="onboarding-goal-check">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                    <path d="M22 4L12 14.01l-3-3" />
                  </svg>
                </span>
                <span>{slide.goal}</span>
              </div>
            )}

            {slide.bullets && (
              <div className="onboarding-bullet-list">
                {slide.bullets.map((bullet) => (
                  <div className="onboarding-bullet-row" key={bullet}>
                    <span className="onboarding-bullet-dot" />
                    <span>{bullet}</span>
                  </div>
                ))}
              </div>
            )}

            {slide.fields && (
              <div className="onboarding-field-grid">
                {slide.fields.map((field) => (
                  <span className="onboarding-field-tag" key={field}>
                    {field}
                  </span>
                ))}
              </div>
            )}

            {slide.steps && (
              <div className="onboarding-step-list">
                {slide.steps.map((item, index) => (
                  <div className="onboarding-step-list-row" key={item}>
                    <span className="onboarding-step-list-number">{index + 1}</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            )}

            {slide.settings && (
              <div className="onboarding-settings-list">
                {slide.settings.map((item) => (
                  <div className="onboarding-setting-card" key={item.label}>
                    <strong>{item.label}</strong>
                    <span>{item.desc}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="onboarding-actions">
          <button
            className="onboarding-btn-secondary"
            disabled={isFirst}
            onClick={handleBack}
            type="button"
          >
            Back
          </button>

          <button className="onboarding-btn-primary" onClick={handleNext} type="button">
            {isLast ? "Get Started" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
