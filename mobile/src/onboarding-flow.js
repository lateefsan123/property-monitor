export const ONBOARDING_STEPS = [
  { id: 'integrations', title: 'YOUR SELLERS.\nYOUR TOOLS. TOGETHER.', body: 'Bring your spreadsheets, WhatsApp and follow-ups into one place. Spend less time switching. More time connecting.' },
  { id: 'goal', title: 'WHAT WOULD YOU\nLIKE TO DO FIRST?', body: 'Choose a starting point. We’ll take you there after the tour.' },
  { id: 'sellers', title: 'EVERY SELLER.\nONE CLEAR VIEW.', body: 'Import your spreadsheet. Keep contacts, properties, notes and follow-ups together, ready for your next conversation.' },
  { id: 'listings', title: 'SPOT THE CHANGE.\nSTART THE CONVERSATION.', body: 'Watch your buildings and track listing price changes. Find a relevant reason to get back in touch.' },
  { id: 'messages', title: 'MAKE EVERY\nMESSAGE RELEVANT.', body: 'Preview your message, choose an image and reach sellers through your connected WhatsApp account.' },
  { id: 'schedule', title: 'STAY IN TOUCH.\nON YOUR SCHEDULE.', body: 'Choose buildings and sending days. Set individual follow-ups so the next conversation stays on your radar.' },
  { id: 'finish', title: 'YOUR NEXT\nCONVERSATION STARTS HERE.', body: 'Start with one simple step. Connect your tools and build your workflow as you go.' },
];
export const ONBOARDING_GOALS = [
  { id: 'organise', icon: 'table', title: 'Organise my sellers', body: 'Start with an Excel or CSV spreadsheet', cta: 'Import my spreadsheet', page: 'spreadsheets', request: { add: true } },
  { id: 'market', icon: 'building', title: 'Follow the market', body: 'Explore buildings and watch price changes', cta: 'Explore listings', page: 'listing-alerts', request: { search: true } },
  { id: 'connect', icon: 'whatsapp', title: 'Stay in touch with sellers', body: 'Connect WhatsApp and plan my outreach', cta: 'Connect WhatsApp', page: 'settings', request: { section: 'WhatsApp' } },
];
export function onboardingDestination(goalId) {
  const goal = ONBOARDING_GOALS.find(item => item.id === goalId) || ONBOARDING_GOALS[0];
  return { page: goal.page, request: goal.request };
}
