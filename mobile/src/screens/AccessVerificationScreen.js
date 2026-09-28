import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

export default function AccessVerificationScreen({ error, onRetry, onSignOut }) {
  const [pending, setPending] = useState(false);
  async function retry() {
    if (pending) return;
    setPending(true);
    try { await onRetry(); } finally { setPending(false); }
  }
  return <View style={{ flex: 1, backgroundColor: '#FFF', justifyContent: 'center', padding: 32, gap: 24 }}>
    <Text accessibilityRole="alert" style={{ color: '#111', fontSize: 16, textAlign: 'center' }}>{error}</Text>
    <Pressable accessibilityRole="button" disabled={pending} onPress={retry} style={{ backgroundColor: '#111', borderRadius: 12, padding: 18, alignItems: 'center' }}>
      {pending ? <ActivityIndicator color="#FFF" /> : <Text style={{ color: '#FFF', fontWeight: '600' }}>Try again</Text>}
    </Pressable>
    {onSignOut ? <Pressable accessibilityRole="button" onPress={onSignOut} style={{ padding: 16, alignItems: 'center' }}><Text style={{ color: '#555' }}>Sign out</Text></Pressable> : null}
  </View>;
}
