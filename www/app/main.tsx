import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './i18n';
import '../styles/theme.css';

// Early exit for native platforms to prevent React from running on mobile
if ((window as any).Capacitor && (window as any).Capacitor.isNativePlatform) {
  console.log('[Wird] Native platform detected. React landing page will not be mounted.');
} else {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
