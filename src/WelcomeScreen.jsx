import { useState } from "react";
import { supabase } from "./supabase";
import OnboardingFrame from "./OnboardingFrame";

export default function WelcomeScreen({ displayName, onContinue }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const greeting = displayName ? `Welcome, ${displayName}!` : "Welcome to Repeat AI!";

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
    <OnboardingFrame step="welcome">
        <div className="auth-form-container welcome-container">
          <div className="auth-heading-group">
            <h1 className="auth-heading">{greeting}</h1>
          </div>

          {error && <div className="auth-error">{error}</div>}

          <p className="auth-helper">Let’s get your seller workspace ready.</p>

          <div className="onboarding-actions">
          <button
            type="button"
            className="auth-submit"
            onClick={handleContinue}
            disabled={saving}
          >
            {saving ? "Saving..." : "Continue →"}
          </button>
          </div>
        </div>
    </OnboardingFrame>
  );
}
