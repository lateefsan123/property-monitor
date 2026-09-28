import { useEffect, useRef, useState } from "react";
import { IconCreditCard, IconLogout, IconPencil, IconTrash, IconUser, IconUserCircle } from "@tabler/icons-react";
import { supabase } from "../../supabase";
import { saveAvatarProfile } from "../../../shared/profile-avatar";
import { avatarDataUrlFromFile } from "./avatar-image";
import { Avatar, SettingsGroup, SettingsItem } from "./settings-ui";

// Mobile's Account screen (mobile/src/screens/SettingsScreen.js, account
// section) and Edit Profile screen (edit-profile-screen.js).
function EditProfileDialog({ userId, name: initialName, avatarUrl: initialAvatar, onClose }) {
  const [name, setName] = useState(initialName);
  const [photo, setPhoto] = useState(initialAvatar);
  const [menu, setMenu] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef(null);
  const panel = useRef(null);
  const changed = name.trim() !== initialName || photo !== initialAvatar;

  function close() {
    if (busy) return;
    if (changed && !window.confirm("Discard changes? Your profile changes haven’t been saved.")) return;
    onClose();
  }

  useEffect(() => {
    panel.current?.querySelector("input[type=text]")?.focus();
    function onKey(event) {
      if (event.key !== "Escape") return;
      if (menu) setMenu(false); else close();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });

  async function choose(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    setMenu(false);
    if (!file) return;
    setError("");
    try { setPhoto(await avatarDataUrlFromFile(file)); } catch (failure) { setError(failure.message); }
  }

  async function save(event) {
    event?.preventDefault();
    const trimmed = name.trim();
    if (busy || !changed) return;
    if (!trimmed) { setError("Please enter your name."); return; }
    if (trimmed.length > 80) { setError("Keep your name to 80 characters or fewer."); return; }
    setBusy(true);
    setError("");
    try {
      await saveAvatarProfile(supabase, userId, { username: trimmed, full_name: trimmed, avatar_url: photo || null });
      onClose();
    } catch (failure) {
      setError(failure.message || "Could not save your profile. Please try again.");
      setBusy(false);
    }
  }

  return (
    <div className="st-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
      <form ref={panel} className="st-dialog st-profile-dialog" role="dialog" aria-modal="true" aria-labelledby="st-edit-profile" onSubmit={save}>
        <header className="st-dialog-bar">
          <button type="button" className="st-pill" disabled={busy} onClick={close}>Cancel</button>
          <h2 id="st-edit-profile">Edit Profile</h2>
          <button type="submit" className="st-pill is-strong" disabled={busy || !changed || !name.trim()}>{busy ? "Saving…" : "Save"}</button>
        </header>
        <div className="st-photo-area">
          <button type="button" className="st-photo" disabled={busy} onClick={() => setMenu((value) => !value)} aria-label="Change profile photo" aria-expanded={menu}>
            {photo ? <img src={photo} alt="" /> : <IconUser size={64} stroke={1.4} aria-hidden="true" />}
            <span className="st-photo-badge" aria-hidden="true"><IconPencil size={15} stroke={1.8} /></span>
          </button>
          {menu ? (
            <div className="st-photo-menu" role="menu">
              <button type="button" role="menuitem" onClick={() => fileRef.current?.click()}>Choose Photo</button>
              {photo ? <button type="button" role="menuitem" className="is-danger" onClick={() => { setPhoto(""); setMenu(false); }}>Remove Photo</button> : null}
            </div>
          ) : null}
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={choose} />
        </div>
        <h3 className="st-dialog-section">Profile</h3>
        <label className="st-underline-field">
          <span>Name</span>
          <input type="text" value={name} maxLength={80} disabled={busy} autoComplete="name" placeholder="Your name" onChange={(event) => setName(event.target.value)} />
        </label>
        {error ? <p className="st-error" role="alert">{error}</p> : null}
      </form>
    </div>
  );
}

export default function AccountSection({ userId, profile, subscriptionLabel, onManageSubscription }) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function signOut() {
    if (!window.confirm("Sign out? You will be signed out of your current account.")) return;
    await supabase.auth.signOut({ scope: "local" });
  }

  async function deleteAccount() {
    if (!window.confirm("Delete account? Are you sure you want to delete your account? This action cannot be undone.")) return;
    setBusy(true);
    setError("");
    try {
      const { error: rpcError } = await supabase.rpc("delete_user");
      if (rpcError) throw rpcError;
      await supabase.auth.signOut({ scope: "local" });
    } catch (failure) {
      setError(failure.message || "Failed to delete account");
      setBusy(false);
    }
  }

  return (
    <div className="st-stack">
      <div className="st-account-hero">
        <Avatar name={profile.name} url={profile.avatarUrl} size={72} />
        <div>
          <strong>{profile.name || "Your account"}</strong>
          {profile.email ? <small>{profile.email}</small> : null}
        </div>
      </div>
      <SettingsGroup title="Account">
        <SettingsItem icon={IconUserCircle} label="Edit profile" onClick={() => setEditing(true)} />
        <SettingsItem icon={IconCreditCard} label="Manage subscription" value={subscriptionLabel} onClick={onManageSubscription} />
      </SettingsGroup>
      <SettingsGroup>
        <SettingsItem icon={IconLogout} label="Sign out" destructive disabled={busy} onClick={signOut} />
        <SettingsItem icon={IconTrash} label={busy ? "Deleting…" : "Delete account"} destructive disabled={busy} onClick={deleteAccount} />
      </SettingsGroup>
      {error ? <p className="st-error" role="alert">{error}</p> : null}
      {editing ? <EditProfileDialog userId={userId} name={profile.name} avatarUrl={profile.avatarUrl} onClose={() => setEditing(false)} /> : null}
    </div>
  );
}

