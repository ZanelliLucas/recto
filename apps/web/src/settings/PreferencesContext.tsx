import { createContext, Fragment, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { setLocale } from '../i18n';
import {
  loadPreferences,
  resolveReducedMotion,
  resolveTheme,
  savePreferences,
  type Preferences,
  type SystemPreferences,
} from './preferences';

interface PreferencesValue {
  preferences: Preferences;
  update: (patch: Partial<Preferences>) => void;
  /** Réduction effective : réglage du site ou préférence du système. */
  reducedMotion: boolean;
}

const PreferencesContext = createContext<PreferencesValue | null>(null);

const LIGHT = '(prefers-color-scheme: light)';
const REDUCED = '(prefers-reduced-motion: reduce)';

function readSystem(): SystemPreferences {
  const matches = (query: string) => typeof window.matchMedia === 'function' && window.matchMedia(query).matches;
  return { prefersLight: matches(LIGHT), prefersReducedMotion: matches(REDUCED) };
}

/** Suit les préférences du système, qui peuvent changer en cours de visite. */
function useSystemPreferences(): SystemPreferences {
  const [system, setSystem] = useState(readSystem);
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const queries = [window.matchMedia(LIGHT), window.matchMedia(REDUCED)];
    const onChange = () => setSystem(readSystem());
    for (const query of queries) query.addEventListener('change', onChange);
    return () => {
      for (const query of queries) query.removeEventListener('change', onChange);
    };
  }, []);
  return system;
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState(loadPreferences);
  const system = useSystemPreferences();
  const theme = resolveTheme(preferences.theme, system);
  const reducedMotion = resolveReducedMotion(preferences.motion, system);

  // Mêmes attributs que public/boot.js : toute la feuille de style s'y rattache.
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    if (reducedMotion) root.dataset.motion = 'reduced';
    else delete root.dataset.motion;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'light' ? '#f3f5f8' : '#0b0f14');
  }, [theme, reducedMotion]);

  const update = useCallback((patch: Partial<Preferences>) => {
    // La langue change avant le rendu suivant : tous les textes le prennent en compte.
    if (patch.locale) setLocale(patch.locale);
    setPreferences((current) => {
      const next = { ...current, ...patch };
      savePreferences(next);
      return next;
    });
  }, []);

  const value = useMemo(() => ({ preferences, update, reducedMotion }), [preferences, update, reducedMotion]);
  // Changement de langue : l'arbre est reconstruit, composants mémoïsés compris.
  return (
    <PreferencesContext.Provider value={value}>
      <Fragment key={preferences.locale}>{children}</Fragment>
    </PreferencesContext.Provider>
  );
}

export function usePreferences(): PreferencesValue {
  const value = useContext(PreferencesContext);
  if (!value) throw new Error('usePreferences doit être employé sous PreferencesProvider');
  return value;
}
