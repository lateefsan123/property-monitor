/* global require */
import { useEffect, useState } from "react";
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
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { supabase } from "../supabase";
import SubscriptionScreen from "./SubscriptionScreen";
import Svg, { Path } from "react-native-svg";

const lightLogo = require("../../assets/logo2white.png");
const bgImage = { uri: "https://cdn.midjourney.com/30e8eec1-dc28-41f8-b358-9bd07d143e01/0_3.png" };

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const GOOGLE_REDIRECT_PATH = "auth/callback";

WebBrowser.maybeCompleteAuthSession();

function getGoogleRedirectUri() {
  return makeRedirectUri({
    scheme: "seller-signal",
    path: GOOGLE_REDIRECT_PATH,
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

export default function AuthScreen({ onReplayOnboarding, onPasswordRecovery }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [showSubscription, setShowSubscription] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const redirectTo = getGoogleRedirectUri();
  const incomingUrl = Linking.useURL();

  useEffect(() => {
    if (!incomingUrl) return;

    createSessionFromUrl(incomingUrl)
      .then((result) => {
        if (result?.isRecovery) onPasswordRecovery?.();
      })
      .catch((err) => {
        setError(err.message || "Sign-in failed");
      });
  }, [incomingUrl, onPasswordRecovery]);

  async function handleEmailAuth() {
    setLoading(true);
    setError(null);
    setMessage(null);

    if (isForgotPassword) {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });
      if (resetError) setError(resetError.message);
      else setMessage("Check your email for a password reset link.");
    } else if (isSignUp) {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username: username.trim() } },
      });
      if (signUpError) setError(signUpError.message);
      else setMessage("Check your email for a confirmation link.");
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) setError(signInError.message);
    }

    setLoading(false);
  }

  async function handleGoogleAuth() {
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

  const s = styles();

  if (showEmailForm) {
    const screenTitle = isForgotPassword
      ? "Reset your password"
      : "Continue with Email";
    const ctaLabel = isForgotPassword
      ? "Send reset link"
      : "Continue";

    return (
      <SafeAreaView style={[s.container, { backgroundColor: "#111" }]}>
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
              <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <Path d="M19 12H5M12 19l-7-7 7-7" />
              </Svg>
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
                  style={s.inputField}
                  placeholder="johndoe"
                  placeholderTextColor="#666"
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                />
              </View>
            )}

            <View style={s.inputContainer}>
              <Text style={s.inputLabel}>Email</Text>
              <TextInput
                style={s.inputField}
                placeholder="user@example.com"
                placeholderTextColor="#666"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            {!isForgotPassword && (
              <View style={s.inputContainer}>
                <Text style={s.inputLabel}>Password</Text>
                <TextInput
                  style={s.inputField}
                  placeholder="••••••••"
                  placeholderTextColor="#666"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
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
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={s.bottomActionContainer}
        >
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
        </KeyboardAvoidingView>
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

      {/* Beta badge */}
      <View style={s.proRow}>
        <Pressable style={s.proBtnWrap} onPress={() => setShowSubscription(true)}>
          <Text style={s.proBtnText}>BETA</Text>
        </Pressable>
      </View>

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
            <Text style={s.brandText}>seller signal</Text>
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
            <Text style={s.footerLink}>Privacy policy</Text>
            <Text style={s.footerSep}>{"    "}</Text>
            <Text style={s.footerLink}>Terms of service</Text>
          </View>
        </KeyboardAvoidingView>
      </ScrollView>

      {showSubscription && (
        <View style={StyleSheet.absoluteFill}>
          <SubscriptionScreen
            onClose={() => setShowSubscription(false)}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

function GoogleLogo() {
  return (
    <View style={gStyles.wrap}>
      <Svg width="22" height="22" viewBox="0 0 48 48">
        <Path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
        <Path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
        <Path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
        <Path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
      </Svg>
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

const styles = () =>
  StyleSheet.create({
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
      width: 100,
      height: 100,
      justifyContent: "center",
      alignItems: "center",
      overflow: "hidden",
      marginBottom: -24, // Aggressive negative margin to pull the text extremely close to the visible cropped logo
    },
    logo: {
      width: 360,
      height: 360,
      tintColor: "#fff",
    },
    brandText: {
      color: "#fff",
      fontSize: 48,
      fontWeight: "500",
      letterSpacing: -2,
    },
    buttonsWrap: {
      width: "100%",
      gap: 12,
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
