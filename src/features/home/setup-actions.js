import { requestNewSpreadsheet } from "../../integration-resume";

// Where each setup action leads: importing opens Spreadsheets with the import
// modal, connecting opens Settings on the WhatsApp section.
export function openSetupAction(action, onNavigate) {
  if (action.id === "import") {
    requestNewSpreadsheet();
    onNavigate?.("spreadsheets");
  } else if (action.id === "watch") {
    onNavigate?.("listing-alerts");
  } else if (action.id === "schedule") {
    onNavigate?.("schedule");
  } else {
    onNavigate?.("settings", { section: "whatsapp" });
  }
}
