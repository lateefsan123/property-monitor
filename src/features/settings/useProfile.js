import { useEffect, useState } from "react";
import { supabase } from "../../supabase";

// Name and photo from the signed-in user's metadata, kept current when the
// profile is saved (Supabase emits USER_UPDATED).
function fromUser(user) {
  const meta = user?.user_metadata || {};
  return { name: meta.username?.trim() || meta.full_name?.trim() || "", avatarUrl: meta.avatar_url || "", email: user?.email || "" };
}

export function useProfile(userId) {
  const [profile, setProfile] = useState({ name: "", avatarUrl: "", email: "" });
  useEffect(() => {
    if (!supabase || !userId) return undefined;
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active && data.session?.user?.id === userId) setProfile(fromUser(data.session.user));
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user?.id === userId) setProfile(fromUser(session.user));
    });
    return () => { active = false; data.subscription.unsubscribe(); };
  }, [userId]);
  return profile;
}
