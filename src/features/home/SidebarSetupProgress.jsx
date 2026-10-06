import { useQuery } from "@tanstack/react-query";
import { IconChevronRight } from "@tabler/icons-react";
import { supabase } from "../../supabase";
import { buildSetupSteps, fetchSetupStatus, setupChecklistQueryKey } from "../../../shared/setup-checklist";

// HoneyBook's "Set up your account" block at the top of the sidebar (Mobbin
// 7c915d6b): title and chevron, a green progress bar, "n/3 completed". It
// stays until every step is done and opens the Setup page.
export default function SidebarSetupProgress({ userId, onNavigate }) {
  const status = useQuery({
    queryKey: setupChecklistQueryKey(userId),
    enabled: Boolean(userId),
    queryFn: () => fetchSetupStatus(supabase, userId),
    staleTime: 30 * 1000,
  });
  if (!status.data) return null;
  const { completed, total, allDone } = buildSetupSteps(status.data);
  if (allDone) return null;

  function open() {
    onNavigate?.("setup");
  }

  return (
    <button type="button" className="sidenav-setup" onClick={open} aria-label={`Set up your account, ${completed} of ${total} completed`}>
      <span className="sidenav-setup-title">
        Set up your account
        <IconChevronRight size={16} stroke={2} aria-hidden="true" />
      </span>
      <span className="sidenav-setup-bar" aria-hidden="true"><span style={{ width: `${(completed / total) * 100}%` }} /></span>
      <span className="sidenav-setup-count">{completed}/{total} completed</span>
    </button>
  );
}
