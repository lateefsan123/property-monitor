import { IconChevronLeft } from "@tabler/icons-react";
import { supabase } from "./supabase";
import RepeatFox from "./components/RepeatFox";
import { FollowUpArt, SellersArt, WhatsAppArt } from "./onboarding-illustrations";
import { useFoxHop, useTypewriter } from "./onboarding-motion";
import "./styles/onboarding.css";

// Onboarding after Brilliant's (Mobbin ce796c95): one centered column on a
// plain page, a back arrow and progress bar on top, the fox asking each
// question in a speech bubble, and a pill Continue button below.
export const ONBOARDING_STEPS = 7;

const ONBOARDING_ART = {
  "how-sellers": SellersArt,
  "how-whatsapp": WhatsAppArt,
  "how-automation": FollowUpArt,
};

// The fox asking something, like Brilliant's Koji with its speech bubble:
// it hops in and the line types itself out.
export function FoxSays({ children, size = 64 }) {
  const text = String(children);
  const foxRef = useFoxHop([text]);
  const typed = useTypewriter(text);
  return (
    <div className="onb-fox">
      <span ref={foxRef} className="onb-fox-figure"><RepeatFox size={size} state="idle" /></span>
      <p className="onb-bubble" aria-label={text}>
        <span aria-hidden="true">{typed}</span>
        {/* Holds the bubble at its final size while the text types. */}
        <span className="onb-bubble-ghost" aria-hidden="true">{text}</span>
      </p>
    </div>
  );
}

// Art on the left, a heading and a short paragraph on the right.
export function OnboardingInfo({ step, title, children }) {
  const Illustration = ONBOARDING_ART[step];
  return (
    <div className="onb-info">
      <div className="onb-info-art">{Illustration && <Illustration />}</div>
      <div className="onb-info-text">
        <h1>{title}</h1>
        {children}
      </div>
    </div>
  );
}

export default function OnboardingFrame({ step = "welcome", stepNumber, onBack, backDisabled, children }) {
  const progress = stepNumber ? Math.round((stepNumber / ONBOARDING_STEPS) * 100) : 0;
  return (
    <main className={`onb-page onb-page--${step}`}>
      <div className="onb-top">
        {onBack
          ? <button type="button" className="onb-back" onClick={onBack} disabled={backDisabled} aria-label="Back"><IconChevronLeft size={22} stroke={2} aria-hidden="true" /></button>
          : <span className="onb-back" aria-hidden="true" />}
        <div className="onb-progress" role="progressbar" aria-label="Onboarding progress" aria-valuemin={0} aria-valuemax={ONBOARDING_STEPS} aria-valuenow={stepNumber || 0}>
          <span style={{ width: `${progress}%` }} />
        </div>
      </div>
      {/* Each step renders its own content and its .onb-cta button row. */}
      <div key={step} className="onb-content">{children}</div>
      {/* Every step waits on saving the account; this is the way out if that keeps failing. */}
      <button type="button" className="onb-signout" onClick={() => { void supabase.auth.signOut?.(); }}>Sign out</button>
    </main>
  );
}
