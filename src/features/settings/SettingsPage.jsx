import { useState } from "react";
import { DAILY_AUTOMATION_CAP, MONTHLY_REPORT_SHARE_OPTIONS } from "../../../shared/automation-settings.js";
import {
  IconActivity,
  IconAdjustmentsHorizontal,
  IconBolt,
  IconBrandWhatsapp,
  IconCalendarWeek,
  IconCreditCard,
  IconFileText,
  IconHelpCircle,
  IconMessageCircle,
  IconMoon,
  IconPlug,
  IconTag,
  IconUserCircle,
} from "@tabler/icons-react";
import { useAssistantPreference } from "../../voice/useAssistantPreference";
import BillingSection from "./BillingSection";
import SchedulePreferences from "../schedule/SchedulePreferences";
import AccountSection from "./AccountSection";
import IntegrationsSection from "./IntegrationsSection";
import SendActivitySection from "./SendActivitySection";
import StatusesSection from "./StatusesSection";
import WhatsAppSection from "./WhatsAppSection";
import { SettingsGroup, SettingsItem, SettingsProfile, SettingsToggle } from "./settings-ui";
import { useProfile } from "./useProfile";
import { useSettingsData } from "./useSettingsData";
import "../../styles/settings-connection-first.css";
import "./settings-page.css";

// Settings as a page with the same screens as mobile settings
// (mobile/src/workspace/settings.js): profile, General, Account, Workspace
// pages and Help & legal, in Base44's full-page layout (Mobbin d9d0498f).
const GROUPS = [
  { label: null, items: [
    { id: "general", label: "General", icon: IconAdjustmentsHorizontal },
  ] },
  { label: "Account", items: [
    { id: "account", label: "Account", icon: IconUserCircle },
    { id: "billing", label: "Billing", icon: IconCreditCard },
  ] },
  { label: "Workspace", items: [
    { id: "automations", label: "Automations", icon: IconBolt },
    { id: "statuses", label: "Statuses", icon: IconTag },
    { id: "schedule", label: "Schedule", icon: IconCalendarWeek },
    { id: "whatsapp", label: "WhatsApp", icon: IconBrandWhatsapp },
    { id: "activity", label: "Send activity", icon: IconActivity },
    { id: "integrations", label: "Integrations", icon: IconPlug },
  ] },
  { label: "Support", items: [
    { id: "help", label: "Help & legal", icon: IconHelpCircle },
  ] },
];
const SECTIONS = GROUPS.flatMap((group) => group.items);

function subscriptionLabel(subscription) {
  if (!subscription) return "";
  if (subscription.source === "app_store") return "App Store";
  if (subscription.source === "play_store") return "Google Play";
  return subscription.status === "active" || subscription.status === "trialing" ? "Active" : "";
}

