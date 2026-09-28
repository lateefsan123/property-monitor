// One manual-send rule for web and mobile. A manual message claims to be a
// today's-transaction update only when the seller actually has one today; the
// whatsapp-send-message function then verifies it and refuses a second message
// for the same market date. Everything else (recent-market follow-ups, saved
// drafts, one-off edits, custom images) is an ordinary follow-up.
export function manualSendRequiresTodaysTransaction({ customImage = false, hasTodaysTransaction = false } = {}) {
  return !customImage && Boolean(hasTodaysTransaction);
}

// Opening WhatsApp outside Repeat AI, or copying a message, proves nothing was
// sent. Both clients ask first and only then record contact for these sellers.
export function handoffConfirmation(names = []) {
  const who = names.length === 1 ? (String(names[0] || "").trim() || "this seller") : `${names.length} sellers`;
  return {
    title: `Did you send it to ${who}?`,
    body: "Repeat AI marks sellers as contacted only after you confirm the message was sent.",
    confirm: "Mark as sent",
    cancel: "Not yet",
  };
}
