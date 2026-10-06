import { useQuery } from "@tanstack/react-query";
import {
  IconBrandWhatsapp,
  IconCalendarWeek,
  IconCheck,
  IconChevronRight,
  IconCircle,
  IconCircleCheckFilled,
  IconDownload,
  IconTemplate,
} from "@tabler/icons-react";
import { supabase } from "../../supabase";
import { integrationRequest } from "../../integration-client";
import { integrationStatusOptions } from "../../integration-query";
import { buildSetupSteps, fetchSetupStatus, setupChecklistQueryKey } from "../../../shared/setup-checklist";
import { openSetupAction } from "./setup-actions";
import "../../styles/setup-page.css";

// The Setup page the sidebar's "Set up your account" block opens, after
// HoneyBook's setup page (Mobbin 7c915d6b): a welcome heading, the
// step-by-step card with progress, and a right rail of integrations and help.
const PROVIDERS = [
  { id: "google", feature: "email", name: "Gmail", icon: "https://www.gstatic.com/images/branding/product/2x/gmail_2020q4_48dp.png" },
  { id: "microsoft", feature: "email", name: "Outlook", icon: "https://res.cdn.office.net/files/fabric-cdn-prod_20221201.001/assets/brand-icons/product/png/outlook_48x1.png" },
  { id: "google", feature: "calendar", name: "Google Calendar", icon: "https://www.gstatic.com/images/branding/product/2x/calendar_2020q4_48dp.png" },
];

function StepRow({ step, onOpen }) {
  return (
    <button type="button" className={`setup-step${step.done ? " is-done" : ""}`} onClick={() => onOpen(step)}>
      {step.done
        ? <IconCircleCheckFilled className="setup-step-status" size={22} aria-label="Done" />
        : <IconCircle className="setup-step-status" size={22} stroke={1.4} aria-label="To do" />}
      <span className="setup-step-text">
        <span className="setup-step-title">
          <strong>{step.title}</strong>
          <span className="setup-step-time">{step.time}</span>
        </span>
        <span className="setup-step-body">{step.text}</span>
      </span>
      <IconChevronRight className="setup-step-chevron" size={20} stroke={2} aria-hidden="true" />
    </button>
  );
}

function RailCard({ title, onOpen, children }) {
  return (
    <section className="setup-rail-card">
      <button type="button" className="setup-rail-head" onClick={onOpen}>
        <h2>{title}</h2>
        <IconChevronRight size={20} stroke={2} aria-hidden="true" />
      </button>
      <div className="setup-rail-body">{children}</div>
    </section>
  );
}

export default function SetupPage({ userId, displayName, onNavigate, onAction }) {
  const status = useQuery({
    queryKey: setupChecklistQueryKey(userId),
    enabled: Boolean(userId),
    queryFn: () => fetchSetupStatus(supabase, userId),
    staleTime: 0,
  });
  const connections = useQuery(integrationStatusOptions(userId, integrationRequest));
  const { steps, completed, total, allDone } = buildSetupSteps(status.data);
  const connected = (provider) => connections.data?.some((item) => item.provider === provider.id && item.feature === provider.feature && item.connected);

  function openStep(step) {
    if (step.id === "first-message") onNavigate?.("sellers");
    else openSetupAction(step, onNavigate);
  }

  return (
    <div className="setup-page">
      <h1 className="setup-title">Welcome to Repeat AI{displayName ? `, ${displayName}` : ""}!</h1>
      <div className="setup-layout">
        <section className="setup-card" aria-labelledby="setup-steps-title" aria-busy={status.isPending}>
          <div className="setup-card-head">
            <h2 id="setup-steps-title">{allDone ? "You're all set" : "Let's start step-by-step"}</h2>
            <div className="setup-progress">
              <span>{completed}/{total} completed</span>
              <span className="setup-progress-bar" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={completed} aria-label="Setup progress">
                <span style={{ width: `${(completed / total) * 100}%` }} />
              </span>
            </div>
          </div>
          {status.error ? (
            <p className="setup-error" role="alert">
              Could not load your setup. <button type="button" className="home-text-button" onClick={() => status.refetch()}>Try again</button>
            </p>
          ) : (
            <div className="setup-steps">
              {steps.map((step) => <StepRow key={step.id} step={step} onOpen={openStep} />)}
            </div>
          )}
        </section>

        <aside className="setup-rail" aria-label="More setup">
          <RailCard title="Integrations" onOpen={() => onNavigate?.("settings", { section: "integrations" })}>
            <div className="setup-chips">
              <button type="button" className={`setup-chip${status.data?.whatsappConnected ? " is-connected" : ""}`} onClick={() => onNavigate?.("settings", { section: "whatsapp" })}>
                {status.data?.whatsappConnected ? <IconCheck size={16} stroke={2.2} aria-label="Connected" /> : <IconBrandWhatsapp size={18} stroke={1.8} aria-hidden="true" />}
                WhatsApp
              </button>
              {PROVIDERS.map((provider) => (
                <button key={`${provider.feature}-${provider.id}`} type="button" className={`setup-chip${connected(provider) ? " is-connected" : ""}`} onClick={() => onNavigate?.("settings", { section: "integrations" })}>
                  {connected(provider) ? <IconCheck size={16} stroke={2.2} aria-label="Connected" /> : <img src={provider.icon} alt="" width={18} height={18} />}
                  {provider.name}
                </button>
              ))}
            </div>
          </RailCard>

          <section className="setup-rail-card">
            <h2 className="setup-rail-heading">Get more from Repeat AI</h2>
            <ul className="setup-links">
              <li><button type="button" onClick={() => onNavigate?.("schedule")}><IconCalendarWeek size={20} stroke={1.7} aria-hidden="true" />Choose your follow-up days</button></li>
              <li><button type="button" onClick={() => onAction?.("message-template")}><IconTemplate size={20} stroke={1.7} aria-hidden="true" />Write your message template</button></li>
              <li><a href="/api/desktop/download"><IconDownload size={20} stroke={1.7} aria-hidden="true" />Download the desktop app</a></li>
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
