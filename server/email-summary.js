import { createHash, randomUUID } from 'node:crypto';
import { summarizeEmails } from './email-summary-model.js';

export function summaryWindow(now = Date.now()) {
  const end = new Date(now);
  end.setUTCHours(4, 0, 0, 0); // 08:00 Asia/Dubai, which does not observe DST.
  if (end.getTime() > now) end.setUTCDate(end.getUTCDate() - 1);
  return { day: end.toISOString().slice(0, 10), start: end.getTime() - 86400000, end: end.getTime() };
}
const fingerprint = rows => createHash('sha256').update(JSON.stringify(rows.map(row => [row.provider, row.summary_revision]).sort())).digest('hex');

export function createEmailSummaryService({ store, reader, apiKey, now = Date.now, summarize = summarizeEmails }) {
  async function status(userId) {
    const [connections, preference, latest] = await Promise.all([store.connections(userId), store.preference(userId), store.latest(userId)]);
    const window = summaryWindow(now());
    const matches = latest?.connection_key === fingerprint(connections);
    const current = matches && latest.summary_day === window.day;
    const expired = current && latest.status === 'processing' && Date.parse(latest.started_at) + 5 * 60000 <= now();
    const exhausted = latest?.summary_day === window.day && latest.attempts >= 2 && (!matches || expired || latest.status === 'failed');
    const summary = matches && latest?.status === 'ready' ? latest.result : null;
    return { connected: connections.length > 0, providers: connections.map(row => row.provider), enabled: preference.enabled,
      available: Boolean(apiKey), day: window.day, summary,
      status: exhausted || expired ? 'failed' : !current ? 'waiting' : latest.status,
      retryAt: current && latest.status !== 'ready' && latest.attempts < 2 ? new Date(Date.parse(latest.started_at) + (latest.status === 'processing' ? 5 : 15) * 60000).toISOString() : null,
      error: exhausted ? 'This briefing could not be completed. Your next daily briefing will try again.' : current && latest.status === 'failed' ? (latest.error_code === 'reconnect' ? 'Reconnect your email account in Settings to continue.' : 'Your email summary could not be prepared. We will try again automatically.') : null };
  }
  async function run(userId) {
    if (!apiKey) throw new Error('Email summaries unavailable');
    const connections = await store.connections(userId);
    if (!connections.length) return status(userId);
    const window = summaryWindow(now());
    const key = fingerprint(connections), runId = randomUUID();
    const claim = await store.claim(userId, window.day, key, runId);
    if (!claim) return status(userId);
    try {
      const mail = await reader({ userId, providers: connections.map(row => row.provider), ...window });
      // A disconnect/reconnect or pause while provider requests are in flight cancels AI work.
      if (fingerprint(await store.connections(userId)) !== key || !(await store.preference(userId)).enabled) {
        await store.finish(userId, runId, null, 'changed');
        return status(userId);
      }
      const summary = await summarize({ items: mail.items, apiKey });
      if (fingerprint(await store.connections(userId)) !== key || !(await store.preference(userId)).enabled) {
        await store.finish(userId, runId, null, 'changed');
        return status(userId);
      }
      await store.finish(userId, runId, { ...summary, day: window.day, generatedAt: new Date(now()).toISOString(),
        windowStart: new Date(window.start).toISOString(), windowEnd: new Date(window.end).toISOString(),
        emailCount: mail.items.length, hasMore: mail.hasMore }, null);
    } catch (error) {
      await store.finish(userId, runId, null, error.code === 'reconnect' ? 'reconnect' : 'unavailable');
    }
    return status(userId);
  }
  return {
    status, run,
    async configure(userId, enabled) {
      if (typeof enabled !== 'boolean') throw new Error('Invalid preference');
      if (enabled && (!apiKey || !(await store.connections(userId)).length)) throw new Error('Connect an email account first');
      await store.setEnabled(userId, enabled);
      return status(userId);
    },
    async drain() {
      const deadline = now() + 220000;
      let processed = 0;
      for (let batch = 0; batch < 8 && now() < deadline; batch++) {
        const due = await store.due(summaryWindow(now()).day);
        if (!due.length) break;
        for (let i = 0; i < due.length && now() < deadline; i += 5) {
          await Promise.all(due.slice(i, i + 5).map(async row => { await run(row.user_id); processed++; }));
        }
      }
      return { processed };
    },
  };
}
