import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
} from 'firebase/auth';
import API_BASE_URL, { hasApiBaseUrl, apiBaseUrlError } from '../config/api';
import { auth, googleProvider } from './firebase';

const BASE_URL = API_BASE_URL;

async function post(endpoint: string, body: Record<string, unknown>) {
  if (!hasApiBaseUrl) throw new Error(apiBaseUrlError);

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || data.message || `Request failed (${res.status})`);
  return data;
}

function normalizePhone(phoneNumber: string) {
  const digits = String(phoneNumber).replace(/\D/g, '');
  const tenDigits = digits.startsWith('91') && digits.length > 10 ? digits.slice(-10) : digits;
  if (!/^\d{10}$/.test(tenDigits)) {
    throw new Error('Enter a valid 10-digit Indian mobile number.');
  }
  return `+91${tenDigits}`;
}

function ensureRecaptcha() {
  const w = window as Window & {
    recaptchaVerifier?: RecaptchaVerifier;
  };

  if (!w.recaptchaVerifier) {
    w.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
      size: 'invisible',
    });
  }

  return w.recaptchaVerifier;
}

export async function signInWithPhone(phoneNumber: string) {
  const normalized = normalizePhone(phoneNumber);
  // Prefer the verifier already created by the Login component's useEffect
  const w = window as Window & { recaptchaVerifier?: RecaptchaVerifier };
  if (!w.recaptchaVerifier) {
    // Create one as fallback — container may not exist yet, so use invisible size
    try {
      w.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
      });
    } catch (e) {
      throw new Error('Could not initialize reCAPTCHA. Make sure the page has loaded fully.');
    }
  }
  return signInWithPhoneNumber(auth, normalized, w.recaptchaVerifier);
}

export async function verifyOTP(confirmationResult: any, otp: string) {
  const credential = await confirmationResult.confirm(otp);
  const user = credential.user;
  const firebase_token = await user.getIdToken();

  const data = await post('/api/auth/firebase-login', {
    firebase_token,
    phone: user.phoneNumber || null,
    name: user.displayName || null,
  });

  localStorage.setItem('jansetu_token', data.jwt_token);
  localStorage.setItem('jansetu_role', data.role || 'citizen');
  return data;
}

export async function signInWithGoogle() {
  const result = await signInWithPopup(auth, googleProvider);
  const user = result.user;
  const firebase_token = await user.getIdToken();

  const data = await post('/api/auth/firebase-login', {
    firebase_token,
    email: user.email || null,
    name: user.displayName || null,
  });

  localStorage.setItem('jansetu_token', data.jwt_token);
  localStorage.setItem('jansetu_role', data.role || 'citizen');
  return data;
}

export async function signInOfficerWithGoogle() {
  const result = await signInWithPopup(auth, googleProvider);
  const user = result.user;
  const firebase_token = await user.getIdToken();

  const data = await post('/api/auth/firebase-officer-login', {
    firebase_token,
    email: user.email || null,
    name: user.displayName || null,
    phone: user.phoneNumber || null,
  });

  localStorage.setItem('jansetu_officer_token', data.jwt_token);
  localStorage.setItem('jansetu_role', data.role || 'officer');
  return data;
}

export async function signInWithEmail(email: string, password: string) {
  let result;
  try {
    result = await signInWithEmailAndPassword(auth, email, password);
  } catch (err: any) {
    const code = err?.code || '';
    if (code === 'auth/invalid-credential' || code === 'auth/user-not-found' || code === 'auth/wrong-password') {
      throw new Error('Firebase login failed: email/password invalid or user not created in Firebase Auth.');
    }
    throw err;
  }
  const user = result.user;
  const firebase_token = await user.getIdToken();

  const data = await post('/api/auth/firebase-officer-login', {
    firebase_token,
    email,
    name: user.displayName || null,
    phone: user.phoneNumber || null,
  });

  localStorage.setItem('jansetu_officer_token', data.jwt_token);
  localStorage.setItem('jansetu_role', data.role || 'officer');
  return data;
}

