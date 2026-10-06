import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../supabase";
import { openSetupAction } from "./setup-actions";
import { fetchSetupStatus, nextSetupAction, setupChecklistQueryKey } from "../../../shared/setup-checklist";

// Turns an empty state into a next step for new accounts: import sellers,
// then connect WhatsApp. Renders nothing once both are done.
export default function SetupNextAction({ userId, onNavigate, showHint = true }) {
  const status = useQuery({
    queryKey: setupChecklistQueryKey(userId),
    enabled: Boolean(userId),
    queryFn: () => fetchSetupStatus(supabase, userId),
    staleTime: 30 * 1000,
  });
  const action = nextSetupAction(status.data);
  if (!action || !onNavigate) return null;
  return (
    <div className="setup-next">
      {showHint && <p className="home-muted">{action.hint}</p>}
      <button type="button" className="setup-next-button" onClick={() => openSetupAction(action, onNavigate)}>{action.label}</button>
    </div>
  );
}
