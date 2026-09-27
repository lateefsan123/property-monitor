import { useRef, useState } from 'react';
import { PanResponder, Pressable, ScrollView, StatusBar, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import OnboardingPreview from "../components/OnboardingPreview";

const SLIDES = [
  { title: 'Bring everything together', body: 'Connect spreadsheets, WhatsApp, and more\nfor a clearer view of your sellers' },
  { title: 'Your sellers, in one place', body: 'Import your spreadsheet and keep every\nseller and property within reach' },
  { title: 'Follow the market', body: 'Watch your buildings and track price changes\nfor your next conversation' },
  { title: 'Stay in touch', body: 'Follow the market and stay in touch\nwith the sellers who matter' },
];

export default function OnboardingScreen({ onComplete, onClose, preview = false }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const artHeight = Math.max(220, Math.min(height * 0.622, height - (width < 360 ? 330 : 300)));
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);
  const scroll = useRef(null);
  function goTo(index) {
    if (lock.current) return;
    setStep(Math.max(0, Math.min(SLIDES.length - 1, index)));
    scroll.current?.scrollTo({ y: 0, animated: false });
  }
  async function finish() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    try { await onComplete(); }
    catch { setError('Could not finish the tour. Please try again.'); }
    finally { lock.current = false; setBusy(false); }
  }
  const swipe = PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 25 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 2,
    onPanResponderRelease: (_, gesture) => { if (Math.abs(gesture.dx) > 45) goTo(step + (gesture.dx < 0 ? 1 : -1)); },
  });
  const slide = SLIDES[step];
  return <View style={s.page}>
    <StatusBar barStyle="light-content" />
    <ScrollView ref={scroll} style={{ flex: 1 }} contentContainerStyle={s.content} showsVerticalScrollIndicator={false} {...swipe.panHandlers}>
      <OnboardingPreview step={step} width={width} height={artHeight} />
      <View style={[s.copy, width < 360 && { paddingTop: 24 }]} accessibilityLiveRegion="polite">
        <Text accessibilityRole="header" style={[s.title, width < 360 && { fontSize: 24, lineHeight: 29 }]}>{slide.title}</Text>
        <Text style={[s.body, width < 360 && { fontSize: 14, lineHeight: 20 }]}>{slide.body}</Text>
      </View>
    </ScrollView>
    <View style={[s.footer, { paddingBottom: Math.max(insets.bottom + 16, height * 0.057) }]}>
      <View style={s.dots}>{SLIDES.map((item, index) => <Pressable key={item.title} accessibilityRole="button" accessibilityLabel={`Step ${index + 1} of ${SLIDES.length}: ${item.title}`} accessibilityState={{ selected: step === index }} disabled={busy} onPress={() => goTo(index)} style={s.dotTarget}><View style={{ width: step === index ? 22 : 7, height: 7, borderRadius: 4, backgroundColor: step === index ? '#f6f5f6' : '#373539' }} /></Pressable>)}</View>
      {error ? <Text accessibilityRole="alert" style={{ color: '#ff9e9e', textAlign: 'center' }}>{error}</Text> : null}
      <View style={s.actions}>
        <Pressable accessibilityRole="button" disabled={busy} onPress={finish} style={[s.primary, { opacity: busy ? 0.6 : 1 }]}><Text style={s.primaryText}>{busy ? 'Please wait...' : preview ? 'Done' : 'Get Started'}</Text></Pressable>
        <Pressable accessibilityRole="button" disabled={busy} onPress={preview && onClose ? onClose : finish} style={s.secondary}><Text style={s.secondaryText}>{preview ? 'Close' : 'Log In'}</Text></Pressable>
      </View>
    </View>
  </View>;
}
const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#000' },
  content: { flexGrow: 1 },
  copy: { gap: 14, paddingTop: 46, paddingBottom: 12, paddingHorizontal: 24 },
  title: { color: '#f7f6f7', fontSize: 28, lineHeight: 34, fontWeight: '700', letterSpacing: -0.6, textAlign: 'center' },
  body: { color: '#c0bcc2', fontSize: 16, lineHeight: 21, textAlign: 'center' },
  footer: { paddingHorizontal: 24, gap: 10 },
  dots: { flexDirection: 'row', justifyContent: 'center' }, dotTarget: { minWidth: 26, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row', gap: 12 },
  primary: { flex: 1, backgroundColor: '#f6f5f6', minHeight: 54, borderRadius: 28, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, paddingVertical: 14 },
  primaryText: { color: '#080808', fontSize: 16, fontWeight: '500' },
  secondary: { backgroundColor: '#111013', borderWidth: 1, borderColor: '#242126', minWidth: 94, minHeight: 54, borderRadius: 28, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  secondaryText: { color: '#f5f3f6', fontSize: 16, fontWeight: '500' },
});
