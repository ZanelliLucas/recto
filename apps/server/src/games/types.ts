import type { Difficulty, FinishGameResponse, GameStatus } from '@recto/shared';

/** Joueur à l'origine d'une partie : clé de tirage (compte ou navigateur invité) et compte éventuel. */
export interface Player {
  key: string;
  userId: string | null;
}

/** Correspond à l'entité `games` du modèle de données (§ 5.2). */
export interface GameRecord {
  id: string;
  token: string;
  /** Joueur à l'origine de la partie : invité (cookie) au lot 1, compte au lot 3. */
  playerKey: string;
  userId: string | null;
  categoryId: string;
  difficulty: Difficulty;
  seed: number;
  imageIds: string[];
  deck: string[];
  status: GameStatus;
  /** Jour du défi quand la partie en relève : le tirage est alors le même pour tous. */
  dailyDay: string | null;
  createdAt: number;
  /** Instant serveur où le chronomètre démarre, soit la fin du décompte. */
  startedAt: number | null;
  pausedAt: number | null;
  pausedMs: number;
  finishedAt: number | null;
  durationMs: number | null;
  moves: number | null;
  /** Joueur connecté : comparaison au record établie à la clôture. */
  recordOutcome: NonNullable<FinishGameResponse['record']> | null;
}
