import { useQuery, useQueryClient } from '@tanstack/react-query';
import { integrationRequest } from '../workspace/integration-client';
import { connectOutreachGmail, outreachRequest } from './client';

export const outreachQueryKey = userId => ['outreach', 'campaign', userId];

// What each contact status means to the person reading the list.
const STATUS_LABELS = {
  pending: 'Not contacted', sending: 'Sending', sent: 'In sequence', done: 'Finished',
  held: 'Needs review', excluded: 'Excluded', replied: 'Replied', bounced: 'Bounced',
};
export const contactStatusLabel = status => STATUS_LABELS[status] || String(status || '').replace(/_/g, ' ').replace(/^./, c => c.toUpperCase());

// The campaign (status, counts, first 30 contacts, templates) and the Gmail
// connection, shared by every outreach screen.
export function useOutreach(userId) {
  const client = useQueryClient();
  const campaign = useQuery({
    queryKey: outreachQueryKey(userId),
    queryFn: ({ signal }) => outreachRequest(userId, { action: 'status' }, signal).then(result => result.campaign),
    enabled: Boolean(userId),
  });
  // Same query (and cache key) as src/integration-query.js, kept here so the
  // outreach bundle only needs mobile/ and shared/.
  const connections = useQuery({
    queryKey: ['integration-connections', userId],
    queryFn: async ({ signal }) => {
      const result = await integrationRequest({ action: 'status' }, signal, userId);
      if (!Array.isArray(result.connections)) throw new Error('Could not load connections. Please retry.');
      return result.connections;
    },
    enabled: Boolean(userId),
    staleTime: 60_000,
  });
  const gmail = connections.data?.find(item => item.provider === 'google' && item.feature === 'email');
  async function run(body) {
    const result = await outreachRequest(userId, body);
    if (result?.campaign) client.setQueryData(outreachQueryKey(userId), result.campaign);
    return result;
  }
  async function connect() {
    await connectOutreachGmail(userId);
    await connections.refetch();
  }
  return {
    campaign, connections, run, connect,
    gmailConnected: Boolean(gmail?.connected && gmail?.canSend),
    refresh: () => Promise.all([campaign.refetch(), connections.refetch()]),
  };
}
