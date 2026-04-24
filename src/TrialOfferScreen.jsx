import { useState } from "react";
import { supabase } from "./supabase";

const FEATURES = [
  {
    id: "pipeline",
    label: "Seller pipeline and follow-up workspace",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    id: "spreadsheets",
    label: "Spreadsheet imports and smart mapping",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <line x1="3" y1="9" x2="21" y2="9" />
        <line x1="3" y1="15" x2="21" y2="15" />
        <line x1="9" y1="3" x2="9" y2="21" />
        <line x1="15" y1="3" x2="15" y2="21" />
      </svg>
    ),
  },
  {
    id: "alerts",
    label: "Listing alerts and price-drop tracking",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M3 9.5 12 3l9 6.5V21a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1z" />
      </svg>
    ),
  },
  {
    id: "mobile",
    label: "Mobile app access",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <rect x="6" y="2" width="12" height="20" rx="2.5" />
        <line x1="11" y1="18" x2="13" y2="18" />
      </svg>
    ),
  },
  {
    id: "billing",
    label: "Cancel or change plan anytime from settings",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <line x1="2" y1="10" x2="22" y2="10" />
      </svg>
    ),
  },
  {
    id: "support",
    label: "Priority support from the Seller Signal team",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <polygon points="12 2 15 9 22 9.5 17 14 18.5 21 12 17.5 5.5 21 7 14 2 9.5 9 9 12 2" />
      </svg>
    ),
  },
];

export default function TrialOfferScreen({ onStartTrial, onSkip, checkoutPending = false }) {
  const [skipping, setSkipping] = useState(false);
  const [error, setError] = useState(null);
  const artSrc = `${import.meta.env.BASE_URL}khalifa.png`;

  async function persistOffered() {
    const { error: updateError } = await supabase.auth.updateUser({
      data: { trial_offered: true },
    });
    if (updateError) {
      setError(updateError.message);
      return false;
    }
    return true;
  }

  async function handleStart() {
    setError(null);
    const ok = await persistOffered();
    if (!ok) return;
    onStartTrial?.();
  }

  async function handleSkip() {
    setSkipping(true);
    setError(null);
    const ok = await persistOffered();
    setSkipping(false);
    if (!ok) return;
    onSkip?.();
  }

  return (
    <div className="auth-split-page">
      <div className="auth-pane auth-pane--form">
        <div className="auth-form-container trial-container">
          <div className="auth-heading-group">
            <h1 className="auth-heading">Try Seller Signal Pro for free</h1>
          </div>

          <p className="trial-subtitle">
            Get the full workspace. Free for 14 days, cancel any time.
          </p>

          <p className="trial-list-heading">Here’s what you get with Seller Signal Pro:</p>

          <ul className="trial-features">
            {FEATURES.map((feature) => (
              <li key={feature.id} className="trial-feature">
                <span className="trial-feature-icon">{feature.icon}</span>
                <span className="trial-feature-label">{feature.label}</span>
              </li>
            ))}
          </ul>

          <p className="trial-caveat">
            <strong>Cancel anytime.</strong> We’ll remind you 7 days before your trial ends.
          </p>

          {error && <div className="auth-error">{error}</div>}

          <button
            type="button"
            className="auth-submit"
            onClick={handleStart}
            disabled={checkoutPending || skipping}
          >
            {checkoutPending ? "Starting..." : "Start your free trial"}
          </button>

          <button
            type="button"
            className="trial-skip"
            onClick={handleSkip}
            disabled={checkoutPending || skipping}
          >
            {skipping ? "Skipping..." : "Skip"}
          </button>
        </div>
      </div>

      <div className="auth-pane auth-pane--art" aria-hidden="true">
        <img src={artSrc} alt="" className="auth-art-image" />
      </div>
    </div>
  );
}
