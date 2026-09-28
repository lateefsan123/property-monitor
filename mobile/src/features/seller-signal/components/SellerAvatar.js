import { useState } from 'react';
import { Image, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../supabase';

export default function SellerAvatar({ userId, accountId, lead, visible, colors }) {
  const [failedUrl, setFailedUrl] = useState(null);
  const photo = useQuery({
    queryKey: ['seller-signal', 'profile-photo', userId, accountId, lead?.id, lead?.phone],
    enabled: Boolean(visible && userId && accountId && lead?.id && lead?.phone),
    staleTime: 5 * 60_000, gcTime: 5 * 60_000, retry: false,
    queryFn: async ({ signal }) => {
      const controller = new AbortController();
      const cancel = () => controller.abort();
      signal.addEventListener('abort', cancel);
      if (signal.aborted) cancel();
      const timer = setTimeout(cancel, 9000);
      try {
      const { data, error } = await supabase.functions.invoke('whatsapp-profile-photo', {
        body: { accountId, leadId: lead.id }, signal: controller.signal,
      });
      if (error) throw error;
      return typeof data?.url === 'string' && data.url.startsWith('https://') ? data.url : null;
      } finally { clearTimeout(timer); signal.removeEventListener('abort', cancel); }
    },
  });
  const url = photo.data;
  const initials = (lead?.name || '?').trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();
  return <View style={{ width: 64, height: 64, borderRadius: 32, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', marginBottom: 6, backgroundColor: colors.bgBadge }}>
    {url && url !== failedUrl ? <Image accessibilityLabel={`${lead.name || 'Seller'} WhatsApp profile photo`} source={{ uri: url }} style={{ width: 64, height: 64 }} onError={() => setFailedUrl(url)} /> : <Text style={{ color: colors.text, fontSize: 23, fontWeight: '600' }}>{initials}</Text>}
  </View>;
}
