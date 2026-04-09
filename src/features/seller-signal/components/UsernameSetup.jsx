import { useState } from "react";
import { supabase } from "../../../supabase";

export default function UsernameSetup({ onComplete }) {
  const [username, setUsername] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const logoSrc = `${import.meta.env.BASE_URL}logo.png`;

  async function handleSubmit(event) {
    event.preventDefault();

    const trimmed = username.trim();
    if (!trimmed) return;

    setSaving(true);
    setError(null);

    const { error: updateError } = await supabase.auth.updateUser({ data: { username: trimmed } });
    if (updateError) {
      setError(updateError.message);
    } else {
      onComplete?.(trimmed);
    }

    setSaving(false);
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <img src={logoSrc} alt="Seller Signal" className="auth-logo" />
        <p className="auth-subtitle">Choose a display name to get started</p>

        {error && <div className="error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            required
            minLength={2}
          />
          <button className="btn-primary" type="submit" disabled={saving}>
            {saving ? "Saving..." : "Continue"}
          </button>
        </form>
      </div>
    </div>
  );
}
