import type { Difficulty } from './difficulty';

/** Le défi dure une journée civile française, quel que soit le fuseau du joueur. */
const DAY_FORMAT = new Intl.DateTimeFormat('fr-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' });

/** Jour du défi au format AAAA-MM-JJ. */
export function dailyDay(at: number | Date = Date.now()): string {
  return DAY_FORMAT.format(at instanceof Date ? at : new Date(at));
}

/** Défi du jour : quinze paires, assez pour se mesurer sans y passer la soirée. */
export const DAILY_DIFFICULTY: Difficulty = 'normal';

/**
 * Empreinte FNV-1a : deux serveurs, deux navigateurs, deux jours plus tard, la même chaîne donne
 * le même nombre. C'est ce qui garantit que tout le monde affronte la même grille.
 */
export function hashString(value: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** Graine du tirage du jour : identique pour tous les joueurs, différente d'un jour à l'autre. */
export const dailySeed = (day: string): number => hashString(`recto:tirage:${day}`);

/**
 * Catégorie du jour. Les slugs sont triés avant le tirage : le défi ne doit pas changer parce que
 * l'API a renvoyé les catégories dans un autre ordre, ni parce qu'un tri a été modifié au
 * back-office en cours de journée.
 */
export function dailyCategory(day: string, slugs: readonly string[]): string | null {
  if (slugs.length === 0) return null;
  const ordered = [...new Set(slugs)].sort();
  return ordered[hashString(`recto:categorie:${day}`) % ordered.length] ?? null;
}
