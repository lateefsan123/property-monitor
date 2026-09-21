export const EXTRA_SCOPES = {
  google: { send: ['https://www.googleapis.com/auth/gmail.send'] },
  microsoft: { send: ['Mail.Send'], workbook: ['Files.ReadWrite'] },
};

export function includesScopes(provider, granted, required) {
  const normalize = scope => provider === 'microsoft'
    ? scope.replace(/^https:\/\/graph\.microsoft\.com\//i, '').toLowerCase() : scope;
  const scopes = new Set((granted || []).map(normalize));
  return Boolean(required?.every(scope => scope === 'offline_access' || scopes.has(normalize(scope))));
}
