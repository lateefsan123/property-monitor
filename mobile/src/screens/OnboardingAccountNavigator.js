import googleLogo from '../../assets/google-logo.png';
import * as AppleAuthentication from 'expo-apple-authentication';
import { NavigationContainer, NavigationIndependentTree, useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { BackHandler, Image, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppIcon from '../components/AppIcon';
import { O, OnboardingNav, PillButton, TextLink, onboardingText as t } from '../components/onboarding-ui';
import useReducedMotion from '../components/use-reduced-motion';

const Stack = createNativeStackNavigator();
// Signup and Login follow Opal's account screen: the email form first, then
// "or" and the provider pills. Reset and CheckEmail keep their own routes.
const pages = {
  Signup: { title: 'Let’s create your account', body: 'All your sellers, in one place.' },
  Login: { title: 'Log in with email', body: 'Pick up where you left off.' },
  Reset: { title: 'Reset your password', body: 'Enter your email and we’ll send you a reset link.' },
  CheckEmail: { title: 'Check your email', body: '' },
};

function Providers({ auth }) {
  return <>
    <View style={s.or}><View style={s.orLine} /><Text style={s.orText}>or</Text><View style={s.orLine} /></View>
    <PillButton dark compact disabled={auth.pending} onPress={auth.onGoogle} label="Continue with Google" icon={<Image source={googleLogo} style={{ width: 18, height: 18 }} resizeMode="contain" accessible={false} />} />
    {auth.appleAvailable && Platform.OS === 'ios' ? <View pointerEvents={auth.pending ? 'none' : 'auto'} style={[s.apple, auth.pending && { opacity: 0.45 }]}>
      <AppleAuthentication.AppleAuthenticationButton buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK} buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE} cornerRadius={24} style={{ height: 46, width: '100%' }} onPress={auth.onApple} />
    </View> : auth.preview ? <PillButton dark compact disabled={auth.pending} onPress={auth.onApple} label="Continue with Apple" icon={<AppIcon name="apple" size={18} color={O.text} />} /> : null}
  </>;
}

function AccountPage({ navigation, route, auth }) {
  const insets = useSafeAreaInsets();
  const name = route.name;
  const reset = name === 'Reset';
  const signup = name === 'Signup';
  const form = name !== 'CheckEmail';
  function leave() {
    auth.clearError();
    if (navigation.canGoBack()) navigation.goBack(); else auth.onBack();
  }
  useFocusEffect(useCallback(() => {
    const listener = BackHandler.addEventListener('hardwareBackPress', () => {
      if (auth.pending) return true;
      auth.clearError();
      if (navigation.canGoBack()) navigation.goBack(); else auth.onBack();
      return true;
    });
    return () => listener.remove();
  }, [navigation, auth]));
  function go(screen) { auth.clearError(); navigation.navigate(screen); }
  async function submit() {
    const notice = await auth.onEmail(reset ? 'reset' : signup ? 'signup' : 'login');
    if (notice) navigation.navigate('CheckEmail', { notice });
  }
  const ready = auth.preview || (auth.email.trim() && (reset || auth.password));
  return <View style={s.page}>
    <OnboardingNav onBack={leave} onClose={auth.onClose} busy={auth.pending} />
    <ScrollView contentContainerStyle={[s.content, { paddingBottom: Math.max(16, insets.bottom) }]} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets showsVerticalScrollIndicator={false}>
      <Text accessibilityRole="header" style={t.title}>{pages[name].title}</Text>
      <Text style={t.lead}>{form ? pages[name].body : route.params?.notice}</Text>
      <View style={s.stack}>
        {auth.error ? <Text accessibilityRole="alert" style={s.error}>{auth.error}</Text> : null}
        {form ? <>
          <TextInput accessibilityLabel="Email" style={t.input} placeholder="Your email" placeholderTextColor={O.muted} value={auth.email} onChangeText={auth.setEmail} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" autoComplete="email" keyboardAppearance="dark" selectionColor={O.text} />
          {!reset ? <TextInput accessibilityLabel="Password" style={t.input} placeholder={signup ? 'Create a password' : 'Your password'} placeholderTextColor={O.muted} value={auth.password} onChangeText={auth.setPassword} autoCapitalize="none" autoCorrect={false} secureTextEntry textContentType={signup ? 'newPassword' : 'password'} keyboardAppearance="dark" selectionColor={O.text} /> : null}
          <View style={{ height: 4 }} />
          <PillButton compact busy={auth.pending} disabled={!ready} onPress={submit} label={reset ? 'Send reset link' : signup ? 'Create account' : 'Log in'} />
          {name === 'Login' ? <TextLink tone="muted" label="Forgot password?" disabled={auth.pending} onPress={() => go('Reset')} /> : null}
          {!reset ? <Providers auth={auth} /> : null}
          {signup ? <TextLink tone="muted" label="Already have an account?" disabled={auth.pending} onPress={() => go('Login')} />
            : name === 'Login' ? <TextLink tone="muted" label="New to Repeat AI? Sign up" disabled={auth.pending} onPress={() => go('Signup')} /> : null}
        </> : <PillButton compact onPress={() => { auth.clearError(); navigation.reset({ index: 0, routes: [{ name: 'Login' }] }); }} label="Back to log in" />}
      </View>
      <View style={s.legal}>
        <Pressable accessibilityRole="link" onPress={auth.onPrivacy}><Text style={s.small}>Privacy policy</Text></Pressable>
        <Pressable accessibilityRole="link" onPress={auth.onTerms}><Text style={s.small}>Terms of service</Text></Pressable>
      </View>
    </ScrollView>
  </View>;
}

export default function OnboardingAccountNavigator(props) {
  const reduced = useReducedMotion();
  return <NavigationIndependentTree><NavigationContainer>
    <Stack.Navigator initialRouteName={props.initialSignUp ? 'Signup' : 'Login'} screenOptions={{ headerShown: false, animation: reduced ? 'none' : 'slide_from_right', contentStyle: { backgroundColor: O.bg }, gestureEnabled: !props.pending }}>
      {Object.keys(pages).map(name => <Stack.Screen key={name} name={name}>{screenProps => <AccountPage {...screenProps} auth={props} />}</Stack.Screen>)}
    </Stack.Navigator>
  </NavigationContainer></NavigationIndependentTree>;
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: O.bg },
  content: { flexGrow: 1, paddingTop: 22 },
  stack: { paddingHorizontal: O.gutter, paddingTop: 28, gap: 13 },
  or: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 2 },
  orLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: '#5C5A5D' },
  orText: { color: O.text, fontSize: 15 },
  apple: { borderRadius: 24, borderWidth: 1, borderColor: '#2E2C2F', overflow: 'hidden', height: 48, justifyContent: 'center' },
  error: { color: '#FF453A', fontSize: 14, textAlign: 'center' },
  legal: { flexDirection: 'row', justifyContent: 'center', gap: 24, marginTop: 'auto', paddingTop: 28 },
  small: { color: O.muted, fontSize: 12 },
});
