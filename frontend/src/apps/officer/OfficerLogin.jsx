import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Shield } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '../../components/ui/Button';
// Pure backend OTP — NO Firebase dependency
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

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

function normalizePhone(phone) {
  const digits = String(phone).replace(/\D/g, '');
  const ten = digits.startsWith('91') && digits.length > 10 ? digits.slice(-10) : digits;
  if (!/^\d{10}$/.test(ten)) throw new Error('Enter a valid 10-digit mobile number.');
  return ten;
}

export function OfficerLogin() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [name, setName]   = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp]     = useState('');
  const [step, setStep]   = useState('request'); // 'request' | 'verify'
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');
  const [info, setInfo]     = useState('');

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!isLogin && !name.trim()) {
      setError('Name is required for registration.');
      return;
    }
    setLoading(true);
    setError('');
    setInfo('');
    try {
      const normalized = normalizePhone(phone);
      const data = await backendPost('/api/v1/officer-auth/send-otp', {
        phone: normalized,
        name: isLogin ? 'Officer' : name,
        email: isLogin ? '' : email,
      });
      setStep('verify');
      if (data?.dev_otp) {
        setInfo(`Dev OTP: ${data.dev_otp}`);
      } else {
        setInfo('OTP sent to your mobile number.');
      }
    } catch (err) {
      setError(err.message || 'Could not send OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setInfo('');
    try {
      const normalized = normalizePhone(phone);
      const data = await backendPost('/api/v1/officer-auth/verify-otp', {
        phone: normalized,
        otp: otp.trim(),
      });
      // Store JWT tokens
      localStorage.setItem('jansetu_officer_token', data.access_token);
      localStorage.setItem('jansetu_officer_refresh_token', data.refresh_token || '');
      localStorage.setItem('jansetu_role', data.role || 'officer');
      localStorage.setItem('jansetu_user', JSON.stringify({
        name: data.name || 'Officer',
        role: data.role || 'officer',
        user_id: data.user_id || '',
        phone: normalized,
      }));
      navigate('/officer/dashboard');
    } catch (err) {
      setError(err.message || 'Invalid OTP.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <motion.div
        className="login-card glass glass--layer-4"
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: [-6, 0, -6], opacity: 1 }}
        transition={{
          y: { duration: 4, repeat: Infinity, ease: 'easeInOut' },
          opacity: { duration: 0.6, ease: 'easeOut' },
        }}
      >
        <motion.div
          className="login-brand"
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 22 }}
        >
          <div className="login-brand__icon">
            <Shield size={28} color="white" />
          </div>
          <h1 className="login-brand__title">JanSetu</h1>
          <p className="login-brand__subtitle">
            {isLogin ? 'Commander Login' : 'Commander Registration'}
          </p>
        </motion.div>

        <form onSubmit={step === 'request' ? handleSendOtp : handleVerifyOtp} className="login-form">

          {/* Login / Register toggle */}
          {step === 'request' && (
            <div style={{ display: 'flex', gap: 10, marginBottom: 20, justifyContent: 'center' }}>
              <Button
                type="button"
                variant={isLogin ? 'primary' : 'outline'}
                onClick={() => { setIsLogin(true); setError(''); setInfo(''); }}
                style={{ flex: 1, padding: '8px 0', fontSize: 14 }}
              >
                Login
              </Button>
              <Button
                type="button"
                variant={!isLogin ? 'primary' : 'outline'}
                onClick={() => { setIsLogin(false); setError(''); setInfo(''); }}
                style={{ flex: 1, padding: '8px 0', fontSize: 14 }}
              >
                Register
              </Button>
            </div>
          )}

          {/* Phone */}
          <div className="login-input-group">
            <label>Phone Number</label>
            <div className="login-field">
              <input
                type="tel"
                placeholder="9876543210"
                className="login-input"
                style={{ paddingLeft: 14 }}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                disabled={step === 'verify'}
              />
            </div>
          </div>

          {/* Registration extra fields */}
          {step === 'request' && !isLogin && (
            <>
              <div className="login-input-group">
                <label>Full Name</label>
                <div className="login-field">
                  <input
                    type="text"
                    placeholder="Officer name"
                    className="login-input"
                    style={{ paddingLeft: 14 }}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="login-input-group">
                <label>Email (optional)</label>
                <div className="login-field">
                  <input
                    type="email"
                    placeholder="officer@jansetu.in"
                    className="login-input"
                    style={{ paddingLeft: 14 }}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>
            </>
          )}

          {/* OTP field */}
          {step === 'verify' && (
            <div className="login-input-group">
              <label>OTP</label>
              <div className="login-field">
                <input
                  type="text"
                  placeholder="Enter 6-digit OTP"
                  className="login-input"
                  style={{ paddingLeft: 14, letterSpacing: 4, fontSize: 18 }}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  required
                  maxLength={6}
                  inputMode="numeric"
                  autoFocus
                />
              </div>
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            loading={loading}
            style={{ marginTop: 12, height: 48, fontSize: 16, width: '100%' }}
          >
            {loading ? (
              step === 'request' ? 'Sending OTP…' : 'Verifying…'
            ) : (
              <><Lock size={16} style={{ marginRight: 6 }} />
              {step === 'request' ? 'Send OTP' : 'Verify & Enter Dashboard'}</>
            )}
          </Button>

          {step === 'verify' && (
            <button
              type="button"
              onClick={() => { setStep('request'); setOtp(''); setInfo(''); setError(''); }}
              style={{
                marginTop: 10, background: 'transparent', border: 'none',
                color: 'var(--teal-primary)', fontSize: 13, cursor: 'pointer', width: '100%',
              }}
            >
              ← Change phone number
            </button>
          )}

          {error && <p style={{ color: '#ff6b6b', marginTop: 10, fontSize: 13, textAlign: 'center' }}>{error}</p>}
          {info  && <p style={{ color: '#22c55e', marginTop: 10, fontSize: 13, textAlign: 'center' }}>{info}</p>}
        </form>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 16, fontSize: 12, color: 'var(--text-secondary)' }}>
          <Lock size={12} />
          JWT · OTP secured · No Firebase
        </div>
      </motion.div>
    </div>
  );
}
