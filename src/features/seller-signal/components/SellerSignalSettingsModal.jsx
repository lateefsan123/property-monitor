import { useEffect, useState } from "react";
import {
  IconArrowLeft,
  IconAdjustmentsHorizontal,
  IconChevronRight,
  IconBolt,
  IconBrandWhatsapp,
  IconCreditCard,
  IconPlug,
  IconX,
} from "@tabler/icons-react";
import { useAssistantPreference } from "../../../voice/useAssistantPreference";
import BillingSettingsPanel from "./BillingSettingsPanel";
import "../../../styles/settings-connection-first.css";
import SendActivityPanel from "./SendActivityPanel";
import WhatsAppConnectionPanel from "./WhatsAppConnectionPanel";
import IntegrationConnectionsPanel from "./IntegrationConnectionsPanel";

const TABS = [
  { id: "preferences", label: "Preferences", icon: IconAdjustmentsHorizontal },
  { id: "automations", label: "Automations", icon: IconBolt },
  { id: "whatsapp", label: "WhatsApp", icon: IconBrandWhatsapp },
  { id: "activity", label: "Send activity", icon: null },
  { id: "billing", label: "Billing", icon: IconCreditCard },
  { id: "integrations", label: "Integrations", icon: IconPlug },
];

function AutomationToggle({
  checked,
  description,
  disabled,
  label,
  onChange,
}) {
  return (
    <div className="seller-settings-toggle-row">
      <div className="seller-settings-toggle-copy">
        <strong>{label}</strong>
        <span>{description}</span>
      </div>
      <div className="seller-settings-toggle-control">
        <span>{checked ? "On" : "Off"}</span>
        <button
          type="button"
          className={`seller-settings-switch${checked ? " is-on" : ""}`}
          role="switch"
          aria-checked={checked}
          aria-label={label}
          disabled={disabled}
          onClick={() => onChange(!checked)}
        >
          <span aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

export default function SellerSignalSettingsModal({
  userId,
  account,
  automationEnabled,
  automationLoading,
  automationSaving,
  billingPortalError,
  billingPortalPending,
  connecting,
  monthlyReportsEnabled,
  onAutomationChange,
  onCancelPlan,
  onClose,
  onConnect,
  onMonthlyReportsChange,
  open,
  sendActivity,
  sendActivityLoading,
  subscription,
}) {
  const assistantPreference = useAssistantPreference(userId);
  const [activeTab, setActiveTab] = useState("automations");

  useEffect(() => {
    if (!open) return undefined;
    function handleKeyDown(event) {
      if (event.key === "Escape" && !document.querySelector(".whatsapp-connect-modal-overlay")) onClose?.();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div
      className="seller-settings-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <section
        className="seller-settings-panel settings-connection-first"
        role="dialog"
        aria-modal="true"
        aria-labelledby="seller-settings-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
            <header className="seller-settings-header">
              <h1 id="seller-settings-title">Settings</h1>
              <button
                type="button"
                className="seller-settings-close"
                onClick={onClose}
                aria-label="Close settings"
              >
                <IconX size={18} stroke={1.8} aria-hidden="true" />
              </button>
            </header>

            <div className="seller-settings-layout">
              <nav className="seller-settings-tab-rail" role="tablist" aria-label="Settings sections">
                {TABS.map((tab) => {
                  const Icon = tab.icon;
                  const active = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      className={`seller-settings-tab${tab.id === "activity" ? " settings-activity-subtab" : ""}`}
                      data-active={active || (tab.id === "whatsapp" && activeTab === "activity") ? "true" : "false"}
                      aria-selected={active}
                      onClick={() => setActiveTab(tab.id)}
                    >
                      {Icon && <Icon size={18} stroke={1.85} aria-hidden="true" />}
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </nav>

              <div className="seller-settings-content">
                {activeTab === "activity" && <button type="button" className="settings-back" onClick={() => setActiveTab("whatsapp")}><IconArrowLeft size={16} aria-hidden="true" /> Back to WhatsApp</button>}
                <h2 className="seller-settings-section-title">
                  {activeTab === "preferences" ? "Preferences" : activeTab === "automations"
                    ? "Automations"
                    : activeTab === "whatsapp"
                      ? "WhatsApp"
                      : activeTab === "activity"
                        ? "Send activity"
                        : activeTab === "integrations" ? "Integrations" : "Billing"}
                </h2>
                {activeTab === "preferences" ? (
                  <div className="seller-settings-toggle-list">
                    <AutomationToggle label="Ask Repeat" description="Show the assistant button on this browser." checked={assistantPreference.value} disabled={assistantPreference.pending} onChange={assistantPreference.set} />
                    {assistantPreference.error && <p role="alert">Could not save this preference. Please try again.</p>}
                  </div>
                ) : activeTab === "automations" ? (
                  <div className="seller-settings-automation-pane">
                    <div className="seller-settings-shared-lane">
                      <strong>One shared delivery lane</strong>
                      <span>
                        Sent in the hours and at the pace you choose in Settings → Automations, up to 40 messages per Dubai day.
                      </span>
                    </div>
                    <div className="seller-settings-toggle-list">
                      <AutomationToggle
                        checked={automationEnabled}
                        description="Send matched DLD transaction alerts through the shared delivery lane."
                        disabled={automationLoading || automationSaving}
                        label="Transaction update automation"
                        onChange={onAutomationChange}
                      />
                      <AutomationToggle
                        checked={monthlyReportsEnabled}
                        description="Send each seller a summary of last month's sales in their building, once a month."
                        disabled={automationLoading || automationSaving}
                        label="Monthly report automation"
                        onChange={onMonthlyReportsChange}
                      />
                    </div>
                    <p className="seller-settings-lane-note">
                      Up to 40 a day, shared between updates and reports. Change the split in Settings → Automations.
                    </p>
                  </div>
                ) : activeTab === "whatsapp" ? (
                  <div className="seller-settings-whatsapp-pane">
                    <WhatsAppConnectionPanel
                      minimal
                      account={account}
                      connecting={connecting}
                      onConnect={onConnect}
                    />
                    <button type="button" className="settings-activity-link" onClick={() => setActiveTab("activity")}>
                      <span>Messages today</span><span>{sendActivityLoading && !sendActivity ? "…" : sendActivity?.total ?? "—"}</span><IconChevronRight size={16} aria-hidden="true" />
                    </button>
                  </div>
                ) : activeTab === "integrations" ? (
                  <IntegrationConnectionsPanel key={userId} userId={userId} />
                ) : activeTab === "activity" ? (
                  <SendActivityPanel activity={sendActivity} loading={sendActivityLoading} />
                ) : (
                  <BillingSettingsPanel
                    error={billingPortalError}
                    onCancelPlan={onCancelPlan}
                    pending={billingPortalPending}
                    subscription={subscription}
                  />
                )}
              </div>
            </div>
      </section>
    </div>
  );
}
