import { useState } from "react";
import { supabase } from "./supabase";
import { IconBell, IconCheck, IconPlayerPlayFilled } from "@tabler/icons-react";
import OnboardingFrame from "./OnboardingFrame";

// What the trial unlocks, most valuable first.
const INCLUDED = [
  "Up to 40 automated WhatsApp messages a day",
  "Seller workspace with Excel and Google Sheets imports",
  "Listing alerts and price-drop tracking",
  "Web, desktop and mobile apps",
];

// How the 7 days go, after Brilliant's "How your Premium free trial works"
// (Mobbin ce796c95): the step just finished, then today and the trial end.
const TIMELINE = [
  { id: "setup", Icon: IconCheck, title: "Set up your account", text: "You've seen how Repeat works and set up your profile.", done: true },
  { id: "today", Icon: IconPlayerPlayFilled, title: "Today: Full access", text: "Import your sellers, connect WhatsApp and let Repeat follow up." },
  { id: "week", Icon: IconBell, title: "This week: First replies", text: "Sale updates go out and seller replies land in Activity." },
  { id: "end", Icon: IconCheck, title: "Day 7: Trial ends", text: "EUR 35/month starts. Cancel anytime before in Settings." },
];

export default function TrialOfferScreen({ onStartTrial, onSkip, onBack, checkoutPending = false }) {
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
    <OnboardingFrame step="trial" stepNumber={7} onBack={onBack} backDisabled={checkoutPending || skipping}>
      <h1 className="onb-title">How your free trial works</h1>

      <ol className="trial-timeline" aria-label="How your free trial works">
        {TIMELINE.map((point, index) => {
          const Icon = point.Icon;
          return (
            <li key={point.id} className={`trial-timeline-point${point.done ? " is-done" : ""}${index === 1 ? " is-now" : ""}`}>
              <span className="trial-timeline-dot" aria-hidden="true"><Icon size={16} stroke={2.4} /></span>
              <strong>{point.title}</strong>
              <span>{point.text}</span>
            </li>
          );
        })}
      </ol>

      <p className="trial-price">Free for 7 days, then EUR 35/month. Cancel anytime.</p>

      {error && <div className="auth-error">{error}</div>}

      <div className="onb-cta">
        <button
          type="button"
          className="auth-submit"
          onClick={handleStart}
          disabled={checkoutPending || skipping}
        >
          {checkoutPending ? "Starting..." : "Start your 7-day free trial"}
        </button>
        <button
          type="button"
          className="trial-skip onb-skip"
          onClick={handleSkip}
          disabled={checkoutPending || skipping}
        >
          {skipping ? "Skipping..." : "Skip for now"}
        </button>
      </div>

      <ul className="trial-features" aria-label="Included in your trial">
        {INCLUDED.map((item) => <li key={item} className="trial-feature">{item}</li>)}
      </ul>
    </OnboardingFrame>
  );
}
