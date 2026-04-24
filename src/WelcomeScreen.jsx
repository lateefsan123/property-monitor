import { useState } from "react";
import { supabase } from "./supabase";

const STEPS = [
  { id: "track", label: "Track buildings and apartments", done: true },
  { id: "alerts", label: "Spot price drops and new listings", done: true },
  { id: "reach", label: "Reach out to sellers at the right moment", done: true },
  { id: "go", label: "Now it’s your turn", done: false, sparkle: true },
];

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polyline points="5 12 10 17 19 7" />
    </svg>
  );
}

export default function WelcomeScreen({ displayName, onContinue }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const artSrc = `${import.meta.env.BASE_URL}khalifa.png`;
  const greeting = displayName ? `Welcome, ${displayName}!` : "Welcome to Seller Signal!";

  async function handleContinue() {
    setSaving(true);
    setError(null);
    const { error: updateError } = await supabase.auth.updateUser({
      data: { welcomed: true },
    });
    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    onContinue?.();
  }

  return (
    <div className="auth-split-page">
      <div className="auth-pane auth-pane--form">
        <div className="auth-form-container welcome-container">
          <div className="auth-heading-group">
            <h1 className="auth-heading">{greeting}</h1>
          </div>

          {error && <div className="auth-error">{error}</div>}

          <div className="welcome-card">
            <p className="welcome-card-title">Seller Signal helps you...</p>
            <ul className="welcome-steps">
              {STEPS.map((step) => (
                <li
                  key={step.id}
                  className={`welcome-step${step.done ? " is-done" : ""}`}
                >
                  <span className={`welcome-step-bullet${step.done ? " is-done" : ""}`}>
                    {step.done ? <CheckIcon /> : null}
                  </span>
                  <span className="welcome-step-label">
                    {step.label}
                    {step.sparkle ? <span className="welcome-step-sparkle"> ✨</span> : null}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <button
            type="button"
            className="auth-submit"
            onClick={handleContinue}
            disabled={saving}
          >
            {saving ? "Loading..." : "Let’s go!"}
          </button>
        </div>
      </div>

      <div className="auth-pane auth-pane--art" aria-hidden="true">
        <img src={artSrc} alt="" className="auth-art-image" />
      </div>
    </div>
  );
}
