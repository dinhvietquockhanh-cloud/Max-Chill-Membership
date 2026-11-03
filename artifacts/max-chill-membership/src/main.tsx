import { createRoot } from 'react-dom/client';

import App from './App';
import { ErrorBoundary } from '@/components/error-boundary';

import './index.css';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const appScope = new URL(import.meta.env.BASE_URL, window.location.origin).href;
    navigator.serviceWorker
      .getRegistration(appScope)
      .then(registration => {
        if (registration?.scope === appScope) return registration.unregister();
        return undefined;
      })
      .catch((error: unknown) => {
        console.error('Không thể gỡ service worker cũ:', error);
      });
  });
}

createRoot(document.getElementById('root')!, {
  // Keeps caught errors off reportError(), which would raise the dev overlay.
  onCaughtError: (error, errorInfo) => {
    console.error(error, errorInfo.componentStack);
  },
}).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);
