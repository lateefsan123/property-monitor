import { useState } from "react";
import { supabase } from "./supabase";
import { IconBrandLinkedin, IconCalendarEvent, IconDots, IconRobot, IconSearch, IconShare, IconUsers } from "@tabler/icons-react";
import OnboardingFrame, { FoxSays } from "./OnboardingFrame";

// Brilliant's answer rows: an icon, the label, full width.
const OPTIONS = [
  { id: "search", label: "Search engine", Icon: IconSearch },
  { id: "ai", label: "AI tools", Icon: IconRobot },
  { id: "linkedin", label: "LinkedIn", Icon: IconBrandLinkedin },
  { id: "colleague", label: "Friend or colleague", Icon: IconUsers },
  { id: "social", label: "Social media", Icon: IconShare },
  { id: "community", label: "Event or community", Icon: IconCalendarEvent },
  { id: "other", label: "Other", Icon: IconDots },
];

export default function HowDidYouHearScreen({ onContinue, onBack }) {
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function persist(referralSource) {
    setSaving(true);
    setError(null);
    const { error: updateError } = await supabase.auth.updateUser({
      data: {
        referral_source: referralSource || null,
        referral_asked: true,
      },
    });
    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    onContinue?.(referralSource || null);
  }

  function handleSelect(id) {
    if (saving) return;
    setSelected(id);
  }

  function handleSkip() {
    if (saving) return;
    void persist(null);
  }

  return (
    <OnboardingFrame step="referral" stepNumber={6} onBack={onBack} backDisabled={saving}>
      <FoxSays>How did you hear about Repeat?</FoxSays>

      <fieldset className="referral-options" disabled={saving}>
        <legend className="referral-legend">How did you hear about Repeat?</legend>
        {OPTIONS.map((option) => {
          const isSelected = selected === option.id;
          const Icon = option.Icon;
          return (
            <button
              key={option.id}
              type="button"
              className={`referral-option${isSelected ? " is-selected" : ""}`}
              onClick={() => handleSelect(option.id)}
              aria-pressed={isSelected}
            >
              <Icon size={22} stroke={1.7} aria-hidden="true" />
              <span className="referral-option-label">{option.label}</span>
            </button>
          );
        })}
      </fieldset>

      {error && <div className="auth-error">{error}</div>}

      <div className="onb-cta">
        <button type="button" className="auth-submit" onClick={() => persist(selected)} disabled={saving || !selected}>
          {saving && selected ? "Saving..." : "Continue"}
        </button>
        <button
          type="button"
          className="referral-skip onb-skip"
          onClick={handleSkip}
          disabled={saving}
        >
          {saving && selected === null ? "Skipping..." : "Skip"}
        </button>
      </div>
    </OnboardingFrame>
  );
}
