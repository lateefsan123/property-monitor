import { requestNewSpreadsheet } from "../../integration-resume";

// Where each setup action leads: importing opens Spreadsheets with the import
// modal, connecting opens Settings on the WhatsApp section.
export function openSetupAction(action, onNavigate) {
  if (action.id === "import") {
    requestNewSpreadsheet();
    onNavigate?.("spreadsheets");
  } else {
    onNavigate?.("settings", { section: "whatsapp" });
  }
}

export const SETUP_HIDDEN_KEY = "home:setup-hidden";
export const SHOW_SETUP_EVENT = "repeat:show-setup-checklist";

// Lets other screens bring back a hidden Home checklist.
export function showSetupChecklist(userId) {
  try { window.localStorage.removeItem(`${SETUP_HIDDEN_KEY}:${userId}`); } catch { /* Shown for this visit only. */ }
  window.dispatchEvent(new CustomEvent(SHOW_SETUP_EVENT));
}
