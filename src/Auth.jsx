import { useEffect, useState } from "react";
import { supabase } from "./supabase";

const RESEND_COOLDOWN_SECONDS = 30;

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const [resendNotice, setResendNotice] = useState(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return undefined;
    const timer = setTimeout(() => setResendCooldown((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);
  const artSrc = `${import.meta.env.BASE_URL}khalifa.png`;

  function clearFeedback() {
    setError(null);
    setMessage(null);
    setResetEmailSent(false);
    setResendNotice(null);
  }

  async function handleEmailAuth(event) {
    event.preventDefault();
    setLoading(true);
    clearFeedback();

    if (isForgotPassword) {
      const redirectTo = new URL(import.meta.env.BASE_URL, window.location.origin).toString();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });
      if (resetError) setError(resetError.message);
      else setResetEmailSent(true);
    } else if (isSignUp) {
      const emailRedirectTo = new URL(import.meta.env.BASE_URL, window.location.origin).toString();
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { username: username.trim() },
          emailRedirectTo,
        },
      });

      if (signUpError) setError(signUpError.message);
      else {
        setPendingEmail(email);
        setPassword("");
      }
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) setError(signInError.message);
    }

    setLoading(false);
  }

  async function handleGoogleAuth() {
    setError(null);
    const redirectTo = new URL(import.meta.env.BASE_URL, window.location.origin).toString();
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    if (oauthError) setError(oauthError.message);
  }

  async function handleResendVerification() {
    if (!pendingEmail || resendCooldown > 0) return;
    setResendLoading(true);
    setError(null);
    setResendNotice(null);
    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email: pendingEmail,
    });
    setResendLoading(false);
    if (resendError) {
      setError(resendError.message);
    } else {
      setResendNotice("Verification email sent again.");
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
    }
  }

  function handleChangeAccount() {
    setPendingEmail("");
    setEmail("");
    setPassword("");
    setUsername("");
    setResendCooldown(0);
    clearFeedback();
  }

  const heading = isForgotPassword
    ? "Reset Password"
    : isSignUp
    ? "Create your account"
    : "Sign in to Seller Signal";

  const helper = isForgotPassword
    ? "Enter your email to receive instructions to reset your password."
    : isSignUp
    ? "Start tracking leads in under a minute."
    : "Welcome back. Enter your details to continue.";

  if (pendingEmail) {
    return (
      <div className="auth-split-page">
        <div className="auth-pane auth-pane--form">
          <div className="auth-form-container">
            <div className="auth-heading-group">
              <h1 className="auth-heading">Check your email</h1>
              <p className="auth-helper">
                To start using Seller Signal we need you to confirm your account.
              </p>
            </div>

            {error && <div className="auth-error">{error}</div>}
            {resendNotice && <div className="auth-message">{resendNotice}</div>}

            <div className="auth-verify-box">
              <p className="auth-verify-text">
                Please click the link we sent to the following email:{" "}
                <strong>{pendingEmail}</strong>
              </p>
              <p className="auth-verify-change">
                Not the right email?{" "}
                <button
                  type="button"
                  className="auth-link"
                  onClick={handleChangeAccount}
                >
                  Change account
                </button>
              </p>
            </div>

            <button
              type="button"
              className="auth-submit"
              onClick={handleResendVerification}
              disabled={resendLoading || resendCooldown > 0}
            >
              {resendLoading
                ? "Sending..."
                : resendCooldown > 0
                ? `Resend email (${resendCooldown}s)`
                : "Resend email"}
            </button>
          </div>
        </div>

        <div className="auth-pane auth-pane--art" aria-hidden="true">
          <img src={artSrc} alt="" className="auth-art-image" />
        </div>
      </div>
    );
  }

  return (
    <div className="auth-split-page">
      <div className="auth-pane auth-pane--form">
        <div className="auth-form-container">
          <div className="auth-heading-group">
            <h1 className="auth-heading">{heading}</h1>
            <p className="auth-helper">{helper}</p>
          </div>

          {error && <div className="auth-error">{error}</div>}
          {message && !resetEmailSent && <div className="auth-message">{message}</div>}

          {isForgotPassword && resetEmailSent && (
            <div className="auth-info-box">
              If an account with that email exists, a password reset link will be sent
              to your email. Please note that the link expires in 15 minutes, and you
              must reset your password using the same device and browser you used to
              request the reset link.
            </div>
          )}

          {!isForgotPassword && (
            <>
              <button
                type="button"
                className="auth-google-btn"
                onClick={handleGoogleAuth}
                disabled={loading}
              >
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Continue with Google
              </button>

              <div className="auth-divider"><span>or</span></div>
            </>
          )}

          <form className="auth-form" onSubmit={handleEmailAuth}>
            {isSignUp && !isForgotPassword && (
              <label className="auth-field">
                <span className="auth-label">Username</span>
                <input
                  type="text"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  required
                  minLength={2}
                  autoComplete="username"
                />
              </label>
            )}

            <label className="auth-field">
              <span className="auth-label">Email</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                autoComplete="email"
              />
            </label>

            {!isForgotPassword && (
              <label className="auth-field">
                <span className="auth-label-row">
                  <span className="auth-label">Password</span>
                  {!isSignUp && (
                    <button
                      type="button"
                      className="auth-link auth-link--inline"
                      onClick={() => {
                        setIsForgotPassword(true);
                        clearFeedback();
                      }}
                    >
                      Forgot your password?
                    </button>
                  )}
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  minLength={6}
                  autoComplete={isSignUp ? "new-password" : "current-password"}
                />
              </label>
            )}

            <button
              className="auth-submit"
              type="submit"
              disabled={loading || (isForgotPassword && resetEmailSent)}
            >
              {loading
                ? "Loading..."
                : isForgotPassword
                ? resetEmailSent
                  ? "Email sent"
                  : "Send reset link"
                : isSignUp
                ? "Create account"
                : "Sign in"}
            </button>
          </form>

          <p className="auth-toggle">
            {isForgotPassword ? (
              <>
                Remember your password?{" "}
                <button
                  type="button"
                  className="auth-link"
                  onClick={() => {
                    setIsForgotPassword(false);
                    clearFeedback();
                  }}
                >
                  Login
                </button>
              </>
            ) : (
              <>
                {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
                <button
                  type="button"
                  className="auth-link"
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    clearFeedback();
                  }}
                >
                  {isSignUp ? "Sign in" : "Sign up"}
                </button>
              </>
            )}
          </p>
        </div>
      </div>

      <div className="auth-pane auth-pane--art" aria-hidden="true">
        <img src={artSrc} alt="" className="auth-art-image" />
      </div>
    </div>
  );
}
