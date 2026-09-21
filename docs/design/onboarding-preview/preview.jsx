import { useState } from "react";
import { createRoot } from "react-dom/client";
import WelcomeScreen from "../../../src/WelcomeScreen.jsx";
import UsernameSetup from "../../../src/features/seller-signal/components/UsernameSetup.jsx";
import HowDidYouHearScreen from "../../../src/HowDidYouHearScreen.jsx";
import TrialOfferScreen from "../../../src/TrialOfferScreen.jsx";

function Preview() {
  const [step, setStep] = useState(0);
  const next = () => setStep(value => value + 1);
  if (step === 0) return <WelcomeScreen onContinue={next} />;
  if (step === 1) return <UsernameSetup onComplete={next} />;
  if (step === 2) return <HowDidYouHearScreen onContinue={next} />;
  if (step === 3) return <TrialOfferScreen onStartTrial={next} onSkip={next} />;
  return <main style={{ padding: 40, color: "#242320", background: "white", minHeight: "100vh" }}><h1>Preview complete</h1><p>No account data was saved and no checkout was opened.</p><button onClick={() => setStep(0)}>Restart preview</button></main>;
}
createRoot(document.getElementById("root")).render(<Preview />);