export default function SettingsPage({
  userId,
  initialSection = "general",
  onNavigate,
  theme,
  onToggleTheme,
  subscription,
  billingPortalError,
  billingPortalPending,
  onCancelPlan,
}) {
  const [section, setSection] = useState(SECTIONS.some((item) => item.id === initialSection) ? initialSection : "general");
  const data = useSettingsData(userId);
  const profile = useProfile(userId);
  const assistantPreference = useAssistantPreference(userId);
  const current = SECTIONS.find((item) => item.id === section);

  return (
    <div className="st-page">
      <nav className="st-nav" aria-label="Settings">
        <SettingsProfile compact name={profile.name} avatarUrl={profile.avatarUrl} onClick={() => setSection("account")} />
        {GROUPS.map((group) => (
          <div key={group.label || "top"} className="st-nav-group">
            {group.label ? <span className="st-nav-label">{group.label}</span> : null}
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
        </header>

        {section === "general" && (
          <div className="st-stack">
            <SettingsGroup title="Preferences">
              {onToggleTheme ? (
                <SettingsItem icon={IconMoon} label="Dark mode">
                  <SettingsToggle label="Dark mode" checked={theme === "dark"} onChange={() => onToggleTheme()} />
                </SettingsItem>
              ) : null}
              <SettingsItem icon={IconMessageCircle} label="Ask Repeat">
                <SettingsToggle label="Ask Repeat" checked={assistantPreference.value} disabled={assistantPreference.pending} onChange={assistantPreference.set} />
              </SettingsItem>
            </SettingsGroup>
            {assistantPreference.error ? <p className="st-error" role="alert">Could not save this preference. Please try again.</p> : null}
          </div>
        )}

        {section === "account" && (
          <AccountSection userId={userId} profile={profile} subscriptionLabel={subscriptionLabel(subscription)} onManageSubscription={() => setSection("billing")} />
        )}

        {section === "billing" && (
          <BillingSection error={billingPortalError} onOpenBilling={onCancelPlan} pending={billingPortalPending} subscription={subscription} />
        )}

        {section === "automations" && (
          <div className="st-stack">
            <SettingsGroup>
              <SettingsItem label="Transaction updates" description="Send sellers matching property transaction updates.">
                <SettingsToggle label="Transaction updates" checked={data.automation.autoWhatsAppEnabled} disabled={data.automation.loading || data.automation.saving}
                  onChange={(value) => data.automation.set("autoWhatsAppEnabled", value)} />
              </SettingsItem>
              <SettingsItem label="Monthly reports" description="Send each seller a summary of last month's sales in their building, once a month.">
                <SettingsToggle label="Monthly reports" checked={data.automation.monthlyReportsEnabled} disabled={data.automation.loading || data.automation.saving}
                  onChange={(value) => data.automation.set("monthlyReportsEnabled", value)} />
              </SettingsItem>
              {data.automation.autoWhatsAppEnabled && data.automation.monthlyReportsEnabled && (
                <SettingsItem label="Daily split" description={`${data.automation.monthlyReportDailyShare} monthly reports and ${DAILY_AUTOMATION_CAP - data.automation.monthlyReportDailyShare} transaction updates a day. Unused slots go to the other.`}>
                  <div className="st-split" role="radiogroup" aria-label="Monthly reports a day">
                    {MONTHLY_REPORT_SHARE_OPTIONS.map((share) => (
                      <button key={share} type="button" role="radio" aria-checked={data.automation.monthlyReportDailyShare === share}
                        className={`st-split-option${data.automation.monthlyReportDailyShare === share ? " is-active" : ""}`}
                        disabled={data.automation.loading || data.automation.saving}
                        onClick={() => data.automation.set("monthlyReportDailyShare", share)}>{share}</button>
                    ))}
                  </div>
                </SettingsItem>
              )}
            </SettingsGroup>
            {data.automation.error ? <p className="st-error" role="alert">{data.automation.error.message}</p> : null}
            <p className="st-note">Up to 40 messages a day, five minutes apart, shared between updates and reports. All schedules use Dubai time.</p>
          </div>
        )}

        {section === "schedule" && (
          <div className="st-stack">
            <div className="st-group-card st-schedule-card"><SchedulePreferences userId={userId} /></div>
            {onNavigate ? (
              <SettingsGroup>
                <SettingsItem icon={IconCalendarWeek} label="Edit buildings and days" onClick={() => onNavigate("schedule")} />
              </SettingsGroup>
            ) : null}
          </div>
        )}

        {section === "statuses" && <StatusesSection userId={userId} />}

        {section === "whatsapp" && <WhatsAppSection userId={userId} account={data.account} loading={data.accountsLoading} />}

        {section === "activity" && <SendActivitySection userId={userId} />}

        {section === "integrations" && <IntegrationsSection userId={userId} />}

        {section === "help" && (
          <div className="st-stack">
            <SettingsGroup title="Legal">
              <SettingsItem icon={IconFileText} label="Privacy policy" href="/privacy" />
              <SettingsItem icon={IconFileText} label="Terms of service" href="/terms" />
              <SettingsItem icon={IconFileText} label="Data deletion help" href="/data-deletion" />
            </SettingsGroup>
          </div>
        )}
      </main>
    </div>
  );
}
