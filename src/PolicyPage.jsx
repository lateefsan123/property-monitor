import "./styles/policy.css";

const UPDATED_AT = "October 4, 2026";

const POLICIES = {
  "/support": {
    eyebrow: "Support",
    title: "Repeat AI Support",
    intro: "Help with your account, subscription, seller records, and listings.",
    sections: [
      { title: "Contact Us", body: "Email lateefsanusiit@gmail.com with a description of the issue, your device model, and app version. Do not include your password or other people’s contact details." },
      { title: "Subscriptions", body: "In the app, open Settings → Billing to manage your subscription. Apple subscriptions can also be managed in device Settings → your name → Subscriptions; Google Play subscriptions in Play Store → profile → Payments & subscriptions → Subscriptions. If you have already paid, use Restore purchases on the app subscription screen while signed in to the appropriate store account." },
      { title: "Account Deletion", body: "In the app, open Settings → Account → Delete account. You can also request deletion by emailing lateefsanusiit@gmail.com from your account email. Deleting an account does not automatically cancel an Apple or Google Play subscription. Cancel it through the store's subscription controls." },
    ],
  },
  "/privacy": {
    eyebrow: "Privacy",
    title: "Privacy Policy",
    intro:
      "Repeat AI is operated by Sanusi Labs to help real estate professionals manage seller pipelines, listing signals, follow-ups, and related communications.",
    sections: [
      {
        title: "Information We Collect",
        body:
          "We collect account identifiers, email address, profile details you provide, subscription and purchase status, and app preferences. When you use Repeat AI, we also process seller names, contact details and addresses, imported files and spreadsheet records, notes, searches, listing alerts, building watchlists, follow-up activity, and photos you choose to upload. We process operational and diagnostic information to maintain reliability and security. If you enable push notifications, we process your notification token to deliver requested alerts.",
      },
      {
        title: "How We Use Information",
        body:
          "We use information to provide the Repeat AI workspace, authenticate users, process payments, import and organize records, show listing and lead updates, send requested notifications, support WhatsApp messaging features, prevent abuse, and improve reliability.",
      },
      {
        title: "WhatsApp Data",
        body:
          "If you connect WhatsApp, Repeat AI processes connection credentials, messages you initiate or automate, and message and delivery events to provide messaging features and associate activity with the relevant account or seller. Connections may use a linked-device session or WhatsApp Business Platform integration. We do not sell WhatsApp message data.",
      },
      {
        title: "Connected Email and Calendar",
        body:
          "If you connect an email or calendar account, we process the account connection credentials, email content and related contact details, and calendar events needed for the features you use. These integrations are optional. You can disconnect an integration in Repeat AI and revoke its authorization through the connected provider's account controls.",
      },
      {
        title: "AI and Voice Features",
        body:
          "When you use the assistant, we send your request and relevant workspace context to our AI service providers to generate a response. If you choose voice input or a live voice session, microphone audio is sent for transcription or conversational processing. We also process assistant conversations and any files or images you choose to include. Voice and assistant features are optional; avoid including information you do not want processed by these providers.",
      },
      {
        title: "Payments and Subscription Access",
        body:
          "Web payments are handled by Stripe, and native purchases by Apple or Google Play. RevenueCat helps validate native purchases, renewals, cancellations and refunds. We send RevenueCat your Repeat AI account identifier and, when available, account email and display name so purchase access can be associated with your account. We receive subscription status and purchase information; payment card details are handled by the payment provider.",
      },
      {
        title: "Sharing",
        body:
          "We provide information to service providers needed to run the product, including hosting, database, authentication, payments, RevenueCat, AI processing, operational analytics, notifications, and connected messaging, email and calendar infrastructure. Messages and other information you choose to send are delivered to your selected recipients. We do not sell your personal data. We may disclose information when required by law or to protect the service and users.",
      },
      {
        title: "Retention and Deletion",
        body:
          "We keep data while your account is active or as needed to provide the service, meet legal obligations, resolve disputes, and enforce agreements. You can request export or deletion of your account data using the contact details below.",
      },
      {
        title: "Contact",
        body:
          "For privacy requests, contact Sanusi Labs at lateefsanusiit@gmail.com.",
      },
    ],
  },
  "/terms": {
    eyebrow: "Terms",
    title: "Terms of Service",
    intro:
      "These terms govern your use of Repeat AI, a seller pipeline and listing intelligence workspace for real estate professionals.",
    sections: [
      {
        title: "Use of the Service",
        body:
          "You may use Repeat AI only for lawful business purposes and in compliance with applicable real estate, privacy, communications, and platform rules. You are responsible for the accuracy and legality of the data you upload or enter.",
      },
      {
        title: "Accounts and Access",
        body:
          "You are responsible for maintaining the security of your account and for activity that occurs under it. You must not share access in a way that bypasses subscription, security, or usage limits.",
      },
      {
        title: "Messaging Compliance",
        body:
          "When using WhatsApp or other communications features, you are responsible for having the required consent, honoring opt-outs, and following WhatsApp Business Platform policies and local communications laws.",
      },
      {
        title: "Billing",
        body:
          "Paid access is billed through the payment provider shown at checkout. Fees, renewal terms, trials, cancellations, and refunds are presented during purchase or managed through the billing provider.",
      },
      {
        title: "Service Changes",
        body:
          "We may update, suspend, or discontinue parts of Repeat AI as we improve the product, maintain security, or comply with platform requirements.",
      },
      {
        title: "Contact",
        body:
          "For questions about these terms, contact Sanusi Labs at lateefsanusiit@gmail.com.",
      },
    ],
  },
  "/data-deletion": {
    eyebrow: "Deletion",
    title: "Data Deletion Instructions",
    intro:
          "You can request deletion of your Repeat AI account and associated data, or selected workspace and integration data while keeping your account.",
    sections: [
      {
        title: "How To Request Deletion",
        body:
          "Email lateefsanusiit@gmail.com from the email address linked to your Repeat AI account with the subject line 'Repeat AI data deletion request'. State whether you want your entire account deleted or only specific records, uploads, conversations or connected integration data. Identify the workspace or integration affected without including your password. In the app, you can also open Settings → Account → Delete account to request full account deletion.",
      },
      {
        title: "What We Delete",
        body:
          "For account deletion, we delete or anonymize account profile data, seller records, imported files and spreadsheets, lead notes, saved views, assistant conversations, connected messaging/email/calendar records, notification tokens and related operational data unless retention is required for legal, security, billing, or dispute-resolution reasons. For partial deletion requests, we remove the specified data after verifying the request. Deletion does not automatically cancel an Apple or Google Play subscription; use the store's subscription controls to cancel it.",
      },
      {
        title: "Timing",
        body:
          "We aim to complete verified deletion requests within 30 days. We may ask for additional verification before deleting data to protect accounts from unauthorized requests.",
      },
      {
        title: "Platform Data",
        body:
          "If your data also exists in Apple, Google, Meta, WhatsApp, Stripe, RevenueCat, or another connected provider, use that provider's account or privacy controls for copies held directly by the provider. Disconnecting an integration does not delete your original emails, calendar events or messages in that provider's service.",
      },
    ],
  },
};

export default function PolicyPage({ path }) {
  const policy = POLICIES[path] || POLICIES["/privacy"];

  return (
    <main className="policy-page">
      <header className="policy-header">
        <a className="policy-brand" href="/">Repeat AI</a>
        <nav className="policy-nav" aria-label="Legal pages">
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
          <a href="/data-deletion">Data deletion</a>
        </nav>
      </header>

      <article className="policy-content">
        <p className="policy-eyebrow">{policy.eyebrow}</p>
        <h1>{policy.title}</h1>
        <p className="policy-updated">Last updated: {UPDATED_AT}</p>
        <p className="policy-intro">{policy.intro}</p>

        {policy.sections.map((section) => (
          <section className="policy-section" key={section.title}>
            <h2>{section.title}</h2>
            <p>{section.body}</p>
          </section>
        ))}
      </article>
    </main>
  );
}
