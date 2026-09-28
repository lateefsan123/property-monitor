import { useState } from "react";
import {
  IconActivity,
  IconAdjustmentsHorizontal,
  IconBolt,
  IconBrandWhatsapp,
  IconCalendarWeek,
  IconChevronRight,
  IconCreditCard,
  IconPlug,
} from "@tabler/icons-react";
import { useAssistantPreference } from "../../voice/useAssistantPreference";
import BillingSettingsPanel from "../seller-signal/components/BillingSettingsPanel";
import SendActivityPanel from "../seller-signal/components/SendActivityPanel";
import WhatsAppConnectionPanel from "../seller-signal/components/WhatsAppConnectionPanel";
import IntegrationConnectionsPanel from "../seller-signal/components/IntegrationConnectionsPanel";
import SchedulePreferences from "../schedule/SchedulePreferences";
import { useSettingsData } from "./useSettingsData";
import "../../styles/settings-connection-first.css";
import "./settings-page.css";

// Settings as a page, grouped like the mobile settings screen
// (mobile/src/workspace/settings.js) and laid out after Base44's full-page
// settings (Mobbin d9d0498f): grouped left menu, page title + one line,
// then rows with the label on the left and the control on the right.
const GROUPS = [
  { label: "Workspace", items: [
    { id: "automations", label: "Automations", icon: IconBolt, description: "What Repeat AI sends for you automatically." },
    { id: "schedule", label: "Schedule", icon: IconCalendarWeek, description: "How your weekly building schedule is used." },
    { id: "whatsapp", label: "WhatsApp", icon: IconBrandWhatsapp, description: "The account your seller messages are sent from." },
    { id: "activity", label: "Send activity", icon: IconActivity, description: "Messages sent from your WhatsApp account." },
    { id: "integrations", label: "Integrations", icon: IconPlug, description: "Spreadsheets, email and calendars you’ve connected." },
  ] },
  { label: "Account", items: [
    { id: "billing", label: "Billing", icon: IconCreditCard, description: "Your plan, payment and invoices." },
  ] },
  { label: "Preferences", items: [
    { id: "preferences", label: "General", icon: IconAdjustmentsHorizontal, description: "How Repeat AI looks and behaves on this browser." },
  ] },
];
const SECTIONS = GROUPS.flatMap((group) => group.items);

function SwitchRow({ label, description, checked, disabled, onChange }) {
  return (
    <label className="st-row">
      <span className="st-row-text">
        <strong>{label}</strong>
        {description ? <small>{description}</small> : null}
      </span>
      <input type="checkbox" role="switch" className="st-switch" aria-label={label} checked={checked} disabled={disabled}
        onChange={(event) => onChange(event.target.checked)} />
    </label>
  );
}

export default function SettingsPage({
  userId,
  initialSection = "automations",
  onNavigate,
  theme,
  onToggleTheme,
  subscription,
  billingPortalError,
  billingPortalPending,
  onCancelPlan,
}) {
  const [section, setSection] = useState(SECTIONS.some((item) => item.id === initialSection) ? initialSection : "automations");
  const data = useSettingsData(userId);
  const assistantPreference = useAssistantPreference(userId);
  const current = SECTIONS.find((item) => item.id === section);

  return (
    <div className="st-page">
      <nav className="st-nav" aria-label="Settings">
        <h1>Settings</h1>
        {GROUPS.map((group) => (
          <div key={group.label} className="st-nav-group">
            <span className="st-nav-label">{group.label}</span>
            {group.items.map((item) => (
              <button key={item.id} type="button" className={section === item.id ? "is-active" : ""}
                aria-current={section === item.id ? "page" : undefined} onClick={() => setSection(item.id)}>
                <item.icon size={17} stroke={1.8} aria-hidden="true" />
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        ))}
      </nav>

      <main className="st-content settings-connection-first" aria-labelledby="st-title">
        <header className="st-head">
          <h2 id="st-title">{current.label}</h2>
          <p>{current.description}</p>
        </header>

        {section === "automations" && (
          <section className="st-section">
            <div className="st-card">
              <SwitchRow label="Transaction updates" description="Send sellers matching property transaction updates."
                checked={data.automation.autoWhatsAppEnabled} disabled={data.automation.loading || data.automation.saving}
                onChange={(value) => data.automation.set("autoWhatsAppEnabled", value)} />
              <SwitchRow label="Monthly reports" description="Send building summaries during the first seven days of each month."
                checked={data.automation.monthlyReportsEnabled} disabled={data.automation.loading || data.automation.saving}
                onChange={(value) => data.automation.set("monthlyReportsEnabled", value)} />
            </div>
            {data.automation.error ? <p className="st-error" role="alert">{data.automation.error.message}</p> : null}
            <p className="st-note">Up to 40 messages a day, five minutes apart. Transaction updates go first. All schedules use Dubai time.</p>
          </section>
        )}

        {section === "schedule" && (
          <section className="st-section">
            <div className="st-card st-card-flush">
              <SchedulePreferences userId={userId} />
            </div>
            {onNavigate ? (
              <button type="button" className="st-link-row" onClick={() => onNavigate("schedule")}>
                <span>Edit buildings and days</span>
                <IconChevronRight size={17} stroke={1.8} aria-hidden="true" />
              </button>
            ) : null}
          </section>
        )}

        {section === "whatsapp" && (
          <section className="st-section">
            <div className="st-card st-card-pad">
              <WhatsAppConnectionPanel minimal account={data.account} connecting={data.connecting} onConnect={data.connectAccount} />
            </div>
            <button type="button" className="st-link-row" onClick={() => setSection("activity")}>
              <span>Messages today</span>
              <span className="st-link-value">{data.activity.loading && !data.activity.data ? "…" : data.activity.data?.total ?? "—"}</span>
              <IconChevronRight size={17} stroke={1.8} aria-hidden="true" />
            </button>
          </section>
        )}

        {section === "activity" && (
          <section className="st-section">
            <SendActivityPanel activity={data.activity.data} loading={data.activity.loading} />
          </section>
        )}

        {section === "integrations" && (
          <section className="st-section">
            <IntegrationConnectionsPanel key={userId} userId={userId} />
          </section>
        )}

        {section === "billing" && (
          <section className="st-section">
            <BillingSettingsPanel error={billingPortalError} onCancelPlan={onCancelPlan} pending={billingPortalPending} subscription={subscription} />
          </section>
        )}

        {section === "preferences" && (
          <section className="st-section">
            <div className="st-card">
              {onToggleTheme ? (
                <SwitchRow label="Dark mode" description="Use the dark theme on this browser." checked={theme === "dark"} onChange={() => onToggleTheme()} />
              ) : null}
              <SwitchRow label="Ask Repeat" description="Show the assistant button on this browser."
                checked={assistantPreference.value} disabled={assistantPreference.pending} onChange={assistantPreference.set} />
            </div>
            {assistantPreference.error ? <p className="st-error" role="alert">Could not save this preference. Please try again.</p> : null}
          </section>
        )}
      </main>
    </div>
  );
}
