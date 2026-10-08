// The "Get set up" checklist on web and mobile Home. Each step ticks itself off
// from real account data, and the card goes away once every step is done or skipped.
export const SETUP_STEPS = [
  {
    id: "import",
    title: "Import your sellers",
    text: "Add a spreadsheet from Excel or Google Sheets.",
    action: "Import sellers",
    time: "2 mins",
  },
  {
    id: "whatsapp",
    title: "Connect your WhatsApp",
    text: "Link your number so follow-ups go out from you.",
    action: "Connect WhatsApp",
    time: "1 min",
  },
  {
    id: "schedule",
    title: "Choose your follow-up days",
    text: "Pick which buildings Repeat messages on each day of the week.",
    action: "Set schedule",
    time: "2 mins",
  },
  {
    id: "watch",
    title: "Watch a listing",
    text: "Follow a building or listing to get price-drop alerts.",
    action: "Find listings",
    time: "1 min",
  },
  {
    id: "first-message",
    title: "Send your first follow-up",
    text: "Repeat sends sale updates automatically, up to 40 a day. You can also message any seller yourself.",
    action: "View sellers",
    time: "1 min",
  },
];

export function setupChecklistQueryKey(userId) {
  return ["home", "setup-checklist", userId];
}

// Steps people can skip if they don't need the feature. Importing and
// connecting WhatsApp are what Repeat runs on, so they can't be skipped.
export const SKIPPABLE_STEPS = new Set(["schedule", "watch", "first-message"]);

// Hiding the card and skipped steps are saved on the account (Auth user
// metadata), so they hold on every device and after signing in again.
export function setupPreferences(user) {
  const meta = user?.user_metadata || {};
  return {
    hidden: meta.setup_hidden === true,
    skipped: Array.isArray(meta.setup_skipped) ? meta.setup_skipped.filter((id) => SKIPPABLE_STEPS.has(id)) : [],
  };
}

export async function saveSetupPreferences(supabase, { hidden, skipped }) {
  const data = {};
  if (hidden !== undefined) data.setup_hidden = Boolean(hidden);
  if (skipped !== undefined) data.setup_skipped = skipped;
  const { error } = await supabase.auth.updateUser({ data });
  if (error) throw new Error(error.message);
}

// Updates the cached status straight away, then saves; refetches if saving fails.
export async function updateSetupPreferences(queryClient, supabase, userId, patch) {
  const key = setupChecklistQueryKey(userId);
  queryClient.setQueryData(key, (current) => (current ? { ...current, ...patch } : current));
  try {
    await saveSetupPreferences(supabase, patch);
  } catch {
    queryClient.invalidateQueries({ queryKey: key });
  }
}

export function buildSetupSteps({ leadCount = 0, whatsappConnected = false, scheduled = false, watching = false, messageSent = false, skipped = [] } = {}) {
  const done = { import: leadCount > 0, whatsapp: Boolean(whatsappConnected), schedule: Boolean(scheduled), watch: Boolean(watching), "first-message": Boolean(messageSent) };
  const steps = SETUP_STEPS.map((step) => ({
    ...step,
    done: done[step.id],
    skippable: SKIPPABLE_STEPS.has(step.id),
    skipped: !done[step.id] && SKIPPABLE_STEPS.has(step.id) && skipped.includes(step.id),
  }));
  const completed = steps.filter((step) => step.done || step.skipped).length;
  return { steps, completed, total: steps.length, allDone: completed === steps.length };
}

export async function fetchSetupStatus(supabase, userId) {
  if (!userId) return { leadCount: 0, whatsappConnected: false, scheduled: false, watching: false, messageSent: false, hidden: false, skipped: [] };
  const [leads, accounts, schedule, buildings, listings, messages, auth] = await Promise.all([
    supabase.from("leads").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("whatsapp_accounts").select("id").eq("user_id", userId).eq("connection_status", "connected").limit(1),
    supabase.from("seller_signal_building_schedules").select("days").eq("user_id", userId).maybeSingle(),
    supabase.from("listing_alerts_watchlists").select("location_id").eq("user_id", userId).limit(1),
    supabase.from("listing_alerts_tracked_listings").select("listing_id").eq("user_id", userId).limit(1),
    supabase.from("whatsapp_messages").select("id").eq("user_id", userId).eq("direction", "outbound").limit(1),
    supabase.auth.getUser(),
  ]);
  const failure = leads.error || accounts.error || schedule.error || buildings.error || listings.error || messages.error;
  if (failure) throw new Error(failure.message);
  return {
    leadCount: leads.count || 0,
    whatsappConnected: (accounts.data || []).length > 0,
    scheduled: Object.values(schedule.data?.days || {}).some((names) => Array.isArray(names) && names.length > 0),
    watching: (buildings.data || []).length > 0 || (listings.data || []).length > 0,
    messageSent: (messages.data || []).length > 0,
    ...setupPreferences(auth?.data?.user),
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
