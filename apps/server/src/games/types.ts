import type { Difficulty, GameStatus } from '@recto/shared';

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
  createdAt: number;
  /** Instant serveur où le chronomètre démarre, soit la fin du décompte. */
  startedAt: number | null;
  pausedAt: number | null;
  pausedMs: number;
  finishedAt: number | null;
  durationMs: number | null;
  moves: number | null;
}
