/**
 * registerSW.js
 * Domain-aware service worker registration for JanSetu.
 * - jansetu.in        → citizen manifest, citizen SW scope
 * - officer.jansetu.in → officer manifest, officer SW scope
 *
 * Called once from main.jsx on app boot.
 */

export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  // Skip service worker during development (avoids MIME/Codespaces issues)
  if (import.meta.env.DEV) {
    console.log('Skipping service worker in development');
    return;
  }

  const isOfficer = window.location.hostname.startsWith('officer.');

  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });

      // Swap manifest link based on domain
      const manifestLink = document.querySelector('link[rel="manifest"]');
      if (manifestLink) {
        manifestLink.href = isOfficer ? '/manifest-officer.json' : '/manifest-citizen.json';
      }

      // Update theme-color meta per domain
      const themeColor = document.querySelector('meta[name="theme-color"]');
      if (themeColor) {
        themeColor.content = isOfficer ? '#2E6E73' : '#26878F';
      }

      // Listen for SW updates — notify app
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        newWorker?.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // Dispatch custom event → app can show "Update available" toast
            window.dispatchEvent(new CustomEvent('sw-update-available'));
          }
        });
      });

      if (import.meta.env.DEV) {
        console.log(`[JanSetu PWA] SW registered — ${isOfficer ? 'Officer' : 'Citizen'} portal`);
      }
    } catch (err) {
      console.error('[JanSetu PWA] SW registration failed:', err);
    }
  });
}
