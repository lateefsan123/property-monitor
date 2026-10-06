import { useState } from "react";
import { supabase } from "./supabase";
import OnboardingFrame, { FoxSays } from "./OnboardingFrame";

// Brilliant opens with Koji saying hello; Repeat's fox does the same.
export default function WelcomeScreen({ displayName, onContinue }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const hello = displayName ? `Hi ${displayName}, I'm Repeat!` : "Hi, I'm Repeat!";

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
    <OnboardingFrame step="welcome" stepNumber={1}>
      <div className="onb-hello">
        <FoxSays size={150}>{hello}</FoxSays>
        <p className="onb-lead">I follow up with your sellers on WhatsApp, so none of them go cold. Let me show you how it works.</p>
      </div>

      {error && <div className="auth-error">{error}</div>}

      <div className="onb-cta">
        <button type="button" className="auth-submit" onClick={handleContinue} disabled={saving}>
          {saving ? "Saving..." : "Continue"}
        </button>
      </div>
    </OnboardingFrame>
  );
}
