import OnboardingAccountNavigator from './OnboardingAccountNavigator';
import { useEffect, useState } from "react";
import { Image, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { makeRedirectUri } from "expo-auth-session";
import * as QueryParams from "expo-auth-session/build/QueryParams";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { supabase } from "../supabase";
import AppIcon from "../components/AppIcon";
import LoginHero from "../components/login-hero";
import { O, PillButton, TextLink, onboardingText as t } from "../components/onboarding-ui";
import googleLogo from "../../assets/google-logo.png";
import wordmark from "../../assets/repeat-ai-logo.png";

const AUTH_REDIRECT_PATH = "auth/callback";
const PRIVACY_URL = "https://repeatai.org/privacy";
const TERMS_URL = "https://repeatai.org/terms";

WebBrowser.maybeCompleteAuthSession();

function getAuthRedirectUri() {
  return makeRedirectUri({
    scheme: "seller-signal",
    path: AUTH_REDIRECT_PATH,
  });
}

async function createSessionFromUrl(url) {
  const { params, errorCode } = QueryParams.getQueryParams(url);

  if (errorCode) {
    throw new Error(params.error_description || params.error || errorCode);
  }

  const accessToken = params.access_token;
  const refreshToken = params.refresh_token;

  if (!accessToken || !refreshToken) {
    return { ok: false };
  }

  const { error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  if (error) {
    throw error;
  }

  return { ok: true, isRecovery: params.type === "recovery" };
}


export default function AuthScreen({ onReplayOnboarding, onPasswordRecovery, embedded = false, initialSignUp = false, preview = false, onPreviewComplete, onBack, onClose }) {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const redirectTo = getAuthRedirectUri();
  const incomingUrl = Linking.useURL();

  useEffect(() => {
    if (!incomingUrl || preview) return;

    createSessionFromUrl(incomingUrl)
      .then((result) => {
        if (result?.isRecovery) onPasswordRecovery?.();
      })
      .catch((err) => {
        setError(err.message || "Sign-in failed");
      });
  }, [incomingUrl, onPasswordRecovery, preview]);

  useEffect(() => {
    if (Platform.OS !== "ios") return;
    AppleAuthentication.isAvailableAsync().then(setAppleAvailable).catch(() => {
      setAppleAvailable(false);
    });
  }, []);

  async function handleEmailAuth(mode) {
    const reset = mode === "reset";
    const signup = mode === "signup";
    if (preview) {
      if (reset) return 'Check your email for a password reset link.';
      onPreviewComplete?.(); return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
    if (reset) {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });
      if (resetError) setError(resetError.message);
      else { const notice = "Check your email for a password reset link."; setMessage(notice); return notice; }
    } else if (signup) {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: redirectTo },
      });
      if (signUpError) setError(signUpError.message);
      else { const notice = "Check your email for a confirmation link."; setMessage(notice); return notice; }
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) setError(signInError.message);
    }

    } catch (err) { setError(err.message || "Could not connect. Please try again."); }
    finally { setLoading(false); }
  }

  async function handleGoogleAuth() {
    if (preview) { onPreviewComplete?.(); return; }
    setGoogleLoading(true);
    setError(null);
    setMessage(null);

    try {
      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          skipBrowserRedirect: true,
        },
      });

      if (oauthError) {
        setError(oauthError.message);
        setGoogleLoading(false);
        return;
      }

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

      if (result.type === "success") {
        await createSessionFromUrl(result.url);
      } else if (result.type !== "cancel") {
        setError(`Google sign-in did not complete in the app (${result.type}).`);
      }
    } catch (err) {
      setError(err.message || "Google sign-in failed");
    }

    setGoogleLoading(false);
  }

  async function handleAppleAuth() {
    if (preview) { onPreviewComplete?.(); return; }
    setAppleLoading(true);
    setError(null);
    setMessage(null);

    try {
      const rawNonce = Crypto.randomUUID();
      const hashedNonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        rawNonce,
      );
      const credential = await AppleAuthentication.signInAsync({
        nonce: hashedNonce,
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        throw new Error("Apple did not return a sign-in token.");
      }

      const { data, error: appleError } = await supabase.auth.signInWithIdToken({
        provider: "apple",
        token: credential.identityToken,
        nonce: rawNonce,
      });
      if (appleError) throw appleError;

      const fullName = [credential.fullName?.givenName, credential.fullName?.familyName]
        .filter(Boolean)
        .join(" ");
      if (fullName && data.user) {
        await supabase.auth.updateUser({
          data: { full_name: fullName, username: fullName },
        });
      }
    } catch (err) {
      if (err?.code !== "ERR_REQUEST_CANCELED") {
        setError(err.message || "Apple sign-in failed");
      }
    } finally {
      setAppleLoading(false);
    }
  }

  const clearError = () => { setError(null); setMessage(null); };
  const pending = loading || googleLoading || appleLoading;
  const account = {
    email, setEmail, password, setPassword, pending, appleAvailable, error, clearError,
    onEmail: handleEmailAuth, onGoogle: handleGoogleAuth, onApple: handleAppleAuth,
    onPrivacy: () => Linking.openURL(PRIVACY_URL), onTerms: () => Linking.openURL(TERMS_URL),
  };

  if (embedded) return <OnboardingAccountNavigator {...account} initialSignUp={initialSignUp} preview={preview} onBack={onBack} onClose={onClose} />;

  // Email sign-in reuses the onboarding account screens (Login, Reset, CheckEmail).
  if (showEmailForm) return <View style={[s.page, { paddingTop: insets.top }]}>
    <OnboardingAccountNavigator {...account} onBack={() => { clearError(); setShowEmailForm(false); }} />
  </View>;

  const apple = appleAvailable && Platform.OS === "ios";
  const google = <Image source={googleLogo} style={s.providerIcon} resizeMode="contain" accessible={false} />;
  // Opal's Sign In screen: white primary provider, "or", dark pills, then a
  // plain "Don't have an account?" link.
  return (
    <View style={s.page}>
      <View style={s.top}>
        <LoginHero />
        <Image source={wordmark} resizeMode="contain" accessibilityLabel="Repeat AI" style={[s.wordmark, { top: insets.top + 12 }]} />
      </View>
      <View style={[s.bottom, { paddingBottom: Math.max(insets.bottom, 16) + 4 }]}>
        <Text accessibilityRole="header" style={t.title}>Welcome back</Text>
        <Text style={[t.body, s.subtitle]}>Sign in or create an account to continue.</Text>
        <View style={s.actions}>
          {error ? <Text accessibilityRole="alert" style={s.error}>{error}</Text> : null}
          {message ? <Text style={s.message}>{message}</Text> : null}
          {apple ? appleLoading ? <PillButton busy height={50} label="Continue with Apple" />
            : <View pointerEvents={pending ? "none" : "auto"} style={pending && s.dimmed}>
              <AppleAuthentication.AppleAuthenticationButton buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE} buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE} cornerRadius={25} style={s.appleButton} onPress={handleAppleAuth} />
            </View>
            : <PillButton height={50} busy={googleLoading} disabled={pending} onPress={handleGoogleAuth} label="Continue with Google" icon={google} />}
          <View style={s.or}><View style={s.orLine} /><Text style={s.orText}>or</Text><View style={s.orLine} /></View>
          {apple ? <PillButton dark height={50} busy={googleLoading} disabled={pending} onPress={handleGoogleAuth} label="Continue with Google" icon={google} /> : null}
          <PillButton dark height={50} disabled={pending} onPress={() => { clearError(); setShowEmailForm(true); }} label="Continue with Email" icon={<AppIcon name="mail" size={19} color={O.text} />} />
        </View>
        {onReplayOnboarding ? <TextLink label="Don’t have an account?" disabled={pending} onPress={onReplayOnboarding} /> : null}
        <View style={s.legal}>
          <Pressable accessibilityRole="link" hitSlop={8} onPress={account.onPrivacy}><Text style={s.legalText}>Privacy policy</Text></Pressable>
          <Pressable accessibilityRole="link" hitSlop={8} onPress={account.onTerms}><Text style={s.legalText}>Terms of service</Text></Pressable>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: O.bg },
  top: { flex: 1, minHeight: 0 },
  wordmark: { position: "absolute", alignSelf: "center", width: 120, height: 19 },
  bottom: { paddingTop: 8 },
  subtitle: { marginTop: 8, fontSize: 15, lineHeight: 20, color: O.muted },
  actions: { paddingHorizontal: O.gutter, paddingTop: 28, paddingBottom: 10, gap: 16 },
  appleButton: { width: "100%", height: 50 },
  dimmed: { opacity: 0.45 },
  providerIcon: { width: 18, height: 18 },
  or: { flexDirection: "row", alignItems: "center", gap: 10, marginVertical: -4 },
  orLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: "#5C5A5D" },
  orText: { color: O.text, fontSize: 15 },
  error: { color: "#FF453A", fontSize: 14, textAlign: "center" },
  message: { color: "#30D158", fontSize: 14, textAlign: "center" },
  legal: { flexDirection: "row", justifyContent: "center", gap: 24, paddingTop: 10 },
  legalText: { color: O.muted, fontSize: 12 },
});
