export function isSessionOwner(session, authInfo) {
  const userId = authInfo?.extra?.userId;
  return typeof userId === "string" && Boolean(userId.trim()) &&
    session.userId === userId && session.clientId === authInfo.clientId;
}
