import { useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export function useEmailSummary({ userId, connected, request }) {
  const client = useQueryClient();
  const key = ['daily-email-summary', userId];
  const attempted = useRef('');
  const query = useQuery({
    queryKey: key,
    queryFn: ({ signal }) => request({ action: 'email_summary' }, signal, userId),
    enabled: Boolean(userId && connected), staleTime: 60000,
    refetchInterval: query => query.state.data?.status === 'processing' ? 3000 : 60000,
  });
  const generate = useMutation({
    mutationFn: async () => ({ owner: userId, data: await request({ action: 'email_summary_run' }, undefined, userId) }),
    onSuccess: ({ owner, data }) => client.setQueryData(['daily-email-summary', owner], data),
  });
  const configure = useMutation({
    mutationFn: async enabled => ({ owner: userId, data: await request({ action: 'email_summary_configure', enabled }, undefined, userId) }),
    onSuccess: ({ owner, data }) => { attempted.current = ''; client.setQueryData(['daily-email-summary', owner], data); },
  });
  const { mutate, isPending } = generate;
  useEffect(() => {
    const data = query.data;
    if (!connected || !data?.enabled || !data.available || !data.connected || isPending) return;
    const due = data.status === 'waiting' || (data.retryAt && Date.parse(data.retryAt) <= Date.now());
    const attempt = `${userId}:${data.day}:${data.status}:${data.retryAt || ''}`;
    if (due && attempted.current !== attempt) { attempted.current = attempt; mutate(); }
  }, [connected, userId, query.data, query.dataUpdatedAt, isPending, mutate]);
  const retry = () => {
    attempted.current = '';
    generate.reset();
    configure.reset();
    return query.refetch();
  };
  return { ...query, generate, configure, retry };
}
