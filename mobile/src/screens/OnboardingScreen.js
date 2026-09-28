import SubscriptionScreen from './SubscriptionScreen';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, KeyboardAvoidingView, Platform, Pressable, ScrollView, StatusBar, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import AppIcon from '../components/AppIcon';
import MotionScreen from '../components/MotionScreen';
import OnboardingPreview, { GradientStat } from '../components/OnboardingPreview';
import { O, OnboardingNav, OnboardingSegments, PillButton, TextLink, onboardingText as t } from '../components/onboarding-ui';
import { ONBOARDING_GOALS, ONBOARDING_STEPS, onboardingDestination, toggleOnboardingGoal } from '../onboarding-flow';
import AuthScreen from './AuthScreen';
import AccessVerificationScreen from './AccessVerificationScreen';
import { pickAvatarPhoto } from '../workspace/avatar-picker';

// The product tour uses Opal's segmented progress: one segment per feature.
const FEATURES = ['sellers', 'listings', 'messages', 'schedule', 'automation'];

export default function OnboardingScreen({ onComplete, onClose, onLogin, preview = false, session, displayName = '', avatarUrl = '', onSaveProfile, onPasswordRecovery, subscription }) {
  const insets = useSafeAreaInsets();
  const [artSize, setArtSize] = useState({ width: 0, height: 0 });
  const [step, setStep] = useState(0);
  const [goalIds, setGoalIds] = useState([]);
  const [username, setUsername] = useState(displayName);
  const [photo, setPhoto] = useState(avatarUrl);
  const [photoMenu, setPhotoMenu] = useState(false);
  const [login, setLogin] = useState(false);
  const [previewAuthenticated, setPreviewAuthenticated] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);
  const slide = ONBOARDING_STEPS[step];
  const goal = goalIds.length === 1 ? ONBOARDING_GOALS.find(item => item.id === goalIds[0]) : null;
  const welcome = step === 0;
  const final = slide.id === 'finish';
  const choice = slide.id === 'goal';
  const account = slide.id === 'account';
  const nameStep = slide.id === 'username';
  const feature = FEATURES.indexOf(slide.id);
  const authenticated = preview ? previewAuthenticated : !!session;
  useEffect(() => {
    if (account && authenticated) {
      setUsername(displayName);
      setPhoto(avatarUrl);
      setStep(ONBOARDING_STEPS.findIndex(item => item.id === (displayName ? 'finish' : 'username')));
    }
  }, [account, authenticated, displayName, avatarUrl]);
  function back() {
    setError('');
    setStep(value => account && login ? 0 : Math.max(0, value - (nameStep && authenticated ? 2 : 1)));
  }
  useEffect(() => {
    const listener = BackHandler.addEventListener('hardwareBackPress', () => {
      if (account) return false;
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
  async function choosePhoto(camera) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(''); setPhotoMenu(false);
    try { const picked = await pickAvatarPhoto(camera); if (picked) setPhoto(picked); }
    catch (failure) { setError(failure?.message || 'Could not open that photo. Please try again.'); }
    finally { lock.current = false; setBusy(false); }
  }
  async function next() {
    if (lock.current) return;
    if (nameStep) {
      if (!username.trim()) { setError('Enter your name to continue.'); return; }
      lock.current = true; setBusy(true); setError(''); setPhotoMenu(false);
      try {
        if (!preview) await onSaveProfile(username.trim(), photo);
        setStep(value => value + 1);
      } catch (failure) { setError(failure?.message || 'Could not save your profile. Please try again.'); }
      finally { lock.current = false; setBusy(false); }
    }
    else if (final) void finish(onboardingDestination(goalIds));
    else { if (step === 0) setLogin(false); setError(''); setStep(value => value + 1); }
  }
  if (final && !preview && subscription?.isLoading) return <View style={[s.page, { justifyContent: 'center' }]}><ActivityIndicator accessibilityLabel="Checking your access" color={O.text} /></View>;
  if (final && !preview && subscription?.verificationError) return <AccessVerificationScreen error={subscription.verificationError} onRetry={subscription.refresh} />;
  if (final && (preview || !subscription?.hasAccess)) return <SubscriptionScreen onboarding preview={preview} hasAccess={subscription?.hasAccess}
    action={busy ? 'finish' : subscription?.action} canPurchase={subscription?.canPurchase} storeConfigured={subscription?.storeConfigured}
    priceString={subscription?.priceString || (preview ? '€35.00' : null)} trialEligible={subscription?.trialEligible}
    error={error || subscription?.error} onPurchase={subscription?.purchase} onRestore={subscription?.restore} onRefresh={subscription?.refresh}
    onBack={back} onContinue={() => finish(onboardingDestination(goalIds))} />;
  if (account) return <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[s.page, { paddingTop: insets.top }]}>
    <StatusBar barStyle="light-content" backgroundColor={O.bg} />
    <AuthScreen embedded initialSignUp={!login} preview={preview} onBack={back} onClose={onClose} onPreviewComplete={() => setPreviewAuthenticated(true)} onPasswordRecovery={onPasswordRecovery} />
  </KeyboardAvoidingView>;

  const secondary = welcome && !session && !preview ? { label: 'Already have an account?', onPress: onLogin || onClose }
    : final && !preview ? { label: 'Explore on my own', onPress: () => finish({ page: 'home' }), tone: 'muted' } : null;
  const art = <View style={s.art} onLayout={({ nativeEvent: { layout } }) => setArtSize(previous => previous.width === layout.width && previous.height === layout.height ? previous : { width: layout.width, height: layout.height })}>
    {artSize.width > 0 && artSize.height > 0 ? <OnboardingPreview screen={slide.id} width={artSize.width} height={artSize.height} /> : null}
  </View>;
  const title = <Text accessibilityRole="header" style={t.title}>{slide.title}</Text>;

  return <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[s.page, { paddingTop: insets.top }]}>
    <StatusBar barStyle="light-content" backgroundColor={O.bg} />
    <OnboardingNav onBack={welcome ? undefined : back} onClose={onClose} busy={busy} />
    {feature >= 0 ? <OnboardingSegments count={FEATURES.length} index={feature} /> : null}
    <MotionScreen key={slide.id} active>
      {welcome ? <View style={s.fill}>
        {art}
        {title}
        <Text style={t.body}>{slide.body}</Text>
      </View> : choice ? <View style={s.top}>
        {title}
        <Text style={t.hint}>{slide.body}</Text>
        <ScrollView style={s.fill} contentContainerStyle={s.options} showsVerticalScrollIndicator={false}>
          {ONBOARDING_GOALS.map(item => {
            const selected = goalIds.includes(item.id);
            return <Pressable key={item.id} accessibilityRole="checkbox" accessibilityState={{ checked: selected }} aria-checked={selected} accessibilityLabel={item.title} accessibilityHint={item.body}
              onPress={() => setGoalIds(values => toggleOnboardingGoal(values, item.id))} style={({ pressed }) => [s.option, selected && { backgroundColor: O.line }, pressed && { opacity: 0.8 }]}>
              <View style={[s.optionIcon, selected && { backgroundColor: '#2E2C2F' }]}><AppIcon name={item.icon} size={20} color={O.text} /></View>
              <Text style={s.optionText}>{item.title}</Text>
              <View style={[s.radio, selected && s.radioOn]}>{selected ? <AppIcon name="check" size={15} color="#000" /> : null}</View>
            </Pressable>;
          })}
        </ScrollView>
      </View> : slide.id === 'automation' ? <View style={[s.fill, s.center]}>
        <Text style={s.statLead}>{slide.body}</Text>
        <GradientStat value="40" size={104} />
        <Text style={s.statLead}>automated WhatsApp messages{'\n'}per day.</Text>
      </View> : nameStep ? <View style={s.top}>
        {title}
        <Text style={t.hint}>{slide.body}</Text>
        <View style={s.photoArea}>
          <Pressable accessibilityRole="button" accessibilityLabel={photo ? 'Change profile photo' : 'Add profile photo'} accessibilityState={{ expanded: photoMenu }} disabled={busy} onPress={() => setPhotoMenu(value => !value)} style={s.photo}>
            {photo ? <Image source={{ uri: photo }} contentFit="cover" style={s.photoImage} accessibilityLabel="Profile photo" /> : <AppIcon name="person" size={46} color={O.muted} />}
            <View style={s.photoBadge}><AppIcon name={photo ? 'edit' : 'plus'} size={17} color="#000" /></View>
          </Pressable>
        </View>
        {photoMenu ? <View style={s.photoMenu}>
          <View style={s.photoMenuItem}><PillButton dark compact label="Choose photo" onPress={() => choosePhoto(false)} /></View>
          {Platform.OS !== 'web' ? <View style={s.photoMenuItem}><PillButton dark compact label="Take photo" onPress={() => choosePhoto(true)} /></View> : null}
          {photo ? <View style={s.photoMenuItem}><PillButton dark compact label="Remove" onPress={() => { setPhoto(''); setPhotoMenu(false); }} /></View> : null}
        </View> : null}
        <TextInput accessibilityLabel="Name" value={username} onChangeText={setUsername} placeholder="Your name" placeholderTextColor={O.muted} autoCapitalize="words" autoCorrect={false} maxLength={80} textContentType="name" returnKeyType="done" onSubmitEditing={next} keyboardAppearance="dark" selectionColor={O.text} style={[t.input, s.nameInput]} />
      </View> : final ? <View style={[s.fill, s.center]}>
        {title}
        <Text style={t.body}>{slide.body}</Text>
      </View> : <View style={s.top}>
        {title}
        <Text style={t.lead}>{slide.body}</Text>
        {art}
      </View>}
    </MotionScreen>
    <View style={[s.footer, { paddingBottom: Math.max(insets.bottom, 16) + (secondary ? 6 : 34) }]}>
      {slide.id === 'automation' ? <Text style={s.footnote}>Sent five minutes apart, on the days and times you choose.</Text> : null}
      {error ? <Text accessibilityRole="alert" style={s.error}>{error}</Text> : null}
      <PillButton busy={busy} onPress={next} label={final ? preview ? 'Finish preview' : goal?.cta || 'Open Repeat AI' : welcome ? 'Get Started' : 'Continue'} />
      {secondary ? <View style={s.secondary}><TextLink label={secondary.label} tone={secondary.tone} disabled={busy} onPress={secondary.onPress} /></View> : null}
    </View>
  </KeyboardAvoidingView>;
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: O.bg },
  fill: { flex: 1, minHeight: 0 },
  center: { justifyContent: 'center', alignItems: 'center' },
  top: { flex: 1, minHeight: 0, paddingTop: 22 },
  art: { flex: 1, minHeight: 0, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  options: { paddingHorizontal: O.gutter, paddingTop: 28, paddingBottom: 16, gap: 12 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 64, paddingHorizontal: 12, paddingVertical: 12, borderRadius: 14, borderWidth: 1, borderColor: O.line },
  optionIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: O.line, alignItems: 'center', justifyContent: 'center' },
  optionText: { flex: 1, color: O.text, fontSize: 17 },
  radio: { width: 25, height: 25, borderRadius: 13, borderWidth: 1.5, borderColor: '#2E2C2F', backgroundColor: '#0E0C0F', alignItems: 'center', justifyContent: 'center' },
  radioOn: { backgroundColor: O.text, borderColor: O.text },
  statLead: { color: O.text, fontSize: 17, lineHeight: 23, textAlign: 'center', paddingHorizontal: 32 },
  nameInput: { marginHorizontal: O.gutter, marginTop: 24 },
  photoArea: { alignItems: 'center', marginTop: 32 },
  photo: { width: 116, height: 116, borderRadius: 58, backgroundColor: O.row, borderWidth: 1, borderColor: O.line, alignItems: 'center', justifyContent: 'center' },
  photoImage: { width: 116, height: 116, borderRadius: 58 },
  photoBadge: { position: 'absolute', right: 2, bottom: 2, width: 34, height: 34, borderRadius: 17, backgroundColor: O.text, borderWidth: 3, borderColor: O.bg, alignItems: 'center', justifyContent: 'center' },
  photoMenu: { flexDirection: 'row', gap: 8, paddingHorizontal: O.gutter, marginTop: 16 },
  photoMenuItem: { flex: 1 },
  footer: { paddingHorizontal: O.gutter, paddingTop: 12 },
  secondary: { minHeight: 56, paddingTop: 10 },
  footnote: { color: O.muted, fontSize: 12, lineHeight: 16, textAlign: 'center', marginBottom: 14 },
  error: { color: '#FF453A', textAlign: 'center', fontSize: 14, marginBottom: 10 },
});
