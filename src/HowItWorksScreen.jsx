import { useState } from "react";
import { supabase } from "./supabase";
import OnboardingFrame, { onboardingArtwork } from "./OnboardingFrame";

// How Repeat works, one idea per screen like mobile onboarding's feature
// slides (mobile/src/screens/OnboardingScreen.js): segments across the top,
// a short title and line, and the product art beside it.
const SLIDES = [
  {
    step: "how-sellers",
    title: "Bring in your sellers",
    text: "Import a spreadsheet from Excel or Google Sheets. Repeat matches each seller to their building.",
  },
  {
    step: "how-whatsapp",
    title: "Connect your WhatsApp",
    text: "Link your number once, like WhatsApp Web. Every message goes out from you, not a bot.",
  },
  {
    step: "how-automation",
    title: "Repeat follows up for you",
    text: "When something sells in a seller's building, they get the update. Replies show in Activity.",
  },
];

export default function HowItWorksScreen({ onContinue }) {
  const [index, setIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const slide = SLIDES[index];
  const last = index === SLIDES.length - 1;

  async function handleContinue() {
    if (!last) {
      setIndex(index + 1);
      return;
    }
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
    <OnboardingFrame step={slide.step}>
      <div className="auth-form-container how-container">
        <div className="how-segments" role="progressbar" aria-label="How Repeat works" aria-valuemin={1} aria-valuemax={SLIDES.length} aria-valuenow={index + 1}>
          {SLIDES.map((item, position) => <span key={item.step} className={position <= index ? "is-on" : ""} />)}
        </div>

        <div key={slide.step} className="how-slide">
          <p className="onboarding-eyebrow">How Repeat works</p>
          <h1 className="auth-heading">{slide.title}</h1>
          <p className="how-lead">{slide.text}</p>

          {slide.step === "how-automation" && (
            <div className="how-stat">
              <span className="how-stat-lead">Up to</span>
              <strong>40</strong>
              <span className="how-stat-lead">automated WhatsApp messages a day</span>
            </div>
          )}

          {/* The side art is hidden on narrow screens, so show it inline there. */}
          <img className="how-inline-art" src={`/landing/${onboardingArtwork(slide.step)}`} alt="" />
        </div>

        {error && <div className="auth-error">{error}</div>}

        <div className="onboarding-actions">
          {index > 0 && (
            <button type="button" className="trial-skip onboarding-secondary" onClick={() => setIndex(index - 1)} disabled={saving}>
              Back
            </button>
          )}
          <button type="button" className="auth-submit" onClick={handleContinue} disabled={saving}>
            {saving ? "Saving..." : "Continue →"}
          </button>
        </div>
      </div>
    </OnboardingFrame>
  );
}
