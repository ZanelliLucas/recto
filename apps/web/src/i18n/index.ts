import type { Difficulty } from '@recto/shared';
import { fr, type MessageKey } from './fr';

export type { MessageKey };

/** Traduit une clé ; `{nom}` est remplacé par le paramètre correspondant. */
export function t(key: MessageKey, params?: Record<string, string | number>): string {
  const template: string = fr[key];
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => (name in params ? String(params[name]) : match));
}

export function difficultyLabel(difficulty: Difficulty): string {
  return t(`difficulty.${difficulty}`);
}
