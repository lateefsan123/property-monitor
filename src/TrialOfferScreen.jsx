import { useState } from "react";
import { supabase } from "./supabase";
import OnboardingFrame from "./OnboardingFrame";

// What the trial unlocks, most valuable first.
const INCLUDED = [
  "Up to 40 automated WhatsApp messages a day",
  "Seller workspace with Excel and Google Sheets imports",
  "Listing alerts and price-drop tracking",
  "Web, desktop and mobile apps",
];

// How the 7 days go, after Brilliant's "How your free trial works" (Mobbin 47c242d9).
const TIMELINE = [
  { when: "Today", text: "Import your sellers and connect WhatsApp." },
  { when: "This week", text: "Repeat sends sale updates and tracks price drops." },
  { when: "Day 7", text: "EUR 35/month starts. Cancel before then in Settings." },
];

export default function TrialOfferScreen({ onStartTrial, onSkip, checkoutPending = false }) {
  const [skipping, setSkipping] = useState(false);
  const [error, setError] = useState(null);

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
    <OnboardingFrame step="trial">
        <div className="auth-form-container trial-container">
          <div className="auth-heading-group">
            <h1 className="auth-heading">Try Repeat AI free for 7 days</h1>
          </div>

          <p className="trial-subtitle">Everything included. You won&rsquo;t be charged until day 7.</p>

          <ol className="trial-timeline" aria-label="How your free trial works">
            {TIMELINE.map((point, index) => (
              <li key={point.when} className={`trial-timeline-point${index === 0 ? " is-now" : ""}`}>
                <span className="trial-timeline-dot" aria-hidden="true" />
                <strong>{point.when}</strong>
                <span>{point.text}</span>
              </li>
            ))}
          </ol>

          <ul className="trial-features" aria-label="Included">
            {INCLUDED.map((item) => <li key={item} className="trial-feature">{item}</li>)}
          </ul>

          {error && <div className="auth-error">{error}</div>}

          <div className="onboarding-actions">
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
            className="trial-skip onboarding-secondary"
            onClick={handleSkip}
            disabled={checkoutPending || skipping}
          >
            {skipping ? "Skipping..." : "Skip"}
          </button>
          </div>
        </div>
    </OnboardingFrame>
  );
}
