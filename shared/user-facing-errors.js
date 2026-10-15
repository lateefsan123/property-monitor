// Only locally authored, explicitly marked messages may pass through unchanged.
// Backend messages are evidence for diagnostics, never UI copy.
export class UserFacingError extends Error {
  constructor(message, options) {
    super(message, options);
    this.name = 'UserFacingError';
  }
}

export function userFacingError(error, fallback = 'Something went wrong. Please try again.') {
  if (!error) return null;
  if (error instanceof UserFacingError) return error.message;
  const code = String(error?.code || '');
  const known = {
    invalid_credentials: 'The email or password is incorrect. Please try again.',
    email_not_confirmed: 'Please confirm your email address before signing in.',
    user_already_exists: 'An account already exists with this email. Try signing in.',
    weak_password: 'Choose a stronger password and try again.',
    reconnect: 'Please reconnect this account in Settings and try again.',
    oauth_scope: 'Reconnect your account and allow the requested access.',
  };
  if (Object.hasOwn(known, code)) return known[code];
  const status = Number(error?.status || error?.statusCode);
  const message = String(typeof error === 'string' ? error : error?.message || '');
  if (status === 401 || /^(PGRST30[123]|session_expired|refresh_token_not_found)$/.test(code)
    || /jwt expired|invalid refresh token/i.test(message)) return 'Your session has expired. Please sign in again and retry.';
  if (status === 403 || code === '42501') return 'You don’t have access to do this. Check that you’re signed into the right account.';
  if (status === 429 || /rate.?limit|too many requests/i.test(message)) return 'Please wait a moment, then try again.';
  if (error?.name === 'TimeoutError' || error?.name === 'AbortError' || /timeout|timed out/i.test(message)) return 'This is taking longer than expected. Please try again.';
  if (/failed to fetch|network.?error|network request failed|load failed|offline/i.test(message)) return 'We couldn’t connect. Check your internet connection and try again.';
  return fallback;
}
