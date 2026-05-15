/**
 * PWAInstallBanner.jsx
 * Shows a bottom banner prompting the user to install the app.
 * Used in both Citizen and Officer layouts.
 * Hides automatically once installed or dismissed.
 */

import React, { useState } from 'react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { Download, X, RefreshCw, Smartphone } from 'lucide-react';

export function PWAInstallBanner() {
  const { isInstallable, isInstalled, installApp, updateAvailable, reloadForUpdate } = usePWAInstall();
  const [dismissed, setDismissed] = useState(false);

  const isOfficer = window.location.hostname.startsWith('officer.');

  // ── Update available toast ────────────────────────────────────────
  if (updateAvailable) {
    return (
      <div style={{
        position: 'fixed', bottom: isOfficer ? 20 : 76, left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(10, 22, 40, 0.95)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(0, 201, 167, 0.25)',
        color: 'var(--text-primary)',
        borderRadius: 16, padding: '12px 20px',
        display: 'flex', alignItems: 'center', gap: 12,
        boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(0,201,167,0.08)',
        zIndex: 9999, animation: 'fadeIn 0.3s ease',
        maxWidth: 420, width: 'calc(100% - 32px)',
      }}>
        <RefreshCw size={18} style={{ flexShrink: 0, color: 'var(--teal-primary)' }} />
        <div style={{ flex: 1, fontSize: 13 }}>
          <div style={{ fontWeight: 600, marginBottom: 2, color: 'var(--text-primary)' }}>Update Available</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>A new version of JanSetu is ready.</div>
        </div>
        <button
          onClick={reloadForUpdate}
          style={{
            background: 'linear-gradient(135deg, var(--teal-primary), var(--teal-deep))',
            color: 'white', border: 'none',
            borderRadius: 10, padding: '6px 14px', fontSize: 12,
            fontWeight: 700, cursor: 'pointer', flexShrink: 0,
            boxShadow: '0 4px 12px rgba(0,201,167,0.3)',
          }}
        >
          Update
        </button>
      </div>
    );
  }

  // ── Install prompt banner ─────────────────────────────────────────
  if (!isInstallable || isInstalled || dismissed) return null;

  const appName = isOfficer ? 'JanSetu Officer' : 'JanSetu';
  const appDesc = isOfficer
    ? 'Install for quick access to your command dashboard'
    : 'Install for offline access and quick complaint filing';

  return (
    <div style={{
      position: 'fixed',
      bottom: isOfficer ? 20 : 76,
      left: '50%',
      transform: 'translateX(-50%)',
      background: 'rgba(10, 22, 40, 0.92)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      border: '1px solid rgba(0, 201, 167, 0.2)',
      borderRadius: 20,
      padding: '14px 18px',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      boxShadow: '0 8px 40px rgba(0,0,0,0.4), 0 0 0 1px rgba(0,201,167,0.06)',
      zIndex: 9999,
      animation: 'fadeIn 0.3s ease',
      maxWidth: 420,
      width: 'calc(100% - 32px)',
    }}>
      {/* App icon */}
      <div style={{
        width: 44, height: 44, borderRadius: 12,
        background: 'linear-gradient(135deg, var(--teal-primary), var(--teal-deep))',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
        boxShadow: '0 4px 12px rgba(0,201,167,0.3)',
      }}>
        <Smartphone size={22} color="white" />
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', marginBottom: 2 }}>
          Install {appName}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
          {appDesc}
        </div>
      </div>

      {/* Install button */}
      <button
        onClick={installApp}
        style={{
          background: 'linear-gradient(135deg, var(--teal-primary), var(--teal-deep))',
          color: 'white', border: 'none', borderRadius: 12,
          padding: '8px 14px', fontSize: 12, fontWeight: 700,
          cursor: 'pointer', display: 'flex', alignItems: 'center',
          gap: 5, flexShrink: 0,
          boxShadow: '0 4px 12px rgba(0,201,167,0.3)',
          transition: 'all 0.2s ease',
        }}
      >
        <Download size={14} /> Install
      </button>

      {/* Dismiss */}
      <button
        onClick={() => setDismissed(true)}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--text-tertiary)', padding: 4, flexShrink: 0,
        }}
        aria-label="Dismiss install prompt"
      >
        <X size={16} />
      </button>
    </div>
  );
}
