import { useEffect, useRef, useState } from "react";
import { supabase } from "../../../supabase";

const AVATAR_PIXELS = 96;
const AVATAR_QUALITY = 0.7;

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
        canvas.width = AVATAR_PIXELS;
        canvas.height = AVATAR_PIXELS;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Could not process the image."));
          return;
        }
        const minSide = Math.min(image.width, image.height);
        const sx = (image.width - minSide) / 2;
        const sy = (image.height - minSide) / 2;
        ctx.drawImage(image, sx, sy, minSide, minSide, 0, 0, AVATAR_PIXELS, AVATAR_PIXELS);
        resolve(canvas.toDataURL("image/jpeg", AVATAR_QUALITY));
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export default function UsernameSetup({ initialName = "", initialAvatar = "", onComplete }) {
  const [username, setUsername] = useState(initialName);
  const [avatarDataUrl, setAvatarDataUrl] = useState(initialAvatar);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);
  const artSrc = `${import.meta.env.BASE_URL}khalifa.png`;

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

    const { error: updateError } = await supabase.auth.updateUser({
      data: {
        username: trimmed,
        avatar_url: avatarDataUrl || null,
        profile_completed: true,
      },
    });

    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return;
    }

    setSaving(false);
    onComplete?.({ username: trimmed, avatarDataUrl: avatarDataUrl || "" });
  }

  return (
    <div className="auth-split-page">
      <div className="auth-pane auth-pane--form">
        <form className="auth-form-container profile-setup" onSubmit={handleSubmit}>
          <div className="auth-heading-group">
            <h1 className="auth-heading">What’s your name?</h1>
            <p className="auth-helper">Complete your profile now.</p>
          </div>

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
                Pick a photo up to 4MB. Your avatar photo will be public.
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

          <button
            type="submit"
            className="auth-submit"
            disabled={saving || uploading || !username.trim()}
          >
            {saving ? "Saving..." : "Next"}
          </button>
        </form>
      </div>

      <div className="auth-pane auth-pane--art" aria-hidden="true">
        <img src={artSrc} alt="" className="auth-art-image" />
      </div>
    </div>
  );
}
