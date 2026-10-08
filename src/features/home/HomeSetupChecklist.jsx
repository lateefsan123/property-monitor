import { useQuery, useQueryClient } from "@tanstack/react-query";
import { IconChevronRight, IconCircle, IconCircleCheckFilled, IconCircleDashed } from "@tabler/icons-react";
import { supabase } from "../../supabase";
import { openSetupAction } from "./setup-actions";
import { buildSetupSteps, fetchSetupStatus, setupChecklistQueryKey, updateSetupPreferences } from "../../../shared/setup-checklist";

// "Get set up" for new accounts, after HoneyBook's step-by-step card
// (Mobbin 7c915d6b): progress on the right of the title, one row per step
// that ticks itself off. Optional steps can be skipped. Hiding it is saved on
// the account, so it stays hidden until it's reopened from the sidebar.
export default function HomeSetupChecklist({ userId, onNavigate }) {
  const client = useQueryClient();
  const status = useQuery({
    queryKey: setupChecklistQueryKey(userId),
    enabled: Boolean(userId),
    queryFn: () => fetchSetupStatus(supabase, userId),
    // Refetch whenever Home opens, so a step done elsewhere ticks straight away.
    staleTime: 0,
  });

  if (!status.data || status.data.hidden) return null;
  const { steps, completed, total, allDone } = buildSetupSteps(status.data);
  if (allDone) return null;
  const nextId = steps.find((step) => !step.done && !step.skipped)?.id;
  const save = (patch) => updateSetupPreferences(client, supabase, userId, patch);

  function open(step) {
    if (step.id === "first-message") onNavigate?.("sellers");
    else openSetupAction(step, onNavigate);
  }

  function toggleSkip(step) {
    const skipped = status.data.skipped || [];
    save({ skipped: step.skipped ? skipped.filter((id) => id !== step.id) : [...skipped, step.id] });
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
          <li key={step.id} className="home-setup-item">
            <button type="button" className={`home-setup-step${step.done ? " is-done" : ""}${step.skipped ? " is-skipped" : ""}`} onClick={() => open(step)}>
              {step.done
                ? <IconCircleCheckFilled className="home-setup-status" size={22} aria-label="Done" />
                : step.skipped
                  ? <IconCircleDashed className="home-setup-status" size={22} stroke={1.6} aria-label="Skipped" />
                  : <IconCircle className="home-setup-status" size={22} stroke={1.6} aria-label="To do" />}
              <span className="home-setup-text">
                <strong>{step.title}</strong>
                <span className="home-muted">{step.text}</span>
              </span>
              {step.id === nextId
                ? <span className="setup-next-button home-setup-cta">{step.action}</span>
                : <IconChevronRight className="home-setup-chevron" size={18} stroke={2} aria-hidden="true" />}
            </button>
            {step.skippable && !step.done && (
              <button type="button" className="home-text-button home-setup-skip" onClick={() => toggleSkip(step)}
                aria-label={step.skipped ? `Undo skip: ${step.title}` : `Skip: ${step.title}`}>
                {step.skipped ? "Undo" : "Skip"}
              </button>
            )}
          </li>
        ))}
      </ol>
      <button type="button" className="home-text-button home-setup-hide" onClick={() => save({ hidden: true })}>Hide checklist</button>
    </section>
  );
}
