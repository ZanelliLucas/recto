import type { Difficulty } from '@recto/shared';
import type { Locale } from '../settings/preferences';
import { en } from './en';
import { fr, type MessageKey } from './fr';

export type { MessageKey };

/**
 * EF-8.4 — dictionnaires par langue. Le français fait référence : toute autre langue doit en
 * fournir chaque clé, ce que le type impose. Ajouter une langue revient à créer son fichier, à
 * l'inscrire ici et à étendre `Locale`.
 */
export type Messages = Record<MessageKey, string>;

export const dictionaries: Record<Locale, Messages> = { fr, en };

/** Langues proposées dans les paramètres, chacune dans sa propre langue. */
export const LOCALES: readonly { code: Locale; label: string }[] = [
  { code: 'fr', label: 'Français' },
  { code: 'en', label: 'English' },
];

let current: Messages = dictionaries.fr;

/** Change la langue des textes ; l'arbre React doit être rendu à nouveau (PreferencesProvider). */
export function setLocale(locale: Locale): void {
  current = dictionaries[locale];
  document.documentElement.lang = locale;
}

/** Traduit une clé ; `{nom}` est remplacé par le paramètre correspondant. */
export function t(key: MessageKey, params?: Record<string, string | number>): string {
  const template = current[key];
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => (name in params ? String(params[name]) : match));
}

export function difficultyLabel(difficulty: Difficulty): string {
  return t(`difficulty.${difficulty}`);
}
