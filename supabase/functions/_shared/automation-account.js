// Verified account ID, not a user-editable profile flag or email claim.
// Keep the database constraint in automation_account_video_templates in sync.
export const AUTOMATION_ACCOUNT_ID = '231dbddd-efae-45b6-99ce-a72d68c32043';
export const isAutomationAccount = (userId) => userId === AUTOMATION_ACCOUNT_ID;
export const AUTOMATION_MESSAGE_TEMPLATE = "Hi {{name}}, Lateef here from Repeat AI. Repeat AI follows up with your sellers on WhatsApp using personalised messages and recent sales in their building. Take a look at https://repeatai.org, and I'm happy to help you get set up. If it's not for you, just let me know.";

export function requiresTransactionToken({ userId, isDefault, statuses = [] }) {
  return !isAutomationAccount(userId) && (isDefault || !(statuses || []).some((id) => String(id).startsWith('custom:')));
}
