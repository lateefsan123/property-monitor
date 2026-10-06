import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { IconChevronRight, IconCircle, IconCircleCheckFilled } from "@tabler/icons-react";
import { supabase } from "../../supabase";
import { openSetupAction } from "./setup-actions";
import { buildSetupSteps, fetchSetupStatus, setupChecklistQueryKey } from "../../../shared/setup-checklist";

// "Get set up" for new accounts, after HoneyBook's step-by-step card
// (Mobbin 7c915d6b): progress on the right of the title, one row per step
// that ticks itself off. It disappears once every step is done or is hidden.
const HIDDEN_KEY = "home:setup-hidden";

function readHidden(userId) {
  try { return window.localStorage.getItem(`${HIDDEN_KEY}:${userId}`) === "1"; } catch { return false; }
}

export default function HomeSetupChecklist({ userId, onNavigate }) {
  const [hidden, setHidden] = useState(() => readHidden(userId));
  const status = useQuery({
    queryKey: setupChecklistQueryKey(userId),
    enabled: Boolean(userId) && !hidden,
    queryFn: () => fetchSetupStatus(supabase, userId),
    // Refetch whenever Home opens, so a step done elsewhere ticks straight away.
    staleTime: 0,
  });

  if (hidden || !status.data) return null;
  const { steps, completed, total, allDone } = buildSetupSteps(status.data);
  if (allDone) return null;
  const nextId = steps.find((step) => !step.done)?.id;

  function hide() {
    setHidden(true);
    try { window.localStorage.setItem(`${HIDDEN_KEY}:${userId}`, "1"); } catch { /* Hidden for this visit only. */ }
  }

  function open(step) {
    if (step.id === "first-message") onNavigate?.("sellers");
    else openSetupAction(step, onNavigate);
  }

  return (
    <section className="home-setup" aria-labelledby="home-setup-title">
      <div className="home-setup-head">
        <h2 id="home-setup-title" className="home-card-title">Get set up</h2>
        <div className="home-setup-progress">
          <span className="home-muted">{completed}/{total} completed</span>
          <span className="home-setup-bar" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={completed} aria-label="Setup progress">
            <span style={{ width: `${(completed / total) * 100}%` }} />
          </span>
        </div>
      </div>
      <ol className="home-setup-steps">
        {steps.map((step) => (
          <li key={step.id}>
            <button type="button" className={`home-setup-step${step.done ? " is-done" : ""}`} onClick={() => open(step)}>
              {step.done
                ? <IconCircleCheckFilled className="home-setup-status" size={22} aria-label="Done" />
                : <IconCircle className="home-setup-status" size={22} stroke={1.6} aria-label="To do" />}
              <span className="home-setup-text">
                <strong>{step.title}</strong>
                <span className="home-muted">{step.text}</span>
              </span>
              {step.id === nextId
                ? <span className="setup-next-button home-setup-cta">{step.action}</span>
                : <IconChevronRight className="home-setup-chevron" size={18} stroke={2} aria-hidden="true" />}
            </button>
          </li>
        ))}
      </ol>
      <button type="button" className="home-text-button home-setup-hide" onClick={hide}>Hide checklist</button>
    </section>
  );
}
