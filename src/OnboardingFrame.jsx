import { supabase } from "./supabase";
import "./styles/onboarding.css";

const ARTWORK = {
  welcome: "product-seller-story-mobile-colour-v2.png",
  "how-sellers": "product-spreadsheets-mobile-colour-v3.png",
  "how-whatsapp": "whatsapp-agent-conversation.png",
  "how-automation": "product-followups-story-mobile-colour-v2.png",
  profile: "product-templates-story-mobile-colour-v2.png",
  referral: "hero-ask-repeat-fox-v1.png",
  trial: "product-market-story-mobile-colour-v2.png",
};

export function onboardingArtwork(step) {
  return ARTWORK[step] || ARTWORK.welcome;
}

export default function OnboardingFrame({ children, step = "welcome" }) {
  return (
    <main className={`auth-split-page onboarding-page onboarding-page--${step}`}>
      <section className="onboarding-form-pane">
        <div className="onboarding-inner">
          <img className="onboarding-brand" src="/brand/repeat-ai-logo.png" alt="Repeat AI" width="140" height="25" />
          {children}
          {/* Every step waits on saving the account; this is the way out if that keeps failing. */}
          <button type="button" className="onboarding-signout" onClick={() => { void supabase.auth.signOut?.(); }}>Sign out</button>
        </div>
      </section>
      <aside className="onboarding-art" aria-hidden="true">
        <img src={`/landing/${onboardingArtwork(step)}`} alt="" />
      </aside>
    </main>
  );
}
