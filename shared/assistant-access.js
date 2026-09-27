// Verified auth.users ID for the private assistant pilot. Never authorize by
// editable profile metadata or a client-supplied email address.
export const PRIVATE_ASSISTANT_USER_ID = '441421f9-1089-4694-a66e-ab75b5459003';
export function canUsePrivateAssistant(userId) {
  return userId === PRIVATE_ASSISTANT_USER_ID;
}
