import { readJson, writeJson } from '../lib/storage';

/**
 * EF-8.1 — réglages persistants, conservés dans le navigateur : ils valent pour les invités
 * comme pour les comptes, et ne quittent jamais l'appareil (ENF-6.1).
 */
export type ThemePreference = 'sombre' | 'clair' | 'systeme';
export type MotionPreference = 'systeme' | 'reduites';
export type Locale = 'fr';

export interface Preferences {
  sound: boolean;
  motion: MotionPreference;
  theme: ThemePreference;
  locale: Locale;
}

/** Clé partagée avec public/boot.js, qui applique thème et animations avant le premier affichage. */
export const PREFERENCES_KEY = 'recto.preferences';

/** § 6.1 — thème sombre par défaut ; son désactivé tant que le joueur ne l'a pas demandé. */
export const DEFAULT_PREFERENCES: Preferences = { sound: false, motion: 'systeme', theme: 'sombre', locale: 'fr' };

const THEMES: readonly ThemePreference[] = ['sombre', 'clair', 'systeme'];
const MOTIONS: readonly MotionPreference[] = ['systeme', 'reduites'];

/** Valeurs relues sans confiance : un stockage altéré retombe sur les valeurs par défaut. */
export function sanitizePreferences(raw: unknown): Preferences {
  const value = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};
  return {
    sound: typeof value.sound === 'boolean' ? value.sound : DEFAULT_PREFERENCES.sound,
    motion: MOTIONS.includes(value.motion as MotionPreference) ? (value.motion as MotionPreference) : DEFAULT_PREFERENCES.motion,
    theme: THEMES.includes(value.theme as ThemePreference) ? (value.theme as ThemePreference) : DEFAULT_PREFERENCES.theme,
    locale: 'fr',
  };
}

export const loadPreferences = (): Preferences => sanitizePreferences(readJson<unknown>(PREFERENCES_KEY, null));
export const savePreferences = (preferences: Preferences): void => writeJson(PREFERENCES_KEY, preferences);

export interface SystemPreferences {
  prefersLight: boolean;
  prefersReducedMotion: boolean;
}

export function resolveTheme(theme: ThemePreference, system: SystemPreferences): 'dark' | 'light' {
  if (theme === 'systeme') return system.prefersLight ? 'light' : 'dark';
  return theme === 'clair' ? 'light' : 'dark';
}

/** ENF-4.3 — la préférence système prévaut toujours ; le réglage ne peut qu'ajouter la réduction. */
export function resolveReducedMotion(motion: MotionPreference, system: SystemPreferences): boolean {
  return motion === 'reduites' || system.prefersReducedMotion;
}
