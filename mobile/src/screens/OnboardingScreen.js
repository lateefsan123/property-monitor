import { useRef, useState } from 'react';
import { PanResponder, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getTheme } from '../theme';
import AppIcon from '../components/AppIcon';
import OnboardingPreview from "../components/OnboardingPreview";

const SLIDES = [
  { title: 'Your sellers, together.', body: 'Import a spreadsheet or choose a file from Google Sheets or Excel. Keep every seller and property in one place.' },
  { title: 'Know when the market moves.', body: 'Watch buildings, follow listing prices, and bring useful market context to your next conversation.' },
  { title: 'Make follow-up a habit.', body: 'Connect WhatsApp, choose your schedule, and keep in touch with sellers with updates that matter.' },
];

export default function OnboardingScreen({ onComplete, onClose, preview = false, theme = 'light' }) {
  const colors = getTheme(theme);
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
  return <SafeAreaView style={[s.page, { backgroundColor: colors.bg }]}>
    <View style={s.header}>
      {step > 0 ? <Pressable accessibilityRole="button" accessibilityLabel="Previous step" disabled={busy} onPress={() => goTo(step - 1)} style={s.headerButton}><AppIcon name="back" color={colors.text} /></Pressable> : <Text style={{ color: colors.text, fontSize: 17, fontWeight: '700' }}>Repeat AI</Text>}
      <Pressable accessibilityRole="button" disabled={busy} onPress={preview && onClose ? onClose : finish} style={s.headerButton}><Text style={{ color: colors.textMuted, fontSize: 14 }}>{preview ? 'Close' : 'Skip'}</Text></Pressable>
    </View>
    <ScrollView ref={scroll} style={{ flex: 1 }} contentContainerStyle={s.content} showsVerticalScrollIndicator={false} {...swipe.panHandlers}>
      <View style={{ flexGrow: 1, flexShrink: 0, justifyContent: 'center', alignItems: 'center', paddingVertical: 16 }}>
        <OnboardingPreview step={step} colors={colors} />
      </View>
      <View style={s.copy} accessibilityLiveRegion="polite">
        <Text accessibilityRole="header" style={[s.title, { color: colors.textName }]}>{slide.title}</Text>
        <Text style={[s.body, { color: colors.textMuted }]}>{slide.body}</Text>
      </View>
    </ScrollView>
    <View style={s.footer}>
      <View style={s.dots}>{SLIDES.map((item, index) => <Pressable key={item.title} accessibilityRole="button" accessibilityLabel={`Step ${index + 1} of ${SLIDES.length}: ${item.title}`} accessibilityState={{ selected: step === index }} disabled={busy} onPress={() => goTo(index)} style={s.dotTarget}><View style={{ width: step === index ? 22 : 6, height: 6, borderRadius: 3, backgroundColor: step === index ? colors.text : colors.border }} /></Pressable>)}</View>
      {error ? <Text accessibilityRole="alert" style={{ color: colors.errorText, textAlign: 'center' }}>{error}</Text> : null}
      <Pressable accessibilityRole="button" disabled={busy} onPress={() => step === SLIDES.length - 1 ? finish() : goTo(step + 1)} style={[s.primary, { backgroundColor: colors.btnPrimaryBg, opacity: busy ? 0.6 : 1 }]}><Text style={{ color: colors.btnPrimaryText, fontSize: 16, fontWeight: '600' }}>{busy ? 'Please wait...' : step === SLIDES.length - 1 ? preview ? 'Done' : 'Get started' : 'Continue'}</Text></Pressable>
    </View>
  </SafeAreaView>;
}
const s = StyleSheet.create({
  page: { flex: 1 }, header: { minHeight: 56, paddingHorizontal: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerButton: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  content: { flexGrow: 1, paddingHorizontal: 26, paddingBottom: 8 },
  copy: { gap: 14, paddingTop: 20, paddingBottom: 8 },
  title: { fontSize: 30, lineHeight: 36, fontWeight: '700', letterSpacing: -0.6, textAlign: 'center' },
  body: { fontSize: 16, lineHeight: 24, textAlign: 'center' },
  footer: { paddingHorizontal: 24, paddingBottom: 20, gap: 12 },
  dots: { flexDirection: 'row', justifyContent: 'center' }, dotTarget: { minWidth: 38, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  primary: { minHeight: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 14 },
});
