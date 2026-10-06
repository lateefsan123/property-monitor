// The "Get set up" checklist on web and mobile Home. Each step ticks itself off
// from real account data, and the card goes away once all three are done.
export const SETUP_STEPS = [
  {
    id: "import",
    title: "Import your sellers",
    text: "Add a spreadsheet from Excel or Google Sheets.",
    action: "Import sellers",
  },
  {
    id: "whatsapp",
    title: "Connect your WhatsApp",
    text: "Link your number so follow-ups go out from you.",
    action: "Connect WhatsApp",
  },
  {
    id: "first-message",
    title: "Send your first follow-up",
    text: "Repeat sends sale updates automatically, up to 40 a day. You can also message any seller yourself.",
    action: "View sellers",
  },
];

export function setupChecklistQueryKey(userId) {
  return ["home", "setup-checklist", userId];
}

export function buildSetupSteps({ leadCount = 0, whatsappConnected = false, messageSent = false } = {}) {
  const done = { import: leadCount > 0, whatsapp: Boolean(whatsappConnected), "first-message": Boolean(messageSent) };
  const steps = SETUP_STEPS.map((step) => ({ ...step, done: done[step.id] }));
  const completed = steps.filter((step) => step.done).length;
  return { steps, completed, total: steps.length, allDone: completed === steps.length };
}

export async function fetchSetupStatus(supabase, userId) {
  if (!userId) return { leadCount: 0, whatsappConnected: false, messageSent: false };
  const [leads, accounts, messages] = await Promise.all([
    supabase.from("leads").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("whatsapp_accounts").select("id").eq("user_id", userId).eq("connection_status", "connected").limit(1),
    supabase.from("whatsapp_messages").select("id").eq("user_id", userId).eq("direction", "outbound").limit(1),
  ]);
  const failure = leads.error || accounts.error || messages.error;
  if (failure) throw new Error(failure.message);
  return {
    leadCount: leads.count || 0,
    whatsappConnected: (accounts.data || []).length > 0,
    messageSent: (messages.data || []).length > 0,
  };
}

// The first unfinished step that needs the user (importing or connecting), or
// null. Empty states use it to offer one clear next action.
export function nextSetupAction(status) {
  if (!status) return null;
  if (!(status.leadCount > 0)) return { id: "import", label: "Import your sellers", hint: "Add a spreadsheet to bring your sellers into Repeat." };
  if (!status.whatsappConnected) return { id: "whatsapp", label: "Connect WhatsApp", hint: "Link your number and Repeat starts following up for you." };
  return null;
}
