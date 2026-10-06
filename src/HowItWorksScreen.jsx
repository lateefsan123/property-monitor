import { useState } from "react";
import { supabase } from "./supabase";
import OnboardingFrame, { OnboardingInfo } from "./OnboardingFrame";

// How Repeat works, one idea per screen like Brilliant's "You'll fit right
// in": the product art on the left, a heading and short paragraph beside it.
const SLIDES = [
  {
    step: "how-sellers",
    title: "Bring in your sellers",
    text: "Import a spreadsheet from Excel or Google Sheets. Repeat matches each seller to their building and keeps your notes and follow-up dates.",
  },
  {
    step: "how-whatsapp",
    title: "Connect your WhatsApp",
    text: "Link your number once, like WhatsApp Web. Every message goes out from you, with your broker card, and replies land in Activity.",
  },
  {
    step: "how-automation",
    title: "Repeat follows up for you",
    text: "When something sells in a seller's building, Repeat sends them the update. Up to 40 automated WhatsApp messages a day, on the days you choose.",
  },
];

export default function HowItWorksScreen({ onContinue, onBack, initialIndex = 0 }) {
  const [index, setIndex] = useState(Math.min(Math.max(initialIndex, 0), SLIDES.length - 1));
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
    <OnboardingFrame
      step={slide.step}
      stepNumber={2 + index}
      onBack={index > 0 ? () => setIndex(index - 1) : onBack}
      backDisabled={saving}
    >
      <OnboardingInfo step={slide.step} title={slide.title}>
        <p>{slide.text}</p>
      </OnboardingInfo>

      {error && <div className="auth-error">{error}</div>}

      <div className="onb-cta">
        <button type="button" className="auth-submit" onClick={handleContinue} disabled={saving}>
          {saving ? "Saving..." : "Continue"}
        </button>
      </div>
    </OnboardingFrame>
  );
}
