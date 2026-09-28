import { dubaiDateKey } from "../../../shared/send-activity-dates";

// Before a manual WhatsApp send, ask once the account has already sent
// DAILY_SEND_WARNING messages today (Dubai time). The dialog component
// subscribes here; the send action awaits the user's answer.
export const DAILY_SEND_WARNING = 40;
const SKIP_KEY = "repeat:send-volume-skip";
let pending = null;
const listeners = new Set();

function notify() { for (const listener of listeners) listener(pending); }

export function subscribeSendVolume(listener) {
  listeners.add(listener);
  listener(pending);
  return () => listeners.delete(listener);
}

function skippedToday(userId) {
  try { return localStorage.getItem(SKIP_KEY) === `${userId}:${dubaiDateKey()}`; } catch { return false; }
}

export function answerSendVolume(send, skipRestOfDay) {
  if (!pending) return;
  const { resolve, userId } = pending;
  if (send && skipRestOfDay) {
    try { localStorage.setItem(SKIP_KEY, `${userId}:${dubaiDateKey()}`); } catch { /* Convenience only. */ }
  }
  pending = null;
  notify();
  resolve(send);
}

// Resolves true when sending should go ahead.
export function confirmSendVolume(userId, sentToday) {
  if (!Number.isFinite(sentToday) || sentToday < DAILY_SEND_WARNING || skippedToday(userId)) return Promise.resolve(true);
  if (pending) answerSendVolume(false, false);
  return new Promise((resolve) => {
    pending = { resolve, userId, sentToday };
    notify();
  });
}
