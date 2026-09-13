import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { App } from './App';
import { AuthProvider } from './auth/AuthContext';
import { setLocale } from './i18n';
import { installErrorReporting } from './lib/errorReporting';
import { loadPreferences } from './settings/preferences';
import { PreferencesProvider } from './settings/PreferencesContext';
import './styles/global.css';

installErrorReporting();
setLocale(loadPreferences().locale);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <PreferencesProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </PreferencesProvider>
    </BrowserRouter>
  </StrictMode>,
);
