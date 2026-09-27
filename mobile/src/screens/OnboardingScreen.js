import { useEffect, useRef, useState } from 'react';
import { BackHandler, KeyboardAvoidingView, Platform, Pressable, ScrollView, StatusBar, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import headingFont from '../../assets/fonts/Outfit-Black.ttf';
import bodyFont from '../../assets/fonts/Inter-Regular.ttf';
import buttonFont from '../../assets/fonts/Inter-SemiBold.ttf';
import AppIcon from '../components/AppIcon';
import MotionScreen from '../components/MotionScreen';
import OnboardingPreview from '../components/OnboardingPreview';
import { ONBOARDING_GOALS, ONBOARDING_STEPS, onboardingDestination, toggleOnboardingGoal } from '../onboarding-flow';
import AuthScreen from './AuthScreen';

export default function OnboardingScreen({ onComplete, onClose, preview = false, session, displayName = '', onSaveUsername, onPasswordRecovery }) {
  const { height, width } = useWindowDimensions();
  const compact = height < 740 || width < 360;
  const insets = useSafeAreaInsets();
  const [fontsLoaded] = useFonts({ OnboardingHeading: headingFont, OnboardingBody: bodyFont, OnboardingButton: buttonFont });
  const [artSize, setArtSize] = useState({ width: 0, height: 0 });
  const [step, setStep] = useState(0);
  const [goalIds, setGoalIds] = useState([]);
  const [username, setUsername] = useState(displayName);
  const [login, setLogin] = useState(false);
  const [previewAuthenticated, setPreviewAuthenticated] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);
  const slide = ONBOARDING_STEPS[step];
  const goal = goalIds.length === 1 ? ONBOARDING_GOALS.find(item => item.id === goalIds[0]) : null;
  const final = slide.id === 'finish';
  const choice = slide.id === 'goal';
  const account = slide.id === 'account';
  const nameStep = slide.id === 'username';
  const authenticated = preview ? previewAuthenticated : !!session;
  useEffect(() => {
    if (account && authenticated) {
      setUsername(displayName);
      setStep(ONBOARDING_STEPS.findIndex(item => item.id === 'username'));
    }
  }, [account, authenticated, displayName]);
  function back() {
    setError('');
    setStep(value => account && login ? 0 : Math.max(0, value - (nameStep && authenticated ? 2 : 1)));
  }
  const heading = fontsLoaded ? { fontFamily: 'OnboardingHeading', fontWeight: 'normal' } : { fontWeight: '900' };
  const body = fontsLoaded ? { fontFamily: 'OnboardingBody' } : {};
  const button = fontsLoaded ? { fontFamily: 'OnboardingButton' } : { fontWeight: '600' };
  useEffect(() => {
    const listener = BackHandler.addEventListener('hardwareBackPress', () => {
      if (lock.current) return true;
      if (step > 0) { setStep(value => account && login ? 0 : Math.max(0, value - (nameStep && authenticated ? 2 : 1))); return true; }
      if (preview && onClose) { onClose(); return true; }
      return false;
    });
    return () => listener.remove();
  }, [step, preview, onClose, nameStep, authenticated, account, login]);
  async function finish(destination) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try { await onComplete(destination); }
    catch { setError('Could not finish setup. Please try again.'); }
    finally { lock.current = false; setBusy(false); }
  }
  async function next() {
    if (lock.current) return;
    if (nameStep) {
      if (!username.trim()) { setError('Enter your username to continue.'); return; }
      lock.current = true; setBusy(true); setError('');
      try {
        if (!preview) await onSaveUsername(username.trim());
        setStep(value => value + 1);
      } catch { setError('Could not save your username. Please try again.'); }
      finally { lock.current = false; setBusy(false); }
    }
    else if (final) void finish(onboardingDestination(goalIds));
    else { if (step === 0) setLogin(false); setError(''); setStep(value => value + 1); }
  }
  return <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[s.page, { paddingTop: insets.top }]}>
    <StatusBar barStyle="dark-content" backgroundColor="#EEECE6" />
    <View style={s.header}>
      <Pressable accessibilityRole="button" accessibilityLabel="Go back" disabled={busy || step === 0} onPress={back} style={[s.headerButton, { opacity: step === 0 ? 0 : busy ? 0.4 : 1 }]}><AppIcon name="chevronBack" size={25} color="#000" /></Pressable>
      {preview ? <Pressable accessibilityRole="button" accessibilityLabel="Close onboarding preview" disabled={busy} onPress={onClose || (() => finish())} style={s.headerButton}><AppIcon name="close" size={23} color="#000" /></Pressable> : <View style={s.headerButton} />}
    </View>
    <MotionScreen key={slide.id} active>
      <View style={[s.content, compact && { paddingTop: 10, gap: 12 }]}>
        <Text accessibilityRole="header" style={[s.title, heading, compact && { fontSize: 26, lineHeight: 28 }]}>{slide.title}</Text>
        {account ? <AuthScreen embedded initialSignUp={!login} preview={preview} onPreviewComplete={() => setPreviewAuthenticated(true)} onPasswordRecovery={onPasswordRecovery} /> : nameStep ? <View style={{ flex: 1, paddingHorizontal: 24, gap: 24, paddingTop: 16 }}><Text style={[s.body, body]}>{slide.body}</Text><TextInput accessibilityLabel="Username" value={username} onChangeText={setUsername} placeholder="Your username" placeholderTextColor="#888" autoCapitalize="none" autoCorrect={false} maxLength={60} textContentType="nickname" returnKeyType="done" onSubmitEditing={next} style={{ minHeight: 58, borderWidth: 1, borderColor: '#DDD', borderRadius: 8, paddingHorizontal: 18, fontSize: 17, color: '#111' }} /></View> : choice ? <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 22, paddingBottom: 12, gap: compact ? 12 : 20 }} showsVerticalScrollIndicator={false}>
          <Text style={[s.body, body]}>{slide.body}</Text>
          {ONBOARDING_GOALS.map(item => <Pressable key={item.id} accessibilityRole="checkbox" accessibilityState={{ checked: goalIds.includes(item.id) }} aria-checked={goalIds.includes(item.id)} accessibilityLabel={item.title} onPress={() => setGoalIds(values => toggleOnboardingGoal(values, item.id))} style={({ pressed }) => [s.choice, compact && { padding: 12, minHeight: 72 }, { borderColor: goalIds.includes(item.id) ? '#000' : '#E7E7E7', backgroundColor: goalIds.includes(item.id) ? '#E3E1DA' : '#F5F3EE', opacity: pressed ? 0.7 : 1 }]}>
            <AppIcon name={item.icon} size={25} color="#000" /><Text style={[s.choiceTitle, button, { flex: 1 }]}>{item.title}</Text><View style={{ width: 22, height: 22, borderRadius: 5, borderWidth: 1.5, borderColor: goalIds.includes(item.id) ? '#000' : '#CCC', backgroundColor: goalIds.includes(item.id) ? '#000' : '#FFF', alignItems: 'center', justifyContent: 'center' }}>{goalIds.includes(item.id) ? <AppIcon name="check" size={16} color="#FFF" /> : null}</View>
          </Pressable>)}
        </ScrollView> : final ? <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 28, paddingHorizontal: 40 }}><View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: '#F2F7F3', alignItems: 'center', justifyContent: 'center' }}><AppIcon name="check" size={40} color="#298048" /></View><Text style={[s.body, body]}>{slide.body}</Text></View> : <View style={s.art} onLayout={({ nativeEvent: { layout } }) => setArtSize(previous => previous.width === layout.width && previous.height === layout.height ? previous : { width: layout.width, height: layout.height })}>
          {artSize.width > 0 && artSize.height > 0 ? <OnboardingPreview screen={slide.id} width={artSize.width} height={artSize.height} /> : null}
        </View>}
      </View>
    </MotionScreen>
    <View style={[s.footer, { paddingBottom: Math.max(insets.bottom, 10) + 10 }]}>
      {!choice && !final && !account && !nameStep ? <Text style={[s.note, body, compact && { paddingVertical: 2 }]}>{slide.body}</Text> : null}
      {error ? <Text accessibilityRole="alert" style={[s.error, body]}>{error}</Text> : null}
      {!account ? <Pressable accessibilityRole="button" disabled={busy} accessibilityState={{ disabled: busy }} onPress={next} style={({ pressed }) => [s.primary, { opacity: busy ? 0.5 : pressed ? 0.85 : 1 }]}><Text style={[s.primaryText, button]}>{busy ? 'Saving…' : final ? preview ? 'Finish preview' : goal?.cta || 'Open Repeat AI' : step === 0 ? 'Let’s get started' : 'Next'}</Text></Pressable> : null}
      {step === 0 && !session && !preview ? <Pressable accessibilityRole="button" onPress={() => { setLogin(true); setStep(ONBOARDING_STEPS.findIndex(item => item.id === 'account')); }} style={s.secondary}><Text style={[s.choiceBody, button]}>Already have an account? Log in</Text></Pressable> : null}
      {final && !preview ? <Pressable accessibilityRole="button" disabled={busy} onPress={() => finish({ page: 'home' })} style={s.secondary}><Text style={[s.choiceBody, button]}>Explore on my own</Text></Pressable> : null}
    </View>
  </KeyboardAvoidingView>;
}
const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#EEECE6' },
  header: { height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10 },
  headerButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1, minHeight: 0, paddingTop: 18, gap: 20 },
  title: { paddingHorizontal: 22, color: '#000', fontSize: 32, lineHeight: 33, letterSpacing: -0.9, textAlign: 'center' },
  art: { flex: 1, minHeight: 0, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  body: { color: '#666', fontSize: 14, lineHeight: 21, textAlign: 'center' },
  footer: { paddingHorizontal: 18, paddingTop: 12, gap: 10, backgroundColor: '#EEECE6' },
  note: { color: '#777', fontSize: 12, lineHeight: 18, textAlign: 'center', paddingVertical: 8 },
  primary: { minHeight: 54, borderRadius: 5, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  primaryText: { color: '#FFF', fontSize: 15 },
  secondary: { minHeight: 34, alignItems: 'center', justifyContent: 'center' },
  choice: { flexDirection: 'row', alignItems: 'center', gap: 13, borderWidth: 1.5, borderRadius: 12, padding: 16, minHeight: 86 },
  choiceTitle: { color: '#111', fontSize: 16 },
  choiceBody: { color: '#777', fontSize: 12, lineHeight: 18 },
  error: { color: '#B42318', textAlign: 'center', fontSize: 13 },
});
