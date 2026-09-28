function checked({ data, error }) {
  if (error) throw new Error('Email summary storage unavailable');
  return data;
}
export function createEmailSummaryStore(db) {
  return {
    async connections(userId) {
      return checked(await db.from('integration_connections').select('provider,summary_revision').eq('user_id', userId).eq('feature', 'email')) || [];
    },
    async preference(userId) {
      return checked(await db.from('email_summary_preferences').select('enabled').eq('user_id', userId).maybeSingle()) || { enabled: false };
    },
    async setEnabled(userId, enabled) {
      checked(await db.from('email_summary_preferences').upsert({ user_id: userId, enabled }));
    },
    async latest(userId) {
      return checked(await db.from('email_daily_summaries').select('*').eq('user_id', userId).maybeSingle());
    },
    async claim(userId, day, connectionKey, runId) {
      return checked(await db.rpc('claim_email_summary', { p_user: userId, p_day: day, p_connection: connectionKey, p_run: runId }))?.[0];
    },
    async finish(userId, runId, result, errorCode) {
      checked(await db.from('email_daily_summaries').update({ status: errorCode ? 'failed' : 'ready', result, error_code: errorCode || null })
        .eq('user_id', userId).eq('run_id', runId).eq('status', 'processing'));
    },
    async due(day) {
      return checked(await db.rpc('due_email_summaries', { p_day: day })) || [];
    },
  };
}
