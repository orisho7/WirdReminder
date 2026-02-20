/**
 * reader-entry.tsx
 * 
 * Mounts the React ReaderView into #reader-root ONLY on native Capacitor platforms.
 * This runs as a module script alongside app.js in index.html.
 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import ReaderView from './components/ReaderView';

const isNative =
  (window as any).Capacitor &&
  (window as any).Capacitor.getPlatform() !== 'web';

if (isNative) {
  const mount = document.getElementById('reader-root');
  if (mount) {
    ReactDOM.createRoot(mount).render(
      <React.StrictMode>
        <ReaderView />
      </React.StrictMode>
    );
    console.log('[Wird] ReaderView (React) mounted on native platform.');
  }
}
