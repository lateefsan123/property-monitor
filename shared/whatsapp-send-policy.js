// One manual-send rule for web and mobile. A manual message claims to be a
// today's-transaction update only when the seller actually has one today; the
// whatsapp-send-message function then verifies it and refuses a second message
// for the same market date. Everything else (recent-market follow-ups, saved
// drafts, one-off edits, custom images) is an ordinary follow-up.
export function manualSendRequiresTodaysTransaction({ customImage = false, hasTodaysTransaction = false } = {}) {
  return !customImage && Boolean(hasTodaysTransaction);
}
