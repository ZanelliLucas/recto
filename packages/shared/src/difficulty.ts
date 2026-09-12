export interface DifficultySpec {
  /** Nombre de paires à retrouver ; la grille affiche le double de cartes. */
  readonly pairs: number;
  /** Disposition sur écran large (ENF-3.1). Les écrans étroits recomposent la grille. */
  readonly cols: number;
  readonly rows: number;
}

/**
 * EF-2 — la difficulté se définit par le nombre de paires (arbitrage A-2 / H-1 :
 * « 15 images » et « 30 images » désignent des paires, soit 30 et 60 cartes).
 */
export const DIFFICULTIES = {
  facile: { pairs: 8, cols: 4, rows: 4 },
  normal: { pairs: 15, cols: 6, rows: 5 },
  difficile: { pairs: 30, cols: 10, rows: 6 },
} as const satisfies Record<string, DifficultySpec>;

export type Difficulty = keyof typeof DIFFICULTIES;

export const DIFFICULTY_ORDER = ['facile', 'normal', 'difficile'] as const satisfies readonly Difficulty[];

/** Difficultés proposées par une catégorie qui monte jusqu'à `max`. */
export function difficultiesUpTo(max: Difficulty): Difficulty[] {
  return DIFFICULTY_ORDER.slice(0, DIFFICULTY_ORDER.indexOf(max) + 1);
}

export function isDifficulty(value: unknown): value is Difficulty {
  return typeof value === 'string' && Object.hasOwn(DIFFICULTIES, value);
}

/** EF-3.8 — une catégorie doit contenir au moins le double des images requises par une difficulté. */
export function minImagesFor(difficulty: Difficulty): number {
  return DIFFICULTIES[difficulty].pairs * 2;
}
