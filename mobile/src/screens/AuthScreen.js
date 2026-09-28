import OnboardingAccountNavigator from './OnboardingAccountNavigator';
import AppIcon from "../components/AppIcon";
/* global require */
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { makeRedirectUri } from "expo-auth-session";
import * as QueryParams from "expo-auth-session/build/QueryParams";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { supabase } from "../supabase";

const lightLogo = require("../../assets/repeat-ai-logo.png");
const bgImage = { uri: "https://cdn.midjourney.com/30e8eec1-dc28-41f8-b358-9bd07d143e01/0_3.png" };

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
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

export default function AuthScreen({ onReplayOnboarding, onPasswordRecovery, embedded = false, initialSignUp = false, preview = false, onPreviewComplete, onBack, onClose, heading }) {
  const emailInput = useRef(null);
  const passwordInput = useRef(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [isSignUp, setIsSignUp] = useState(initialSignUp);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
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
    const reset = typeof mode === "string" ? mode === "reset" : isForgotPassword;
    const signup = typeof mode === "string" ? mode === "signup" : isSignUp;
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
        options: { emailRedirectTo: redirectTo, data: { username: username.trim() } },
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

  if (embedded) {
    return <OnboardingAccountNavigator initialSignUp={initialSignUp} preview={preview} heading={heading}
      email={email} setEmail={setEmail} password={password} setPassword={setPassword}
      pending={loading || googleLoading || appleLoading} appleAvailable={appleAvailable} error={error}
      onEmail={handleEmailAuth} onGoogle={handleGoogleAuth} onApple={handleAppleAuth}
      clearError={() => { setError(null); setMessage(null); }} onBack={onBack} onClose={onClose}
      onPrivacy={() => Linking.openURL(PRIVACY_URL)} onTerms={() => Linking.openURL(TERMS_URL)} />;
  }

  if (showEmailForm) {
    const screenTitle = isForgotPassword
      ? "Reset your password"
      : "Continue with Email";
    const ctaLabel = isForgotPassword
      ? "Send reset link"
      : "Continue";

    return (
      <SafeAreaView style={[s.container, { backgroundColor: "#111" }]}>
        <ScrollView
          contentContainerStyle={s.emailScrollContent}
          automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
          contentInsetAdjustmentBehavior="never"
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
        >
        <View style={s.emailTopArea}>
          {/* Header Row */}
          <View style={s.emailHeaderRow}>
            <Pressable
              onPress={() => {
                if (isForgotPassword) {
                  setIsForgotPassword(false);
                  setError(null);
                  setMessage(null);
                } else {
                  setShowEmailForm(false);
                }
              }}
              style={s.backHitbox}
            >
              <AppIcon name="back" size={24} color={"#fff"} />
            </Pressable>
          </View>

          {/* Title */}
          <Text style={s.emailTitle}>{screenTitle}</Text>

          {/* Form container */}
          <View style={s.emailFormInputs}>
            {error && (
              <View style={s.errorBox}>
                <Text style={s.errorText}>{error}</Text>
              </View>
            )}
            {message && (
              <View style={s.successBox}>
                <Text style={s.successText}>{message}</Text>
              </View>
            )}

            {isSignUp && !isForgotPassword && (
              <View style={s.inputContainer}>
                <Text style={s.inputLabel}>Username</Text>
                <TextInput
                  accessibilityLabel="Username"
                  style={s.inputField}
                  placeholder="johndoe"
                  placeholderTextColor="#666"
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  autoCorrect={false}
                  spellCheck={false}
                  textContentType={Platform.OS === "ios" ? "nickname" : undefined}
                  autoComplete={Platform.OS !== "ios" ? "nickname" : undefined}
                  keyboardAppearance="dark"
                  returnKeyType="next"
                  submitBehavior="submit"
                  onSubmitEditing={() => emailInput.current?.focus()}
                />
              </View>
            )}

            <View style={s.inputContainer}>
              <Text style={s.inputLabel}>Email</Text>
              <TextInput
                ref={emailInput}
                accessibilityLabel="Email"
                style={s.inputField}
                placeholder="user@example.com"
                placeholderTextColor="#666"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                spellCheck={false}
                textContentType={Platform.OS === "ios" ? (isForgotPassword ? "emailAddress" : "username") : undefined}
                autoComplete={Platform.OS !== "ios" ? (isForgotPassword ? "email" : "username") : undefined}
                keyboardAppearance="dark"
                returnKeyType={isForgotPassword ? "done" : "next"}
                submitBehavior={isForgotPassword ? "blurAndSubmit" : "submit"}
                onSubmitEditing={() => { if (!isForgotPassword) passwordInput.current?.focus(); }}
              />
            </View>

            {!isForgotPassword && (
              <View style={s.inputContainer}>
                <Text style={s.inputLabel}>Password</Text>
                <TextInput
                  ref={passwordInput}
                  accessibilityLabel="Password"
                  style={s.inputField}
                  placeholder="••••••••"
                  placeholderTextColor="#666"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  spellCheck={false}
                  textContentType={Platform.OS === "ios" ? (isSignUp ? "newPassword" : "password") : undefined}
                  autoComplete={Platform.OS !== "ios" ? (isSignUp ? "new-password" : "current-password") : undefined}
                  keyboardAppearance="dark"
                  returnKeyType="done"
                  submitBehavior="blurAndSubmit"
                />
              </View>
            )}

            {!isSignUp && !isForgotPassword && (
              <Pressable
                onPress={() => {
                  setIsForgotPassword(true);
                  setError(null);
                  setMessage(null);
                }}
                style={s.forgotRow}
              >
                <Text style={s.toggleLink}>Forgot password?</Text>
              </Pressable>
            )}

            {!isForgotPassword && (
              <View style={s.toggleRowAlignLeft}>
                <Text style={s.toggleText}>
                  {isSignUp ? "Already have an account?" : "Don't have an account?"}
                </Text>
                <Pressable
                  onPress={() => {
                    setIsSignUp(!isSignUp);
                    setError(null);
                    setMessage(null);
                  }}
                >
                  <Text style={s.toggleLink}>{isSignUp ? "Sign In" : "Sign Up"}</Text>
                </Pressable>
              </View>
            )}

            {isForgotPassword && (
              <View style={s.toggleRowAlignLeft}>
                <Text style={s.toggleText}>Remembered it?</Text>
                <Pressable
                  onPress={() => {
                    setIsForgotPassword(false);
                    setError(null);
                    setMessage(null);
                  }}
                >
                  <Text style={s.toggleLink}>Back to sign in</Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>

        {/* Bottom Continue Button */}
        <View style={s.bottomActionContainer}>
          <Pressable
            style={({ pressed }) => [s.bottomContinueBtn, pressed && s.btnPressed, loading && s.btnDisabled]}
            onPress={handleEmailAuth}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#aaa" />
            ) : (
              <Text style={s.bottomContinueBtnText}>{ctaLabel}</Text>
            )}
          </Pressable>
        </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      {/* Background Image Full Screen */}
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: "#000" }]}>
        <View style={s.bgImageWrap}>
          <Image source={bgImage} style={s.bgImage} resizeMode="cover" />
        </View>
      </View>
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.5)", "#000", "#000"]}
        style={s.gradientFill}
        locations={[0, 0.4, 0.8, 1]}
      />

      <ScrollView
        contentContainerStyle={s.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <KeyboardAvoidingView
          style={s.contentSection}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          {/* Main content centered vertically */}

          {/* Logo & Brand Text centered above buttons */}
          <View style={s.logoWrap}>
            <View style={s.logoImageContainer}>
              <Image
                source={lightLogo}
                style={s.logo}
                resizeMode="contain"
              />
            </View>

          </View>

          {error && (
            <View style={s.errorBox}>
              <Text style={s.errorText}>{error}</Text>
            </View>
          )}
          {message && (
            <View style={s.successBox}>
              <Text style={s.successText}>{message}</Text>
            </View>
          )}

          {/* Main buttons */}
          <View style={s.buttonsWrap}>
            {appleAvailable ? (
              appleLoading ? (
                <View style={[s.btn, s.appleLoadingButton]}>
                  <ActivityIndicator color="#111" size="small" />
                </View>
              ) : (
                <AppleAuthentication.AppleAuthenticationButton
                  buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
                  buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
                  cornerRadius={30}
                  onPress={handleAppleAuth}
                  style={s.appleButton}
                />
              )
            ) : null}

            {/* Continue with Google */}
            <Pressable
              style={({ pressed }) => [s.btn, s.btnWhite, pressed && s.btnPressed, googleLoading && s.btnDisabled]}
              onPress={handleGoogleAuth}
              disabled={googleLoading}
            >
              {googleLoading ? (
                <ActivityIndicator color="#111" size="small" />
              ) : (
                <View style={s.btnInner}>
                  <GoogleLogo />
                  <Text style={s.btnWhiteText}>Continue with Google</Text>
                </View>
              )}
            </Pressable>

            {/* Continue with email */}
            <Pressable
              style={({ pressed }) => [s.btn, s.btnDark, pressed && s.btnPressed]}
              onPress={() => setShowEmailForm(true)}
            >
              <Text style={s.btnDarkText}>Continue with email</Text>
            </Pressable>
          </View>

          {/* Replay onboarding */}
          {onReplayOnboarding && (
            <Pressable
              style={({ pressed }) => [s.btn, s.btnOutline, pressed && s.btnPressed]}
              onPress={onReplayOnboarding}
            >
              <Text style={s.btnOutlineText}>Replay Onboarding</Text>
            </Pressable>
          )}

          {/* Privacy & Terms */}
          <View style={s.footer}>
            <Pressable onPress={() => Linking.openURL(PRIVACY_URL)} hitSlop={8}>
              <Text style={s.footerLink}>Privacy policy</Text>
            </Pressable>
            <Text style={s.footerSep}>{"    "}</Text>
            <Pressable onPress={() => Linking.openURL(TERMS_URL)} hitSlop={8}>
              <Text style={s.footerLink}>Terms of service</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </ScrollView>

    </SafeAreaView>
  );
}

