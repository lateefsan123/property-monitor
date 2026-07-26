import "./styles/policy.css";

const UPDATED_AT = "June 23, 2026";

const POLICIES = {
  "/privacy": {
    eyebrow: "Privacy",
    title: "Privacy Policy",
    intro:
      "Repeat AI is operated by Sanusi Labs to help real estate professionals manage seller pipelines, listing signals, follow-ups, and related communications.",
    sections: [
      {
        title: "Information We Collect",
        body:
          "We collect account details such as your name, email address, profile settings, subscription status, and app preferences. When you use Repeat AI, we also process seller records, lead details, imported spreadsheet data, notes, listing alerts, building watchlists, and WhatsApp connection metadata you choose to provide.",
      },
      {
        title: "How We Use Information",
        body:
          "We use information to provide the Repeat AI workspace, authenticate users, process payments, import and organize records, show listing and lead updates, send requested notifications, support WhatsApp messaging features, prevent abuse, and improve reliability.",
      },
      {
        title: "WhatsApp Data",
        body:
          "If you connect WhatsApp, Repeat AI uses approved WhatsApp Business Platform APIs to send messages you initiate or automate, receive message and delivery events, and associate those events with the relevant account or lead. We do not sell WhatsApp message data.",
      },
      {
        title: "Sharing",
        body:
          "We share information only with service providers needed to run the product, such as hosting, database, authentication, payments, analytics, and messaging infrastructure. We may disclose information when required by law or to protect the service and users.",
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
      "You can request deletion of your Repeat AI account data and connected messaging data at any time.",
    sections: [
      {
        title: "How To Request Deletion",
        body:
          "Email lateefsanusiit@gmail.com from the email address linked to your Repeat AI account with the subject line 'Repeat AI data deletion request'. Include your account email and, if relevant, the WhatsApp Business phone number or workspace affected.",
      },
      {
        title: "What We Delete",
        body:
          "We will delete or anonymize account profile data, seller records, imported spreadsheet data, lead notes, saved views, WhatsApp connection records, and related operational data unless retention is required for legal, security, billing, or dispute-resolution reasons.",
      },
      {
        title: "Timing",
        body:
          "We aim to complete verified deletion requests within 30 days. We may ask for additional verification before deleting data to protect accounts from unauthorized requests.",
      },
      {
        title: "Platform Data",
        body:
          "If your data also exists in Meta, WhatsApp, Stripe, Supabase, or another service you connected, you may need to use that provider's own account or privacy controls to delete copies held directly by that provider.",
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