export async function registerOfficerWithEmail(email: string, password: string) {
  let result;
  try {
    result = await createUserWithEmailAndPassword(auth, email, password);
  } catch (err: any) {
    const code = err?.code || '';
    if (code === 'auth/email-already-in-use') {
      throw new Error('This email is already registered. Please login.');
    }
    if (code === 'auth/weak-password') {
      throw new Error('Password should be at least 6 characters.');
    }
    throw err;
  }

  const user = result.user;
  const firebase_token = await user.getIdToken();

  const data = await post('/api/auth/firebase-officer-login', {
    firebase_token,
    email,
    name: user.displayName || null,
    phone: user.phoneNumber || null,
  });

  localStorage.setItem('jansetu_officer_token', data.jwt_token);
  localStorage.setItem('jansetu_role', data.role || 'officer');
  return data;
}

export async function sendOfficerPasswordReset(email: string) {
  if (!email) throw new Error('Please enter your email first.');
  await sendPasswordResetEmail(auth, email);
  return true;
}

function normalizeOfficerPhone(phone: string) {
  const digits = String(phone).replace(/\D/g, '');
  const tenDigits = digits.startsWith('91') && digits.length > 10 ? digits.slice(-10) : digits;
  if (!/^\d{10}$/.test(tenDigits)) {
    throw new Error('Enter a valid 10-digit Indian mobile number.');
  }
  return tenDigits;
}

export async function requestOfficerOtp(phone: string, name = 'Officer', email = '') {
  const normalized = normalizeOfficerPhone(phone);
  return post('/api/v1/officer-auth/send-otp', { phone: normalized, name, email });
}

export async function verifyOfficerOtp(phone: string, otp: string) {
  const normalized = normalizeOfficerPhone(phone);
  const data = await post('/api/v1/officer-auth/verify-otp', { phone: normalized, otp });
  localStorage.setItem('jansetu_officer_token', data.access_token);
  localStorage.setItem('jansetu_officer_refresh_token', data.refresh_token);
  localStorage.setItem('jansetu_role', data.role || 'officer');
  return data;
}

export async function refreshOfficerToken() {
  const refreshToken = localStorage.getItem('jansetu_officer_refresh_token');
  if (!refreshToken) throw new Error('Missing refresh token');

  const res = await fetch(`${BASE_URL}/api/v1/officer-auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${refreshToken}`,
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || `Refresh failed (${res.status})`);

  localStorage.setItem('jansetu_officer_token', data.access_token);
  localStorage.setItem('jansetu_officer_refresh_token', data.refresh_token);
  localStorage.setItem('jansetu_role', data.role || 'officer');
  return data;
}

export async function signInOfficerWithPhone(phone: string, password: string) {
  const digits = String(phone).replace(/\D/g, '');
  const normalized = digits.startsWith('91') && digits.length > 10 ? digits.slice(-10) : digits;

  if (!/^\d{10}$/.test(normalized)) {
    throw new Error('Enter a valid 10-digit phone number.');
  }

  const data = await post('/api/v1/auth/officer-login', {
    phone: normalized,
    password,
  });

  const token = data?.access_token || data?.data?.access_token;
  const role = data?.role || data?.data?.role;

  if (!token) throw new Error('Officer login failed. Missing access token.');
  if (role === 'citizen') throw new Error('Officer access only');

  localStorage.setItem('jansetu_officer_token', token);
  localStorage.setItem('jansetu_role', role || 'officer');
  return data;
}

export async function logout() {
  const role = localStorage.getItem('jansetu_role');
  const isOfficer = role === 'officer' || role === 'admin';

  // Clear all stored tokens
  localStorage.removeItem('jansetu_token');
  localStorage.removeItem('jansetu_officer_token');
  localStorage.removeItem('jansetu_officer_refresh_token');
  localStorage.removeItem('jansetu_role');
  localStorage.removeItem('jansetu_user');

  // Firebase signOut only needed for citizen (Firebase auth) sessions
  if (!isOfficer) {
    try { await signOut(auth); } catch (_) { /* ignore if Firebase not initialized */ }
  }

  // Redirect to correct login page
  window.location.href = isOfficer ? '/officer/login' : '/login';
}

/** Convenience: officer-only logout — no Firebase, always goes to /officer/login */
export function officerLogout() {
  localStorage.removeItem('jansetu_token');
  localStorage.removeItem('jansetu_officer_token');
  localStorage.removeItem('jansetu_officer_refresh_token');
  localStorage.removeItem('jansetu_role');
  localStorage.removeItem('jansetu_user');
  window.location.href = '/officer/login';
}
