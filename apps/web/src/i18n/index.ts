import type { Difficulty } from '@recto/shared';
import type { Locale } from '../settings/preferences';
import { fr, type MessageKey } from './fr';

export type { MessageKey };

/**
 * EF-8.4 — dictionnaires par langue. Le français fait référence : toute autre langue doit en
 * fournir chaque clé, ce que le type impose. Ajouter l'anglais revient à créer `en.ts`, à
 * l'inscrire ici et à étendre `Locale`.
 */
export type Messages = Record<MessageKey, string>;

const dictionaries: Record<Locale, Messages> = { fr };

/** Langues proposées dans les paramètres ; celles qui ne sont pas encore traduites y figurent désactivées. */
export const LOCALES: readonly { code: string; label: string; available: boolean }[] = [
  { code: 'fr', label: 'Français', available: true },
  { code: 'en', label: 'English', available: false },
];

let current: Messages = dictionaries.fr;

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
