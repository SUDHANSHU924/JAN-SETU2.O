import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

// Vite exposes VITE_* env vars; fallback to REACT_APP_* for legacy support
const firebaseConfig = {
  apiKey:     import.meta.env.VITE_FIREBASE_API_KEY     || import.meta.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || import.meta.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId:  import.meta.env.VITE_FIREBASE_PROJECT_ID  || import.meta.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || import.meta.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || import.meta.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId:      import.meta.env.VITE_FIREBASE_APP_ID      || import.meta.env.REACT_APP_FIREBASE_APP_ID,
};

// Safe initialization — officer app never needs Firebase, so we must not crash
let app: ReturnType<typeof initializeApp> | null = null;
let auth: ReturnType<typeof getAuth>;
let googleProvider: GoogleAuthProvider;

try {
  if (!firebaseConfig.apiKey) {
    throw new Error('Firebase apiKey missing — officer-only mode, skipping Firebase init');
  }
  app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  auth = getAuth(app);
  googleProvider = new GoogleAuthProvider();
} catch (e) {
  // Officer app does not use Firebase — safe to continue without it
  console.info('[Firebase] Not initialized (officer-only mode or missing config):', (e as Error).message);
  // Create a minimal stub so imports don't crash
  auth = { currentUser: null, onAuthStateChanged: (_cb: any) => () => {} } as any;
  googleProvider = new GoogleAuthProvider();
}

export { app, auth, googleProvider };
