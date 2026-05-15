import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { ThemeProvider } from './contexts/ThemeContext.jsx';
import { registerServiceWorker } from './registerSW.js';

// ── Register domain-aware Service Worker ─────────────────────────────
registerServiceWorker();

function AmbientBackground() {
  return (
    <div className="ambient-bg">
      <div className="ambient-orb-1" />
      <div className="ambient-orb-2" />
    </div>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <AmbientBackground />
      <App />
    </ThemeProvider>
  </StrictMode>,
);
