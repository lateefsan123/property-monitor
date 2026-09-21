export const TOUR_STEPS = [
  { title: "Here's a tour of your workspace", description: "Let’s go over the essentials of Repeat AI so you can get started quickly.", image: "product-spreadsheets-mobile-colour-v3.png", page: "home", target: ".app-crumb-home" },
  { title: "Bring your spreadsheets together", description: "Open Spreadsheets and use + to import a file. Keep your seller lists together and review the columns before importing.", image: "product-spreadsheets-mobile-colour-v3.png", page: "spreadsheets", target: ".sheet-topbar-new-btn" },
  { title: "Get to know your sellers", description: "Open a seller to review their details, keep notes and track your next conversation. Use search and filters to find who you need.", image: "product-seller-story-mobile-colour-v2.png", page: "sellers", target: ".app-crumb-page" },
  { title: "Keep an eye on your buildings", description: "Open Listings to browse buildings and their listings. Review price changes to spot a reason to follow up.", image: "product-seller-story-mobile-colour-v2.png", page: "listing-alerts", target: ".app-crumb-page" },
  { title: "Make your messages your own", description: "Open Message templates from the navigation. Edit your message and broker card, then choose the template you want to use.", image: "product-templates-story-mobile-clean-v4.png", page: "sellers", action: "message-template", target: ".app-topbar-toggle", cta: "Open templates" },
  { title: "Connect WhatsApp", description: "Open Settings to connect WhatsApp and review your follow-up preferences. Check your recipients and message before sending.", image: "product-followups-story-mobile-colour-v2.png", page: "sellers", action: "settings", target: ".app-topbar-toggle", cta: "Open settings" },
  { title: "You're ready to get started", description: "Start with a spreadsheet or explore your sellers. You can reopen this tour from the bottom-right whenever you need a refresher.", image: "product-followups-story-mobile-colour-v2.png", page: "home", target: ".app-crumb-home" },
];

export function readTourState(storage, userId) {
  if (!userId) return { step: 0, open: false };
  try {
    const value = JSON.parse(storage.getItem(`repeat:product-tour:v1:${userId}`));
    if (value && Number.isInteger(value.step) && value.step >= 0 && value.step < TOUR_STEPS.length) return { step: value.step, open: false };
  } catch { /* A blocked or corrupt store must not prevent using the app. */ }
  return { step: 0, open: true };
}

export function saveTourState(storage, userId, step) {
  if (!userId) return;
  try { storage.setItem(`repeat:product-tour:v1:${userId}`, JSON.stringify({ step })); } catch { /* Keep working in memory. */ }
}
