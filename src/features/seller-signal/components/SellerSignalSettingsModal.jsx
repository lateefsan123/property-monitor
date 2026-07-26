import { useEffect, useState } from "react";
import {
  IconBolt,
  IconBrandWhatsapp,
  IconChevronRight,
  IconSettings,
  IconX,
} from "@tabler/icons-react";
import WhatsAppConnectionPanel from "./WhatsAppConnectionPanel";

const TABS = [
  { id: "automations", label: "Automations", icon: IconBolt },
  { id: "whatsapp", label: "WhatsApp", icon: IconBrandWhatsapp },
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
  account,
  automationEnabled,
  automationLoading,
  automationSaving,
  connecting,
  monthlyReportsEnabled,
  onAutomationChange,
  onConnect,
  onMonthlyReportsChange,
}) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("automations");

  useEffect(() => {
    if (!open) return undefined;
    function handleKeyDown(event) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="seller-settings-trigger"
        onClick={() => setOpen(true)}
      >
        <span className="seller-settings-trigger-icon" aria-hidden="true">
          <IconSettings size={19} stroke={1.9} />
        </span>
        <span className="seller-settings-trigger-main">
          <strong>Settings</strong>
          <span>Automations, monthly reports and WhatsApp</span>
        </span>
        <IconChevronRight size={16} stroke={1.9} aria-hidden="true" />
      </button>

      {open && (
        <div
          className="seller-settings-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <section
            className="seller-settings-panel"
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
                onClick={() => setOpen(false)}
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
                      className="seller-settings-tab"
                      data-active={active ? "true" : "false"}
                      aria-selected={active}
                      onClick={() => setActiveTab(tab.id)}
                    >
                      <Icon size={18} stroke={1.85} aria-hidden="true" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </nav>

              <div className="seller-settings-content">
                <h2 className="seller-settings-section-title">
                  {activeTab === "automations" ? "Automations" : "WhatsApp"}
                </h2>
                {activeTab === "automations" ? (
                  <div className="seller-settings-automation-pane">
                    <div className="seller-settings-shared-lane">
                      <strong>One shared delivery lane</strong>
                      <span>
                        One message every five minutes, with a combined maximum of 40 messages per Dubai day.
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
                        description="Send monthly building recaps only during the first seven Dubai days of each month."
                        disabled={automationLoading || automationSaving}
                        label="Monthly report automation"
                        onChange={onMonthlyReportsChange}
                      />
                    </div>
                    <p className="seller-settings-lane-note">
                      Transaction updates get the first available slot. A monthly report can use that slot only when no transaction update is due.
                    </p>
                  </div>
                ) : (
                  <div className="seller-settings-whatsapp-pane">
                    <WhatsAppConnectionPanel
                      account={account}
                      connecting={connecting}
                      onConnect={onConnect}
                    />
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
