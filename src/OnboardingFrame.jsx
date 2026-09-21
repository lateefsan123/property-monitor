import "./styles/onboarding.css";

const ARTWORK = {
  welcome: "product-spreadsheets-mobile-colour-v3.png",
  profile: "product-seller-story-mobile-colour-v2.png",
  referral: "product-templates-story-mobile-clean-v4.png",
  trial: "product-followups-story-mobile-colour-v2.png",
};

export default function OnboardingFrame({ children, step = "welcome" }) {
  return (
    <main className={`auth-split-page onboarding-page onboarding-page--${step}`}>
      <section className="onboarding-form-pane">
        <div className="onboarding-inner">
          <img className="onboarding-brand" src="/brand/repeat-ai-logo.png" alt="Repeat AI" width="140" height="25" />
          {children}
        </div>
      </section>
      <aside className="onboarding-art" aria-hidden="true">
        <img src={`/landing/${ARTWORK[step]}`} alt="" />
      </aside>
    </main>
  );
}
