import { useEffect, useState } from "react";
import { IconArrowUpRight, IconCreditCard, IconSparkles } from "@tabler/icons-react";

// Billing after Claude's billing settings (Mobbin 40cea7ff): the plan with
// one action beside it, then Payment and Cancellation as single rows.
// Payment, invoices and cancellation all happen with whoever bills the plan
// (Stripe's billing portal, the App Store or Google Play).
function formatDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" }).format(date);
}

export default function BillingSection({ subscription, pending, error, onOpenBilling }) {
  const [confirming, setConfirming] = useState(false);
  useEffect(() => {
    if (!confirming) return undefined;
    function onKey(event) { if (event.key === "Escape" && !pending) setConfirming(false); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [confirming, pending]);

  if (subscription?.source === "complimentary" && subscription.unlimited === true) {
    return (
      <div className="bl">
        <section className="bl-plan">
          <span className="bl-plan-icon" aria-hidden="true"><IconSparkles size={26} stroke={1.5} /></span>
          <div className="bl-plan-text"><strong>Unlimited access</strong><span>No subscription or payment is required.</span></div>
          <span className="bl-status">Active</span>
        </section>
      </div>
    );
  }

  const provider = subscription?.source === "app_store" ? "App Store" : subscription?.source === "play_store" ? "Google Play" : "Stripe";
  const ending = Boolean(subscription?.cancel_at_period_end);
  const trial = subscription?.status === "trialing";
  const periodEnd = formatDate(subscription?.current_period_end);
  const price = provider === "Stripe" && typeof subscription?.amount === "number" && subscription?.currency
    ? new Intl.NumberFormat("en-IE", { style: "currency", currency: subscription.currency }).format(subscription.amount / 100)
    : provider === "Stripe" ? "€35" : null;
  const renewal = ending
    ? `Your plan ends on ${periodEnd || "the last day of this billing period"}. You won’t be charged again.`
    : trial
      ? `Your free trial ends and the paid plan starts on ${periodEnd || "your renewal date"}.`
      : `Your subscription will auto-renew on ${periodEnd || `the date shown in ${provider}`}.`;

  return (
    <div className="bl">
      <section className="bl-plan">
        <span className="bl-plan-icon" aria-hidden="true"><IconSparkles size={26} stroke={1.5} /></span>
        <div className="bl-plan-text">
          <strong>Repeat AI Pro</strong>
          <span>{price ? `${price} / month` : `Billed monthly by ${provider}`}</span>
          <small>{renewal}</small>
        </div>
        <span className={`bl-status${ending ? " is-ending" : trial ? " is-trial" : ""}`}>{ending ? "Ending" : trial ? "Free trial" : "Active"}</span>
      </section>

      <section className="bl-section">
        <h3>Payment</h3>
        <div className="bl-row">
          <IconCreditCard size={20} stroke={1.6} aria-hidden="true" />
          <span className="bl-row-text">Payment method and invoices are managed in {provider}.</span>
          <button type="button" className="bl-btn" disabled={pending} onClick={onOpenBilling}>
            {pending ? "Opening…" : "Manage"}<IconArrowUpRight size={15} stroke={1.8} aria-hidden="true" />
          </button>
        </div>
      </section>

      {!ending ? (
        <section className="bl-section">
          <h3>Cancellation</h3>
          <div className="bl-row">
            <span className="bl-row-text">Cancel plan<small>You keep access until the end of the current billing period.</small></span>
            <button type="button" className="bl-btn is-danger" disabled={pending} onClick={() => setConfirming(true)}>Cancel</button>
          </div>
        </section>
      ) : null}

      {error ? <p className="st-error" role="alert">{error}</p> : null}

      {confirming ? (
        <div className="st-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !pending) setConfirming(false); }}>
          <div className="st-dialog bl-confirm" role="dialog" aria-modal="true" aria-labelledby="bl-confirm-title">
            <h2 id="bl-confirm-title">Cancel Repeat AI Pro?</h2>
            <p>You’ll keep access until {periodEnd || "the end of your billing period"}. {provider} will show the final details before anything changes.</p>
            <div className="bl-confirm-actions">
              <button type="button" className="st-secondary" disabled={pending} onClick={() => setConfirming(false)}>Keep plan</button>
              <button type="button" className="st-secondary is-danger" disabled={pending} onClick={onOpenBilling}>
                {pending ? `Opening ${provider}…` : `Continue in ${provider}`}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
