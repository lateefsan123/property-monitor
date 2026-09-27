// Confirmed account ID from Auth. Email/profile edits cannot grant this access.
const UNLIMITED_USER_ID = "441421f9-1089-4694-a66e-ab75b5459003";

export function complimentaryAccess(user) {
  if (user?.id !== UNLIMITED_USER_ID) return null;
  return {
    source: "complimentary",
    status: "active",
    unlimited: true,
    // Preserve the lifetime shape understood by already-released mobile clients.
    current_period_end: "9999-12-31T23:59:59.000Z",
    raw: { livemode: true },
    cancel_at_period_end: false,
    amount: 0,
  };
}
