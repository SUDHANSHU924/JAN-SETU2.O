import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Lock, Phone, UserPlus, ChevronRight, ArrowLeft } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import '../Login.css';
import './CommanderLogin.css';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

function normalizePhone(phone) {
  const digits = String(phone).replace(/\D/g, '');
  const ten = digits.startsWith('91') && digits.length > 10 ? digits.slice(-10) : digits;
  if (!/^\d{10}$/.test(ten)) throw new Error('Enter a valid 10-digit mobile number.');
  return ten;
}

async function backendPost(endpoint, body) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || data.message || `Error ${res.status}`);
  return data;
}

export function CommanderLogin() {
  const navigate = useNavigate();
  const [mode, setMode] = useState('login');   // 'login' | 'register'
  const [step, setStep] = useState('phone');   // 'phone' | 'otp'
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const handleSendOtp = async (e) => {
    e?.preventDefault();
    setError(''); setInfo('');
    let normalized;
    try { normalized = normalizePhone(phone); } catch (err) { setError(err.message); return; }
    setLoading(true);
    try {
      const data = await backendPost('/api/v1/officer-auth/send-otp', {
        phone: normalized,
        name: mode === 'register' ? name.trim() || 'Officer' : 'Officer',
        email: mode === 'register' ? email.trim() : '',
      });
      setStep('otp');
      setInfo(data?.dev_otp ? `Dev OTP: ${data.dev_otp}` : 'OTP sent to your mobile number.');
    } catch (err) {
      setError(err.message || 'Could not send OTP. Try again.');
    } finally { setLoading(false); }
  };

  const handleVerifyOtp = async (e) => {
    e?.preventDefault();
    setError(''); setInfo('');
    if (otp.trim().length < 4) { setError('Enter the OTP received on your phone.'); return; }
    setLoading(true);
    try {
      const normalized = normalizePhone(phone);
      const data = await backendPost('/api/v1/officer-auth/verify-otp', {
        phone: normalized,
        otp: otp.trim(),
      });
      localStorage.setItem('jansetu_officer_token', data.access_token);
      localStorage.setItem('jansetu_officer_refresh_token', data.refresh_token || '');
      localStorage.setItem('jansetu_role', data.role || 'officer');
      localStorage.setItem('jansetu_user', JSON.stringify({
        name: data.name || 'Commander',
        role: data.role || 'officer',
        user_id: data.user_id || '',
        phone: normalized,
      }));
      navigate('/officer', { replace: true });
    } catch (err) {
      setError(err.message || 'Invalid OTP.');
    } finally { setLoading(false); }
  };

  const reset = () => { setStep('phone'); setOtp(''); setInfo(''); setError(''); };

  return (
    <div className="commander-login-page">
      {/* Background grid */}
      <div className="commander-bg-grid" />
      
      {/* Ambient glows */}
      <div className="commander-glow commander-glow--1" />
      <div className="commander-glow commander-glow--2" />

      <motion.div
        className="commander-card"
        initial={{ y: 40, opacity: 0, scale: 0.96 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Header */}
        <div className="commander-header">
          <motion.div
            className="commander-badge"
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 300, damping: 20 }}
          >
            <Shield size={26} />
          </motion.div>
          <div>
            <h1 className="commander-title">JanSetu Command</h1>
            <p className="commander-subtitle">
              {mode === 'login' ? 'Officer & Commander Portal' : 'Register as Commander'}
            </p>
          </div>
        </div>

        {/* Mode Toggle — only on phone step */}
        {step === 'phone' && (
          <div className="commander-tabs">
            <button
              className={`commander-tab ${mode === 'login' ? 'active' : ''}`}
              onClick={() => { setMode('login'); setError(''); setInfo(''); }}
            >
              <Lock size={13} /> Login
            </button>
            <button
              className={`commander-tab ${mode === 'register' ? 'active' : ''}`}
              onClick={() => { setMode('register'); setError(''); setInfo(''); }}
            >
              <UserPlus size={13} /> Register
            </button>
          </div>
        )}

        <AnimatePresence mode="wait">
          {step === 'phone' ? (
            <motion.form
              key="phone-form"
              className="commander-form"
              onSubmit={handleSendOtp}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
            >
              {/* Registration extra fields */}
              {mode === 'register' && (
                <>
                  <div className="commander-field-group">
                    <label>Full Name</label>
                    <input
                      type="text"
                      className="commander-input"
                      placeholder="Officer / Commander name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>
                  <div className="commander-field-group">
                    <label>Email <span style={{ opacity: 0.5 }}>(optional)</span></label>
                    <input
                      type="email"
                      className="commander-input"
                      placeholder="officer@jansetu.gov.in"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </>
              )}

              {/* Phone */}
              <div className="commander-field-group">
                <label>Mobile Number</label>
                <div className="commander-phone-field">
                  <span className="commander-phone-prefix">
                    🇮🇳 +91
                    <span className="commander-prefix-divider" />
                  </span>
                  <input
                    type="tel"
                    className="commander-input has-prefix"
                    placeholder="9876543210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    maxLength={10}
                    inputMode="numeric"
                    autoFocus={mode === 'login'}
                    required
                  />
                </div>
              </div>

              {error && <p className="commander-error">{error}</p>}

              <button type="submit" className="commander-submit-btn" disabled={loading}>
                {loading ? (
                  <span className="commander-spinner" />
                ) : (
                  <><Phone size={16} /> Send OTP <ChevronRight size={16} style={{ marginLeft: 'auto' }} /></>
                )}
              </button>
            </motion.form>
          ) : (
            <motion.form
              key="otp-form"
              className="commander-form"
              onSubmit={handleVerifyOtp}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <p className="commander-otp-hint">
                OTP sent to <strong style={{ color: 'var(--teal-primary)' }}>+91 {phone}</strong>
              </p>

              <div className="commander-field-group">
                <label>Enter OTP</label>
                <input
                  type="text"
                  className="commander-input commander-otp-input"
                  placeholder="• • • • • •"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  inputMode="numeric"
                  maxLength={6}
                  autoFocus
                  required
                />
              </div>

              {info  && <p className="commander-info">{info}</p>}
              {error && <p className="commander-error">{error}</p>}

              <button type="submit" className="commander-submit-btn" disabled={loading}>
                {loading ? (
                  <span className="commander-spinner" />
                ) : (
                  <><Lock size={16} /> Verify & Enter Dashboard <ChevronRight size={16} style={{ marginLeft: 'auto' }} /></>
                )}
              </button>

              <button
                type="button"
                className="commander-back-btn"
                onClick={reset}
              >
                <ArrowLeft size={13} /> Change phone number
              </button>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Footer */}
        <div className="commander-footer">
          <Lock size={11} />
          <span>Secured by JWT · OTP authentication · No Firebase</span>
        </div>

        {/* Citizen portal link */}
        <div style={{ textAlign: 'center', marginTop: 10 }}>
          <a href="/login" className="commander-citizen-link">
            → Go to Citizen Portal
          </a>
        </div>
      </motion.div>
    </div>
  );
}
