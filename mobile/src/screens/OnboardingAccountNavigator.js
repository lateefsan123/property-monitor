import googleLogo from '../../assets/google-logo.png';
import * as AppleAuthentication from 'expo-apple-authentication';
import { NavigationContainer, NavigationIndependentTree, useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { BackHandler, Image, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppIcon from '../components/AppIcon';
import useReducedMotion from '../components/use-reduced-motion';

const Stack = createNativeStackNavigator();
const titles = { Providers: 'Create your account', Signup: 'Sign up with email', Login: 'Welcome back', Reset: 'Reset your password', CheckEmail: 'Check your email' };

function Button({ children, onPress, disabled, primary = false, icon }) {
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={({ pressed }) => [s.button, primary && s.primary, { opacity: disabled ? 0.45 : pressed ? 0.7 : 1 }]}>{icon}<Text style={[s.buttonText, primary && { color: '#FFF' }]}>{children}</Text></Pressable>;
}

function AccountPage({ navigation, route, auth }) {
  const insets = useSafeAreaInsets();
  const name = route.name;
  const form = ['Signup', 'Login', 'Reset'].includes(name);
  const reset = name === 'Reset';
  const signup = name === 'Signup';
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
  return <View style={s.page}>
    <View style={s.header}>
      <Pressable accessibilityRole="button" accessibilityLabel="Go back" disabled={auth.pending} style={s.icon} onPress={() => { auth.clearError(); if (navigation.canGoBack()) navigation.goBack(); else auth.onBack(); }}><AppIcon name="chevronBack" size={25} color="#000" /></Pressable>
      {auth.onClose ? <Pressable accessibilityRole="button" accessibilityLabel="Close onboarding preview" style={s.icon} onPress={auth.onClose}><AppIcon name="close" size={23} color="#000" /></Pressable> : null}
    </View>
    <Text accessibilityRole="header" style={[s.title, auth.heading]}>{titles[name]}</Text>
    <ScrollView contentContainerStyle={[s.content, { paddingBottom: Math.max(16, insets.bottom) }]} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets showsVerticalScrollIndicator={false}>
      <View style={{ gap: 14, paddingTop: 24 }}>
        {auth.error ? <Text accessibilityRole="alert" style={s.error}>{auth.error}</Text> : null}
        {name === 'Providers' ? <>
          <Text style={s.body}>Keep your sellers and conversations together.</Text>
          <View style={{ height: 10 }} />
          <Button icon={<Image source={googleLogo} style={{ width: 20, height: 20 }} resizeMode="contain" accessible={false} />} disabled={auth.pending} onPress={auth.onGoogle}>Continue with Google</Button>
          {auth.appleAvailable && Platform.OS === 'ios' ? <View pointerEvents={auth.pending ? 'none' : 'auto'} style={{ opacity: auth.pending ? 0.45 : 1 }}><AppleAuthentication.AppleAuthenticationButton buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK} buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE} cornerRadius={5} style={{ height: 54, width: '100%' }} onPress={auth.onApple} /></View> : auth.preview ? <Button disabled={auth.pending} onPress={auth.onApple}>Continue with Apple</Button> : null}
          <Button primary disabled={auth.pending} onPress={() => go(auth.initialSignUp ? 'Signup' : 'Login')}>Continue with email</Button>
          {!auth.initialSignUp ? <Button disabled={auth.pending} onPress={() => go('Signup')}>New to Repeat AI? Sign up</Button> : null}
        </> : form ? <>
          <Text style={s.body}>{reset ? 'Enter your email and we’ll send a reset link.' : signup ? 'Sign up with your email address.' : 'Log in with your email address.'}</Text>
          <TextInput accessibilityLabel="Email" style={s.input} placeholder="Email address" placeholderTextColor="#888" value={auth.email} onChangeText={auth.setEmail} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" autoComplete="email" />
          {!reset ? <TextInput accessibilityLabel="Password" style={s.input} placeholder={signup ? 'Create a password' : 'Password'} placeholderTextColor="#888" value={auth.password} onChangeText={auth.setPassword} autoCapitalize="none" autoCorrect={false} secureTextEntry textContentType={signup ? 'newPassword' : 'password'} /> : null}
          {name === 'Login' ? <Pressable accessibilityRole="button" disabled={auth.pending} onPress={() => go('Reset')} style={s.link}><Text style={s.body}>Forgot password?</Text></Pressable> : null}
          <View style={{ height: 10 }} />
          <Button primary disabled={auth.pending || (!auth.preview && (!auth.email.trim() || (!reset && !auth.password)))} onPress={submit}>{auth.pending ? 'Please wait…' : reset ? 'Send reset link' : signup ? 'Create account' : 'Log in'}</Button>
        </> : <>
          <Text style={s.body}>{route.params?.notice}</Text>
          <View style={{ height: 10 }} />
          <Button primary onPress={() => { auth.clearError(); navigation.reset({ index: 1, routes: [{ name: 'Providers' }, { name: 'Login' }] }); }}>Back to log in</Button>
        </>}
      </View>
      <View style={s.legal}><Pressable accessibilityRole="link" onPress={auth.onPrivacy}><Text style={s.small}>Privacy policy</Text></Pressable><Pressable accessibilityRole="link" onPress={auth.onTerms}><Text style={s.small}>Terms of service</Text></Pressable></View>
    </ScrollView>
  </View>;
}

export default function OnboardingAccountNavigator(props) {
  const reduced = useReducedMotion();
  return <NavigationIndependentTree><NavigationContainer>
    <Stack.Navigator initialRouteName="Providers" screenOptions={{ headerShown: false, animation: reduced ? 'none' : 'slide_from_right', contentStyle: { backgroundColor: '#F2F3F5' }, gestureEnabled: !props.pending }}>
      {Object.keys(titles).map(name => <Stack.Screen key={name} name={name}>{screenProps => <AccountPage {...screenProps} auth={props} />}</Stack.Screen>)}
    </Stack.Navigator>
  </NavigationContainer></NavigationIndependentTree>;
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#F2F3F5' },
  header: { height: 48, paddingHorizontal: 10, flexDirection: 'row', justifyContent: 'space-between' },
  icon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  title: { paddingHorizontal: 22, paddingTop: 10, color: '#000', fontSize: 28, lineHeight: 34, fontWeight: '700', textAlign: 'center', letterSpacing: -0.5 },
  content: { paddingHorizontal: 24, gap: 24 },
  body: { color: '#666', fontSize: 14, lineHeight: 21, textAlign: 'center' },
  input: { minHeight: 54, borderWidth: 1, borderColor: '#CCC', borderRadius: 8, paddingHorizontal: 16, color: '#111', fontSize: 16 },
  button: { flexDirection: 'row', gap: 10, minHeight: 54, borderWidth: 1, borderColor: '#CCC', borderRadius: 5, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  primary: { backgroundColor: '#000', borderColor: '#000' },
  buttonText: { color: '#111', fontSize: 14, fontWeight: '600', textAlign: 'center' },
  error: { color: '#B42318', fontSize: 13, textAlign: 'center' },
  link: { paddingVertical: 8 },
  legal: { flexDirection: 'row', justifyContent: 'center', gap: 24 },
  small: { color: '#777', fontSize: 12 },
});
