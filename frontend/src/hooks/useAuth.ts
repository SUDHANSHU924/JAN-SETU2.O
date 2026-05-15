import { useEffect, useState } from 'react';
import { logout, officerLogout } from '../lib/authHelpers';

/**
 * useAuth — works for BOTH citizen (Firebase) and officer (JWT/OTP) sessions.
 *
 * Officer path: reads jansetu_officer_token + jansetu_role from localStorage.
 *               Never touches Firebase — officer app uses backend JWT only.
 *
 * Citizen path: uses Firebase onAuthStateChanged as before.
 */
export function useAuth() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    const storedRole = localStorage.getItem('jansetu_role');
    const officerToken = localStorage.getItem('jansetu_officer_token');
    const isOfficerSession =
      (storedRole === 'officer' || storedRole === 'admin') && !!officerToken;

    // ── Officer JWT session — no Firebase needed ─────────────────────────────
    if (isOfficerSession) {
      setRole(storedRole);
      setUser({ uid: 'officer-jwt-session', isOfficer: true });
      setLoading(false);
      return; // skip Firebase entirely
    }

    // ── Citizen session — use Firebase ──────────────────────────────────────
    let unsub: (() => void) | undefined;

    (async () => {
      try {
        const { onAuthStateChanged } = await import('firebase/auth');
        const { auth } = await import('../lib/firebase');

        unsub = onAuthStateChanged(auth, (firebaseUser) => {
          // Re-check officer token in case login happened after mount
          const latestRole = localStorage.getItem('jansetu_role');
          const latestToken = localStorage.getItem('jansetu_officer_token');
          if ((latestRole === 'officer' || latestRole === 'admin') && latestToken) {
            setRole(latestRole);
            setUser({ uid: 'officer-jwt-session', isOfficer: true });
            setLoading(false);
            return;
          }

          setUser(firebaseUser);
          // If Firebase user is present but role wasn't persisted yet, default citizen
          const resolvedRole = latestRole || (firebaseUser ? 'citizen' : null);
          setRole(resolvedRole);
          setLoading(false);

          if (!firebaseUser) {
            localStorage.removeItem('jansetu_token');
            if (latestRole === 'citizen') {
              localStorage.removeItem('jansetu_role');
            }
          }
        });
      } catch (err) {
        // Firebase unavailable (officer-only environment) — still resolve loading
        console.info('[useAuth] Firebase not available, using localStorage auth only');
        setLoading(false);
      }
    })();

    return () => unsub?.();
  }, []);

  return {
    user,
    loading,
    role,
    isOfficer: role === 'officer' || role === 'admin',
    isCitizen: role === 'citizen',
    isAdmin: role === 'admin',
    // Return correct logout based on session type
    logout: (role === 'officer' || role === 'admin') ? officerLogout : logout,
  };
}
