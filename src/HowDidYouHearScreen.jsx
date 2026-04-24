import { useState } from "react";
import { supabase } from "./supabase";

const OPTIONS = [
  { id: "search", label: "Search engine (Google, Bing, etc.)" },
  { id: "ai", label: "AI chat (ChatGPT, Gemini, etc.)" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "colleague", label: "From a colleague or friend" },
  { id: "social", label: "Social media, YouTube, or podcasts" },
  { id: "community", label: "Real estate event or community" },
  { id: "other", label: "Other" },
];

const LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H"];

export default function HowDidYouHearScreen({ onContinue }) {
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const artSrc = `${import.meta.env.BASE_URL}khalifa.png`;

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
    void persist(id);
  }

  function handleSkip() {
    if (saving) return;
    void persist(null);
  }

  return (
    <div className="auth-split-page">
      <div className="auth-pane auth-pane--form">
        <div className="auth-form-container referral-container">
          <div className="auth-heading-group">
            <h1 className="auth-heading">How did you hear about us?</h1>
          </div>

          {error && <div className="auth-error">{error}</div>}

          <fieldset className="referral-options" disabled={saving}>
            <legend className="referral-legend">How did you hear about us?</legend>
            {OPTIONS.map((option, index) => {
              const isSelected = selected === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  className={`referral-option${isSelected ? " is-selected" : ""}`}
                  onClick={() => handleSelect(option.id)}
                  aria-pressed={isSelected}
                >
                  <span className="referral-option-letter">{LETTERS[index]}</span>
                  <span className="referral-option-label">{option.label}</span>
                </button>
              );
            })}
          </fieldset>

          <button
            type="button"
            className="referral-skip"
            onClick={handleSkip}
            disabled={saving}
          >
            {saving && selected === null ? "Skipping..." : "Skip"}
          </button>
        </div>
      </div>

      <div className="auth-pane auth-pane--art" aria-hidden="true">
        <img src={artSrc} alt="" className="auth-art-image" />
      </div>
    </div>
  );
}
