import { useState } from "react";
import { supabase } from "./supabase";
import OnboardingFrame from "./OnboardingFrame";

// How Repeat works, in the order a new account sets it up. Laid out after
// Airbnb's "It's easy to get started" (Mobbin 19c2044f): numbered steps,
// a title and one line each, divided rows.
const STEPS = [
  {
    title: "Bring in your sellers",
    text: "Import a spreadsheet from Excel or Google Sheets. Repeat matches each seller to their building.",
  },
  {
    title: "Connect your WhatsApp",
    text: "Link your number once, like WhatsApp Web. Messages go out from you, not a bot.",
  },
  {
    title: "Repeat follows up for you",
    text: "When something sells in a seller's building, they get the update. Up to 40 a day, and every reply shows in Activity.",
  },
];

export default function HowItWorksScreen({ onContinue }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function handleContinue() {
    setSaving(true);
    setError(null);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ data: { how_it_works_seen: true } });
      if (updateError) throw updateError;
      onContinue?.();
    } catch (failure) {
      setError(failure?.message || "Could not save. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <OnboardingFrame step="how">
      <div className="auth-form-container how-container">
        <div className="auth-heading-group">
          <p className="onboarding-eyebrow">How Repeat works</p>
          <h1 className="auth-heading">Every seller followed up, without the busywork.</h1>
        </div>

        <ol className="how-steps">
          {STEPS.map((step, index) => (
            <li key={step.title} className="how-step">
              <span className="how-step-number" aria-hidden="true">{index + 1}</span>
              <div className="how-step-body">
                <h2>{step.title}</h2>
                <p>{step.text}</p>
              </div>
            </li>
          ))}
        </ol>

        {error && <div className="auth-error">{error}</div>}

        <div className="onboarding-actions">
          <button type="button" className="auth-submit" onClick={handleContinue} disabled={saving}>
            {saving ? "Saving..." : "Continue →"}
          </button>
        </div>
      </div>
    </OnboardingFrame>
  );
}
