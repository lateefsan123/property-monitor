import { useState } from "react";
import { IconArrowUpRight, IconCheck, IconX } from "@tabler/icons-react";

function formatDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-IE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function getPlanStatus(subscription) {
  if (subscription?.cancel_at_period_end) return "Ending";
  if (subscription?.status === "trialing") return "Free trial";
  return "Active";
}

export default function BillingSettingsPanel({ error, onCancelPlan, pending, subscription }) {
  const [confirming, setConfirming] = useState(false);
  const periodEnd = formatDate(subscription?.current_period_end);
  const cancellationScheduled = Boolean(subscription?.cancel_at_period_end);
  const provider = subscription?.source === "app_store" ? "App Store"
    : subscription?.source === "play_store" ? "Google Play" : "Stripe";
  const priceLabel = provider !== "Stripe" ? `Billed by ${provider}`
    : typeof subscription?.amount === "number" && subscription?.currency
      ? new Intl.NumberFormat("en-IE", { style: "currency", currency: subscription.currency }).format(subscription.amount / 100)
      : "EUR 25";

  return (
    <div className="seller-billing-pane">
      <div className="seller-billing-heading">
        <div>
          <span className="seller-billing-eyebrow">Current plan</span>
          <h3>Repeat AI Pro</h3>
        </div>
        <span className={`seller-billing-status${cancellationScheduled ? " is-ending" : ""}`}>
          {getPlanStatus(subscription)}
        </span>
      </div>

      <div className="seller-billing-plan-card">
        <div className="seller-billing-price">
          <strong>{priceLabel}</strong>
          <span>/ month</span>
        </div>
        <p>
          Full web workspace, automated seller messages, listing alerts and mobile access.
        </p>
        <div className="seller-billing-date-row">
          <IconCheck size={17} stroke={2.1} aria-hidden="true" />
          <span>
            {cancellationScheduled
              ? `Access continues until ${periodEnd || "the end of your billing period"}.`
              : subscription?.status === "trialing"
                ? `Your paid plan starts on ${periodEnd || "your renewal date"}.`
                : `Next payment: ${periodEnd || `shown in ${provider}`}.`}
          </span>
        </div>
      </div>

      {cancellationScheduled ? (
        <div className="seller-billing-ending-note" role="status">
          Your plan is cancelled. You will not be charged again unless you restart it.
        </div>
      ) : (
        <div className="seller-billing-cancel-row">
          <div>
            <strong>Cancel plan</strong>
            <span>You keep access until the end of the current billing period.</span>
          </div>
          <button
            type="button"
            className="seller-billing-cancel-button"
            onClick={() => setConfirming(true)}
          >
            Cancel plan
          </button>
        </div>
      )}

      {error && <p className="seller-billing-error" role="alert">{error}</p>}

      {confirming && !cancellationScheduled && (
        <div className="seller-billing-confirm-overlay" role="presentation">
          <section
            aria-labelledby="seller-billing-confirm-title"
            aria-modal="true"
            className="seller-billing-confirm"
            role="dialog"
          >
            <button
              type="button"
              className="seller-billing-confirm-close"
              aria-label="Close cancellation confirmation"
              onClick={() => setConfirming(false)}
            >
              <IconX size={18} stroke={2} aria-hidden="true" />
            </button>
            <h3 id="seller-billing-confirm-title">Cancel Repeat AI Pro?</h3>
            <p>
              {`You will keep access until ${periodEnd || "the end of your billing period"}. ${provider} will show the final details before anything changes.`}
            </p>
            <div className="seller-billing-confirm-actions">
              <button type="button" onClick={() => setConfirming(false)} disabled={pending}>
                Keep plan
              </button>
              <button
                type="button"
                className="is-danger"
                disabled={pending}
                onClick={() => onCancelPlan?.()}
              >
                {pending ? `Opening ${provider}...` : "Continue to cancellation"}
                {!pending && <IconArrowUpRight size={16} stroke={2} aria-hidden="true" />}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
