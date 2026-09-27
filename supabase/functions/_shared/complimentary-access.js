// Confirmed account ID from Auth. Email/profile edits cannot grant this access.
const UNLIMITED_USER_ID = "441421f9-1089-4694-a66e-ab75b5459003";

export function complimentaryAccess(user) {
  if (user?.id !== UNLIMITED_USER_ID) return null;
  return {
    source: "complimentary",
    status: "active",
    unlimited: true,
    current_period_end: null,
    cancel_at_period_end: false,
    amount: 0,
  };
}
