export const ONBOARDING_STEPS = [
  { id: 'integrations', title: 'YOUR SELLERS.\nYOUR TOOLS. TOGETHER.', body: 'Your spreadsheets, market insights and conversations. Together.' },
  { id: 'goal', title: 'WHAT CAN WE\nHELP YOU WITH?', body: 'Choose all that apply.' },
  { id: 'sellers', title: 'EVERY SELLER.\nONE CLEAR VIEW.', body: 'Contacts, properties and follow-ups. Ready for your next conversation.' },
  { id: 'listings', title: 'SPOT THE CHANGE.\nSTART THE CONVERSATION.', body: 'Track price changes. Find the right reason to reconnect.' },
  { id: 'messages', title: 'MAKE EVERY\nMESSAGE RELEVANT.', body: 'Your message. Your image. Your WhatsApp.' },
  { id: 'schedule', title: 'STAY IN TOUCH.\nON YOUR SCHEDULE.', body: 'Choose your buildings and days. Keep the conversation going.' },
  { id: 'account', title: 'MAKE IT\nYOUR WORKSPACE.', body: '' },
  { id: 'username', title: 'WHAT SHOULD WE\nCALL YOU?', body: 'Choose the name you’ll see in Repeat AI.' },
  { id: 'finish', title: 'YOUR NEXT\nCONVERSATION STARTS HERE.', body: 'You’re ready. Let’s bring your workflow together.' },
];
export const ONBOARDING_GOALS = [
  { id: 'organise', icon: 'table', title: 'Organise my sellers', body: 'Start with an Excel or CSV spreadsheet', cta: 'Import my spreadsheet', page: 'spreadsheets', request: { add: true } },
  { id: 'market', icon: 'building', title: 'Follow the market', body: 'Explore buildings and watch price changes', cta: 'Explore listings', page: 'listing-alerts', request: { search: true } },
  { id: 'connect', icon: 'whatsapp', title: 'Stay in touch with sellers', body: 'Connect WhatsApp and plan my outreach', cta: 'Connect WhatsApp', page: 'settings', request: { section: 'WhatsApp' } },
];
export function toggleOnboardingGoal(selected, id) {
  return selected.includes(id) ? selected.filter(value => value !== id) : [...selected, id];
}
export function onboardingDestination(goalId) {
  if (Array.isArray(goalId)) {
    if (goalId.length !== 1) return { page: 'home' };
    [goalId] = goalId;
  }
  const goal = ONBOARDING_GOALS.find(item => item.id === goalId) || ONBOARDING_GOALS[0];
  return { page: goal.page, request: goal.request };
}
