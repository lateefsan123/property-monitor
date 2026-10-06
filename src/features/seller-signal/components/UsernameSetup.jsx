import { useEffect, useRef, useState } from "react";
import { supabase } from "../../../supabase";
import OnboardingFrame, { FoxSays } from "../../../OnboardingFrame";
import { AVATAR_PIXELS, AVATAR_QUALITY, saveAvatarProfile } from '../../../../shared/profile-avatar';

function getInitial(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "?";
  return trimmed.charAt(0).toUpperCase();
}

function downscaleImageToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read the image."));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("That file isn’t a supported image."));
      image.onload = () => {
        const canvas = document.createElement("canvas");
        const outputSide = Math.min(AVATAR_PIXELS, image.width, image.height);
        canvas.width = outputSide;
        canvas.height = outputSide;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Could not process the image."));
          return;
        }
        const minSide = Math.min(image.width, image.height);
        const sx = (image.width - minSide) / 2;
        const sy = (image.height - minSide) / 2;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(image, sx, sy, minSide, minSide, 0, 0, outputSide, outputSide);
        resolve(canvas.toDataURL("image/jpeg", AVATAR_QUALITY));
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export default function UsernameSetup({ initialName = "", initialAvatar = "", onComplete, onBack }) {
  const [username, setUsername] = useState(initialName);
  const [avatarDataUrl, setAvatarDataUrl] = useState(initialAvatar);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    setUsername(initialName);
  }, [initialName]);

  useEffect(() => {
    setAvatarDataUrl(initialAvatar);
  }, [initialAvatar]);

  async function handleFileChange(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      setError("Image is larger than 4MB.");
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const dataUrl = await downscaleImageToDataUrl(file);
      setAvatarDataUrl(dataUrl);
    } catch (uploadError) {
      setError(uploadError.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const trimmed = username.trim();
    if (!trimmed) return;

    setSaving(true);
    setError(null);

    try {
      const user = await saveAvatarProfile(supabase, null, {
        username: trimmed,
        avatar_url: avatarDataUrl || null,
        profile_completed: true,
      });
      onComplete?.({ username: trimmed, avatarDataUrl: user.user_metadata?.avatar_url || "" });
    } catch (updateError) {
      setError(updateError.message);
      setSaving(false);
      return;
    }

    setSaving(false);
  }

  return (
    <OnboardingFrame step="profile" stepNumber={5} onBack={onBack} backDisabled={saving}>
        <form className="onb-form profile-setup" onSubmit={handleSubmit}>
          <FoxSays>What name should sellers see on your messages?</FoxSays>

          {error && <div className="auth-error">{error}</div>}

          <label className="auth-field">
            <span className="auth-label">Your name</span>
            <input
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              required
              minLength={2}
              autoComplete="name"
              autoFocus
            />
          </label>

          <div className="profile-avatar-row">
            <div
              className={`profile-avatar${avatarDataUrl ? " has-image" : ""}`}
              aria-hidden={avatarDataUrl ? "true" : undefined}
            >
              {avatarDataUrl ? (
                <img src={avatarDataUrl} alt="" />
              ) : (
                <span>{getInitial(username)}</span>
              )}
            </div>
            <div className="profile-avatar-controls">
              <div className="profile-avatar-buttons">
                <button
                  type="button"
                  className="profile-avatar-btn"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? "Processing..." : avatarDataUrl ? "Change photo" : "Upload photo"}
                </button>
                {avatarDataUrl && !uploading && (
                  <button
                    type="button"
                    className="profile-avatar-btn profile-avatar-btn--danger"
                    onClick={() => setAvatarDataUrl("")}
                  >
                    Remove photo
                  </button>
                )}
              </div>
              <p className="profile-avatar-hint">
                Optional. It goes on your broker card. Up to 4MB.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                hidden
              />
            </div>
          </div>

          <div className="onb-cta">
          <button
            type="submit"
            className="auth-submit"
            disabled={saving || uploading || !username.trim()}
          >
            {saving ? "Saving..." : "Continue"}
          </button>
          </div>
        </form>
    </OnboardingFrame>
  );
}
