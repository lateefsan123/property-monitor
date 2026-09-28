export const ONBOARDING_STEPS = [
  { id: 'integrations', title: 'Welcome to Repeat AI', body: 'Your sellers, spreadsheets and conversations, together in one place.' },
  { id: 'goal', title: 'What can we help\nyou with?', body: 'Select one or multiple' },
  { id: 'sellers', title: 'Every seller in\none clear view', body: 'Contacts, properties and follow-ups, ready for your next call.' },
  { id: 'listings', title: 'Spot the change.\nStart the conversation.', body: 'Track price drops in your buildings as they happen.' },
  { id: 'messages', title: 'Make every\nmessage relevant', body: 'Save your best messages. Personalise each one automatically.' },
  { id: 'schedule', title: 'Stay in touch on\nyour schedule', body: 'Choose your buildings and days. We’ll keep it going.' },
  { id: 'automation', title: 'Follow up automatically', body: 'Repeat AI can reach out to your sellers with up to' },
  { id: 'account', title: 'Let’s create your account', body: 'Keep your sellers and conversations together.' },
  { id: 'username', title: 'What should we\ncall you?', body: 'This is the name you’ll see in Repeat AI.' },
  { id: 'finish', title: 'You’re all set', body: 'Your next conversation\nstarts here.' },
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
// Onboarding is explicitly opened for the current session, never an install flag.
// Signing in or switching accounts leaves the tour and runs the normal access gate.
export function shouldShowOnboarding(requestedUserId, currentUserId) {
  return requestedUserId !== undefined && requestedUserId === currentUserId;
}
