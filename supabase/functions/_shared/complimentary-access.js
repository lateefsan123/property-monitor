// Confirmed account ID from Auth. Email/profile edits cannot grant this access.
const UNLIMITED_USER_ID = "441421f9-1089-4694-a66e-ab75b5459003";
// Dedicated review accounts. These grants expire automatically and cannot
// be claimed through profile metadata.
const REVIEW_ACCESS_END = new Map([
  ["50b2ccdb-5bff-4bd4-a97a-9aa12744fae0", "2026-12-31T23:59:59.000Z"],
  ["b53185df-f9d2-417b-ac17-e91e84b00186", "2026-10-06T23:59:59.000Z"],
  ["681e8cae-2326-4045-b7bf-9f6458a06e01", "2026-12-31T23:59:59.000Z"],
]);

export function complimentaryAccess(user, now = Date.now()) {
  const isOwner = user?.id === UNLIMITED_USER_ID;
  const reviewEnd = REVIEW_ACCESS_END.get(user?.id);
  if (!isOwner && !(Date.parse(reviewEnd) > now)) return null;
  return {
    source: "complimentary",
    status: "active",
    unlimited: isOwner,
    // Preserve the lifetime shape understood by already-released mobile clients.
    current_period_end: isOwner ? "9999-12-31T23:59:59.000Z" : reviewEnd,
    raw: { livemode: true },
    cancel_at_period_end: false,
    amount: 0,
  };
}
