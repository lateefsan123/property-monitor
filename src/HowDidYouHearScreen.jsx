import { useState } from "react";
import { supabase } from "./supabase";
import OnboardingFrame from "./OnboardingFrame";

const OPTIONS = [
  { id: "search", label: "Search engine" },
  { id: "ai", label: "AI tools" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "colleague", label: "Friend or colleague" },
  { id: "social", label: "Social media" },
  { id: "community", label: "Event or community" },
  { id: "other", label: "Other" },
];

export default function HowDidYouHearScreen({ onContinue }) {
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
    <OnboardingFrame step="referral">
        <div className="auth-form-container referral-container">
          <div className="auth-heading-group">
            <h1 className="auth-heading">How did you hear about us?</h1>
          </div>

          {error && <div className="auth-error">{error}</div>}

          <fieldset className="referral-options" disabled={saving}>
            <legend className="referral-legend">How did you hear about us?</legend>
            {OPTIONS.map((option) => {
              const isSelected = selected === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  className={`referral-option${isSelected ? " is-selected" : ""}`}
                  onClick={() => handleSelect(option.id)}
                  aria-pressed={isSelected}
                >
                  <span className="referral-option-label">{option.label}</span>
                </button>
              );
            })}
          </fieldset>

          <div className="onboarding-actions">
          <button
            type="button"
            className="referral-skip onboarding-secondary"
            onClick={handleSkip}
            disabled={saving}
          >
            {saving && selected === null ? "Skipping..." : "Skip"}
          </button>
          <button type="button" className="auth-submit" onClick={() => persist(selected)} disabled={saving || !selected}>
            {saving && selected ? "Saving..." : "Continue →"}
          </button>
          </div>
        </div>
    </OnboardingFrame>
  );
}
