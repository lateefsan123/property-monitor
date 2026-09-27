import { useEffect, useRef, useState } from 'react';
import { BackHandler, Pressable, ScrollView, StatusBar, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import headingFont from '../../assets/fonts/Outfit-Black.ttf';
import bodyFont from '../../assets/fonts/Inter-Regular.ttf';
import buttonFont from '../../assets/fonts/Inter-SemiBold.ttf';
import AppIcon from '../components/AppIcon';
import MotionScreen from '../components/MotionScreen';
import OnboardingPreview from '../components/OnboardingPreview';
import { ONBOARDING_GOALS, ONBOARDING_STEPS, onboardingDestination } from '../onboarding-flow';

export default function OnboardingScreen({ onComplete, onClose, preview = false }) {
  const { height, width } = useWindowDimensions();
  const compact = height < 740 || width < 360;
  const insets = useSafeAreaInsets();
  const [fontsLoaded] = useFonts({ OnboardingHeading: headingFont, OnboardingBody: bodyFont, OnboardingButton: buttonFont });
  const [artSize, setArtSize] = useState({ width: 0, height: 0 });
  const [step, setStep] = useState(0);
  const [goalId, setGoalId] = useState('organise');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);
  const slide = ONBOARDING_STEPS[step];
  const goal = ONBOARDING_GOALS.find(item => item.id === goalId);
  const final = slide.id === 'finish';
  const choice = slide.id === 'goal';
  const heading = fontsLoaded ? { fontFamily: 'OnboardingHeading', fontWeight: 'normal' } : { fontWeight: '900' };
  const body = fontsLoaded ? { fontFamily: 'OnboardingBody' } : {};
  const button = fontsLoaded ? { fontFamily: 'OnboardingButton' } : { fontWeight: '600' };
  useEffect(() => {
    const listener = BackHandler.addEventListener('hardwareBackPress', () => {
      if (lock.current) return true;
      if (step > 0) { setStep(value => value - 1); return true; }
      if (preview && onClose) { onClose(); return true; }
      return false;
    });
    return () => listener.remove();
  }, [step, preview, onClose]);
  async function finish(destination) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try { await onComplete(destination); }
    catch { setError('Could not finish setup. Please try again.'); }
    finally { lock.current = false; setBusy(false); }
  }
  function next() {
    if (lock.current) return;
    if (final) void finish(onboardingDestination(goalId));
    else { setError(''); setStep(value => value + 1); }
  }
  return <View style={[s.page, { paddingTop: insets.top }]}>
    <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
    <View style={s.header}>
      <Pressable accessibilityRole="button" accessibilityLabel="Go back" disabled={busy || step === 0} onPress={() => { setError(''); setStep(value => Math.max(0, value - 1)); }} style={[s.headerButton, { opacity: step === 0 ? 0 : busy ? 0.4 : 1 }]}><AppIcon name="chevronBack" size={25} color="#000" /></Pressable>
      <Text style={[s.stepLabel, body]}>{step + 1} / {ONBOARDING_STEPS.length}</Text>
      {preview ? <Pressable accessibilityRole="button" accessibilityLabel="Close onboarding preview" disabled={busy} onPress={onClose || (() => finish())} style={s.headerButton}><AppIcon name="close" size={23} color="#000" /></Pressable> : <View style={s.headerButton} />}
    </View>
    <MotionScreen key={slide.id} active>
      <View style={[s.content, compact && { paddingTop: 10, gap: 12 }]}>
        <Text accessibilityRole="header" style={[s.title, heading, compact && { fontSize: 26, lineHeight: 28 }]}>{slide.title}</Text>
        {choice || final ? <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 22, paddingBottom: 12, gap: compact ? 12 : 20 }} showsVerticalScrollIndicator={false}>
          {!compact ? <Text style={[s.body, body]}>{slide.body}</Text> : null}
          {choice ? ONBOARDING_GOALS.map(item => <Pressable key={item.id} accessibilityRole="radio" accessibilityState={{ checked: goalId === item.id }} aria-checked={goalId === item.id} accessibilityLabel={item.title} onPress={() => setGoalId(item.id)} style={({ pressed }) => [s.choice, compact && { padding: 12, minHeight: 72 }, { borderColor: goalId === item.id ? '#000' : '#E7E7E7', backgroundColor: goalId === item.id ? '#F7F7F7' : '#FFF', opacity: pressed ? 0.7 : 1 }]}>
            <AppIcon name={item.icon} size={25} color="#000" /><View style={{ flex: 1, gap: 5 }}><Text style={[s.choiceTitle, button]}>{item.title}</Text><Text style={[s.choiceBody, body]}>{item.body}</Text></View><AppIcon name={goalId === item.id ? 'checkCircle' : 'chevron'} size={21} color={goalId === item.id ? '#000' : '#BBB'} />
          </Pressable>) : <>
            <View style={[s.startCard, compact && { padding: 12, gap: 6 }]}><Text style={[s.overline, button]}>YOUR FIRST STEP</Text><View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}><AppIcon name={goal.icon} size={26} color="#000" /><Text style={[s.choiceTitle, button, { flex: 1 }]}>{goal.title}</Text></View></View>
            {[['table', 'Bring in your sellers', 'Import a file or choose a connected spreadsheet.'], ['whatsapp', 'Connect your WhatsApp', 'Link your number when you’re ready to send.'], ['calendar', 'Make it a routine', 'Choose buildings, days and individual follow-ups.']].map(([icon, title, detail]) => <View key={title} style={{ flexDirection: 'row', gap: 13, alignItems: 'center' }}><AppIcon name={icon} size={23} color="#000" /><View style={{ flex: 1, gap: 3 }}><Text style={[s.choiceTitle, button, { fontSize: 14 }]}>{title}</Text><Text style={[s.choiceBody, body]}>{detail}</Text></View></View>)}
          </>}
        </ScrollView> : <View style={s.art} onLayout={({ nativeEvent: { layout } }) => setArtSize(previous => previous.width === layout.width && previous.height === layout.height ? previous : { width: layout.width, height: layout.height })}>
          {artSize.width > 0 && artSize.height > 0 ? <OnboardingPreview screen={slide.id} width={artSize.width} height={artSize.height} /> : null}
        </View>}
      </View>
    </MotionScreen>
    <View style={[s.footer, { paddingBottom: Math.max(insets.bottom, 10) + 10 }]}>
      {!choice && !final ? <Text style={[s.note, body, compact && { paddingVertical: 2 }]}>{slide.body}</Text> : null}
      {error ? <Text accessibilityRole="alert" style={[s.error, body]}>{error}</Text> : null}
      <Pressable accessibilityRole="button" disabled={busy} accessibilityState={{ disabled: busy }} onPress={next} style={({ pressed }) => [s.primary, { opacity: busy ? 0.5 : pressed ? 0.85 : 1 }]}><Text style={[s.primaryText, button]}>{busy ? 'Saving…' : final ? preview ? 'Finish preview' : goal.cta : step === 0 ? 'Let’s get started' : 'Next'}</Text></Pressable>
      {final && !preview ? <Pressable accessibilityRole="button" disabled={busy} onPress={() => finish({ page: 'home' })} style={s.secondary}><Text style={[s.choiceBody, button]}>Explore on my own</Text></Pressable> : null}
    </View>
  </View>;
}
const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#FFF' },
  header: { height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10 },
  headerButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  stepLabel: { color: '#888', fontSize: 12 },
  content: { flex: 1, minHeight: 0, paddingTop: 18, gap: 20 },
  title: { paddingHorizontal: 22, color: '#000', fontSize: 32, lineHeight: 33, letterSpacing: -0.9, textAlign: 'center' },
  art: { flex: 1, minHeight: 0, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  body: { color: '#666', fontSize: 14, lineHeight: 21, textAlign: 'center' },
  footer: { paddingHorizontal: 18, paddingTop: 12, gap: 10, backgroundColor: '#FFF' },
  note: { color: '#777', fontSize: 12, lineHeight: 18, textAlign: 'center', paddingVertical: 8 },
  primary: { minHeight: 54, borderRadius: 5, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  primaryText: { color: '#FFF', fontSize: 15 },
  secondary: { minHeight: 34, alignItems: 'center', justifyContent: 'center' },
  choice: { flexDirection: 'row', alignItems: 'center', gap: 13, borderWidth: 1.5, borderRadius: 12, padding: 16, minHeight: 86 },
  choiceTitle: { color: '#111', fontSize: 16 },
  choiceBody: { color: '#777', fontSize: 12, lineHeight: 18 },
  startCard: { padding: 18, borderRadius: 14, backgroundColor: '#F6F6F6', gap: 10 },
  overline: { color: '#777', fontSize: 10, letterSpacing: 1.2 },
  error: { color: '#B42318', textAlign: 'center', fontSize: 13 },
});
