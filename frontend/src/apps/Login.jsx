import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../components/ui/Button';
import { signInWithPhone, verifyOTP, signInWithGoogle } from '../lib/authHelpers';
import { RecaptchaVerifier } from 'firebase/auth';
import { auth } from '../lib/firebase';
import './Login.css';

export function Login() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('phone'); // 'phone' | 'google'
  const [phone, setPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState('input'); // 'input' | 'otp'

  useEffect(() => {
    // Create invisible reCAPTCHA verifier for phone OTP
    // Wrapped in try/catch — officer domain doesn't have Firebase so this is safe to skip
    try {
      const w = window;
      if (!w.recaptchaVerifier && auth?.app) {
        w.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
          size: 'invisible',
        });
      }
    } catch (e) {
      console.info('[Login] reCAPTCHA init skipped:', e?.message);
    }
  }, []);

  // After successful login — persist role then navigate
  const routeAfterLogin = (role, token) => {
    const finalRole = (role === 'officer' || role === 'admin') ? role : 'citizen';
    localStorage.setItem('jansetu_role', finalRole);
    if (token) localStorage.setItem('jansetu_token', token);
    navigate(finalRole === 'citizen' ? '/citizen' : '/officer', { replace: true });
  };

  // ── Phone OTP ─────────────────────────────────────────────────────────────
  const handleSendOTP = async () => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length !== 10) {
      setError('Enter a valid 10-digit mobile number');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await signInWithPhone(`+91${digits}`);
      setConfirmationResult(result);
      setStep('otp');
    } catch (err) {
      // Clear the verifier so it can be recreated on retry
      const w = window;
      if (w.recaptchaVerifier) {
        try { w.recaptchaVerifier.clear(); } catch (_) {}
        w.recaptchaVerifier = null;
      }
      setError(err.message || 'Failed to send OTP. Check phone number.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otpCode.length < 4) {
      setError('Enter the OTP received on your phone');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await verifyOTP(confirmationResult, otpCode);
      routeAfterLogin(data.role, data.jwt_token || data.access_token);
    } catch (err) {
      setError(err.message || 'Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Google ─────────────────────────────────────────────────────────────────
  const handleGoogle = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await signInWithGoogle();
      routeAfterLogin(data.role, data.jwt_token || data.access_token);
    } catch (err) {
      setError(err.message || 'Google sign-in failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetPhone = () => {
    setStep('input');
    setOtpCode('');
    setConfirmationResult(null);
    setError('');
  };

  return (
    <div className="login-page">
      <motion.div
        className="login-card glass glass--layer-4"
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: [-4, 0, -4], opacity: 1 }}
        transition={{
          y: { duration: 4, repeat: Infinity, ease: 'easeInOut' },
          opacity: { duration: 0.6, ease: 'easeOut' },
        }}
      >
        {/* Brand */}
        <motion.div
          className="login-brand"
          initial={{ scale: 0.85 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 22 }}
        >
          <div className="login-brand__icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
          <h1 className="login-brand__title">JanSetu</h1>
          <p className="login-brand__subtitle">Citizen Login</p>
        </motion.div>

        {/* Tab selector */}
        <div className="login-tabs">
          <button
            className={`login-tab ${tab === 'phone' ? 'active' : ''}`}
            onClick={() => { setTab('phone'); resetPhone(); }}
          >
            <Phone size={14} style={{ marginRight: 5 }} />
            Phone OTP
          </button>
          <button
            className={`login-tab ${tab === 'google' ? 'active' : ''}`}
            onClick={() => setTab('google')}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" style={{ marginRight: 5 }}>
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Google
          </button>
        </div>

        <AnimatePresence mode="wait">
          {/* ── Phone OTP Flow ── */}
          {tab === 'phone' && (
            <motion.div
              key="phone"
              className="login-form"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
            >
              {step === 'input' ? (
                <>
                  <div className="login-input-group">
                    <label>Mobile Number</label>
                    <div className="login-field">
                      <span className="login-field__prefix">
                        🇮🇳 +91
                        <span className="login-field__prefix-divider" />
                      </span>
                      <input
                        type="tel"
                        className="login-input has-prefix"
                        placeholder="9876543210"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendOTP()}
                        maxLength={10}
                        autoFocus
                      />
                    </div>
                  </div>
                  {error && <p className="login-error">{error}</p>}
                  <Button
                    type="button"
                    variant="primary"
                    loading={loading}
                    onClick={handleSendOTP}
                    style={{ marginTop: 12, height: 48, fontSize: 16, width: '100%' }}
                  >
                    {loading ? 'Sending OTP…' : 'Send OTP →'}
                  </Button>
                </>
              ) : (
                <>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', textAlign: 'center', marginBottom: 12 }}>
                    OTP sent to <strong style={{ color: 'var(--teal-primary)' }}>+91 {phone}</strong>
                  </p>
                  <div className="login-input-group">
                    <label>Enter OTP</label>
                    <div className="login-field">
                      <input
                        type="text"
                        className="login-input"
                        placeholder="• • • • • •"
                        style={{ paddingLeft: 14, letterSpacing: 6, fontSize: 20, textAlign: 'center' }}
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        onKeyDown={(e) => e.key === 'Enter' && handleVerifyOTP()}
                        inputMode="numeric"
                        autoFocus
                        maxLength={6}
                      />
                    </div>
                  </div>
                  {error && <p className="login-error">{error}</p>}
                  <Button
                    type="button"
                    variant="primary"
                    loading={loading}
                    onClick={handleVerifyOTP}
                    style={{ marginTop: 12, height: 48, fontSize: 16, width: '100%' }}
                  >
                    {loading ? 'Verifying…' : 'Verify & Login →'}
                  </Button>
                  <button
                    type="button"
                    onClick={resetPhone}
                    style={{ marginTop: 10, background: 'none', border: 'none', color: 'var(--teal-primary)', fontSize: 13, cursor: 'pointer', width: '100%' }}
                  >
                    ← Change phone number
                  </button>
                </>
              )}
            </motion.div>
          )}

          {/* ── Google Flow ── */}
          {tab === 'google' && (
            <motion.div
              key="google"
              className="login-form"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', textAlign: 'center', marginBottom: 20, lineHeight: 1.5 }}>
                Sign in with your Google account to access the JanSetu Citizen Portal.
              </p>
              {error && <p className="login-error">{error}</p>}
              <button
                type="button"
                className="login-social-btn"
                onClick={handleGoogle}
                disabled={loading}
                style={{ width: '100%', justifyContent: 'center', height: 48, fontSize: 15 }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                {loading ? 'Signing in…' : 'Continue with Google'}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Officer link */}
        <div style={{ textAlign: 'center', marginTop: 24, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <a
            href="/officer/login"
            style={{ fontSize: 12, color: 'var(--text-secondary)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 5 }}
          >
            <Shield size={12} />
            Commander / Officer Login
          </a>
        </div>

        <div id="recaptcha-container" />
      </motion.div>
    </div>
  );
}
