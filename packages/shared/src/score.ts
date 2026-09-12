/** Décompte présenté après le préchargement ; le chronomètre démarre à son issue (EF-1, étape 3). */
export const COUNTDOWN_MS = 3000;

/** Délai avant le retournement d'une paire incorrecte, interactions neutralisées (EF-1, étape 4). */
export const MISMATCH_DELAY_MS = 900;

/** Seuil plancher de vraisemblance : 300 ms par paire (ENF-1.2). */
export const MIN_MS_PER_PAIR = 300;

export function minDurationMs(pairs: number): number {
  return pairs * MIN_MS_PER_PAIR;
}

/** EF-1.3 — paires trouvées ÷ nombre de coups, entre 0 et 1. */
export function accuracy(pairs: number, moves: number): number {
  return moves === 0 ? 0 : pairs / moves;
}

export interface Performance {
  readonly durationMs: number;
  readonly moves: number;
}

/** EF-1.1 — le temps prime, le nombre de coups départage. Négatif si `a` est meilleur que `b`. */
export function comparePerformances(a: Performance, b: Performance): number {
  return a.durationMs - b.durationMs || a.moves - b.moves;
}
