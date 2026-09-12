/** EF-4.1 — douze caractères au minimum ; le plafond protège le hachage d'entrées démesurées. */
export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 128;

/** Pseudonyme public : 3 à 20 lettres (accentuées comprises), chiffres, tirets ou soulignés. */
export const PSEUDO_PATTERN = /^[\p{L}\p{N}_-]{3,20}$/u;

/** EF-4.5 — bibliothèque d'avatars fournie ; pas de téléversement en V1. */
export const AVATARS = [
  'orbite',
  'prisme',
  'onde',
  'spirale',
  'damier',
  'eclat',
  'lune',
  'delta',
  'cible',
  'vague',
  'hexagone',
  'noeud',
] as const;

export type Avatar = (typeof AVATARS)[number];
export type UserRole = 'joueur' | 'admin';

export function isAvatar(value: unknown): value is Avatar {
  return typeof value === 'string' && (AVATARS as readonly string[]).includes(value);
}
