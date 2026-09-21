export const TOUR_STEPS = [
  { id: "welcome", title: "Here's a tour of your workspace", description: "Let’s go over the essentials of Repeat AI so you can get started quickly.", image: "product-spreadsheets-mobile-colour-v3.png", page: "home", target: ".app-crumb-home" },
  { id: "spreadsheets", title: "Bring your spreadsheets together", description: "Open Spreadsheets and use + to import a file. Keep your seller lists together and review the columns before importing.", image: "product-spreadsheets-mobile-colour-v3.png", page: "spreadsheets", target: ".sheet-topbar-new-btn" },
  { id: "sellers", title: "Get to know your sellers", description: "Open a seller to review their details, keep notes and track your next conversation. Use search and filters to find who you need.", image: "product-seller-story-mobile-colour-v2.png", page: "sellers", target: ".app-crumb-page" },
  { id: "listings", title: "Keep an eye on your buildings", description: "Open Listings to browse buildings and their listings. Review price changes to spot a reason to follow up.", image: "product-market-story-colour-v2.png", page: "listing-alerts", target: ".app-crumb-page" },
  { id: "templates", title: "Make your messages your own", description: "Open Message templates from the navigation. Edit your message and broker card, then choose the template you want to use.", image: "product-templates-story-mobile-clean-v4.png", page: "sellers", action: "message-template", target: ".app-topbar-toggle", cta: "Open templates" },
  { id: "whatsapp", title: "Connect WhatsApp", description: "Open Settings to connect WhatsApp and review your follow-up preferences. Check your recipients and message before sending.", image: "product-followups-story-mobile-colour-v2.png", page: "sellers", action: "settings", target: ".app-topbar-toggle", cta: "Open settings" },
  { id: "ask-repeat", title: "Talk or type to Ask Repeat", description: "Open Ask Repeat at the bottom-right. Try “What sold in Forte 2 last month?” or ask about Bayut asking prices and your sellers. Read the source and dates on the results. AI access is currently limited to approved accounts.", image: "product-assistant-sales-v1.png", page: "home", target: ".assistant-launcher" },
  { id: "assistant-actions", title: "You’re always in control", description: "Ask for a seller note, message template or follow-up automation change. You can also prepare email with a connected account. Review the preview and confirm before anything is saved, changed or sent.", image: "product-assistant-actions-v1.png", page: "home", target: ".assistant-launcher" },
  { id: "done", title: "You're ready to get started", description: "Start with a spreadsheet or explore your sellers. You can reopen this tour from the bottom-right whenever you need a refresher.", image: "product-followups-story-mobile-colour-v2.png", page: "home", target: ".app-crumb-home" },
];

export function readTourState(storage, userId) {
  if (!userId) return { step: 0, open: false };
  try {
    const value = JSON.parse(storage.getItem(`repeat:product-tour:v1:${userId}`));
    if (value?.stepId) {
      const step = TOUR_STEPS.findIndex(item => item.id === value.stepId);
      if (step >= 0) return { step, open: false };
    } else if (value && Number.isInteger(value.step) && value.step >= 0 && value.step <= 6) {
      // Existing seven-step tours keep their completed/dismissed state.
      return { step: value.step === 6 ? TOUR_STEPS.length - 1 : value.step, open: false };
    }
  } catch { /* A blocked or corrupt store must not prevent using the app. */ }
  return { step: 0, open: true };
}

export function saveTourState(storage, userId, step) {
  if (!userId) return;
  try { storage.setItem(`repeat:product-tour:v1:${userId}`, JSON.stringify({ step, stepId: TOUR_STEPS[step]?.id })); } catch { /* Keep working in memory. */ }
}