function GoogleLogo() {
  return (
    <View style={gStyles.wrap}>
      <Image source={require("../../assets/google-logo.png")} style={{ width: 22, height: 22 }} resizeMode="contain" accessible={false} />
    </View>
  );
}

const gStyles = StyleSheet.create({
  wrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
});

const s = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: "#111", // Fallback dark bg
    },
    bgImageWrap: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      height: "50%",
    },
    bgImage: {
      width: "100%",
      height: "100%",
    },
    gradientFill: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: "50%",
      height: "30%",
    },
    headerRow: {
      position: "absolute",
      top: 60, // Adjust for safe area / status bar
      right: 24,
      zIndex: 10,
    },
    cancelText: {
      color: "#fff",
      fontSize: 16,
      fontWeight: "500",
    },
    keyboardView: {
      flex: 1,
      justifyContent: "center",
      paddingHorizontal: 24,
      paddingBottom: 40,
    },
    proRow: {
      flexDirection: "row",
      justifyContent: "flex-start",
      paddingHorizontal: 20,
      paddingTop: 8,
      zIndex: 10,
    },
    proBtnWrap: {
      backgroundColor: "rgba(45,212,191,0.15)",
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderWidth: 1,
      borderColor: "rgba(45,212,191,0.4)",
    },
    proBtnText: {
      color: "#2dd4bf",
      fontSize: 12,
      fontWeight: "800",
      letterSpacing: 1,
    },
    scrollContent: {
      flexGrow: 1,
    },
    contentSection: {
      flex: 1,
      paddingHorizontal: 24,
      paddingTop: 120, // Pushes the center axis downwards to shift the entire cluster down a bit
      justifyContent: "center",
      alignItems: "center",
    },
    spacer: {
      flex: 1,
    },
    logoWrap: {
      alignItems: "center",
      marginBottom: 36,
    },
    logoImageContainer: {
      width: 260,
      height: 48,
      justifyContent: "center",
      alignItems: "center",
    },
    logo: {
      width: 260,
      height: 48,
    },
    buttonsWrap: {
      width: "100%",
      gap: 12,
    },
    appleButton: {
      width: "100%",
      height: 58,
    },
    appleLoadingButton: {
      backgroundColor: "#fff",
    },
    btn: {
      borderRadius: 30,
      paddingVertical: 18,
      alignItems: "center",
      justifyContent: "center",
    },
    btnWhite: {
      backgroundColor: "#ffffff",
    },
    btnInner: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 12,
    },
    btnWhiteText: {
      color: "#000",
      fontWeight: "600",
      fontSize: 16,
    },
    btnDark: {
      backgroundColor: "#222",
    },
    btnDarkText: {
      color: "#ffffff",
      fontWeight: "600",
      fontSize: 16,
    },
    btnPrimary: {
      backgroundColor: "#fff",
    },
    btnPrimaryText: {
      color: "#000",
      fontWeight: "700",
      fontSize: 16,
    },
    btnOutline: {
      backgroundColor: "transparent",
      borderWidth: 1,
      borderColor: "#444",
      marginTop: 12,
    },
    btnOutlineText: {
      color: "#888",
      fontWeight: "600",
      fontSize: 14,
    },
    btnPressed: { opacity: 0.8 },
    btnDisabled: { opacity: 0.5 },
    
    // NEW EMAIL FORM STYLES
    emailScrollContent: {
      flexGrow: 1,
    },
    emailTopArea: {
      paddingHorizontal: 24,
      paddingTop: 16,
      flex: 1,
    },
    emailHeaderRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 40,
    },
    backHitbox: {
      padding: 8,
      marginLeft: -8, // make it flush while maintaining touch area
    },
    emailTitle: {
      fontSize: 24,
      fontWeight: "700",
      color: "#fff",
      textAlign: "center",
      marginBottom: 32,
    },
    emailFormInputs: {
      width: "100%",
    },
    inputContainer: {
      borderWidth: 1,
      borderColor: "#444",
      borderRadius: 8,
      paddingHorizontal: 16,
      paddingVertical: 16,
      marginBottom: 16,
      position: "relative",
    },
    inputLabel: {
      position: "absolute",
      top: -10,
      left: 12,
      backgroundColor: "#111", // Match form background
      paddingHorizontal: 6,
      color: "#ccc",
      fontSize: 12,
      fontWeight: "600",
    },
    inputField: {
      color: "#fff",
      fontSize: 16,
    },
    toggleRowAlignLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginTop: 4,
    },
    forgotRow: {
      alignSelf: "flex-start",
      marginTop: 4,
      marginBottom: 12,
      paddingVertical: 4,
    },
    bottomActionContainer: {
      paddingHorizontal: 24,
      paddingBottom: 24,
      width: "100%",
    },
    bottomContinueBtn: {
      backgroundColor: "#2A2A2A",
      borderRadius: 30,
      paddingVertical: 18,
      alignItems: "center",
      justifyContent: "center",
    },
    bottomContinueBtnText: {
      color: "#999",
      fontSize: 16,
      fontWeight: "600",
    },
    errorBox: {
      backgroundColor: "rgba(255,50,50,0.2)",
      borderRadius: 8,
      padding: 12,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: "rgba(255,50,50,0.4)"
    },
    errorText: { color: "#ff8888", fontSize: 13, textAlign: "center" },
    successBox: {
      backgroundColor: "rgba(50,255,50,0.2)",
      borderRadius: 8,
      padding: 12,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: "rgba(50,255,50,0.4)"
    },
    successText: { color: "#88ff88", fontSize: 13, textAlign: "center" },
    toggleText: {
      color: "#ccc",
      fontSize: 14,
    },
    toggleLink: {
      color: "#fff",
      fontSize: 14,
      fontWeight: "700",
    },
    footer: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      paddingTop: 36,
      paddingBottom: 32,
    },
    footerLink: {
      color: "#888",
      fontSize: 13,
      fontWeight: "500",
    },
    footerSep: {
      color: "#888",
      fontSize: 13,
    },
  });
