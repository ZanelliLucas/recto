import type { CreateGameResponse, Difficulty, FinishGameResponse, Performance } from '@recto/shared';

/** État transmis à /partie/:id ; conservé par l'historique du navigateur. */
export interface GameLocationState {
  game: CreateGameResponse;
  categoryName: string;
}

/** État transmis à /partie/:id/resultat. */
export interface ResultLocationState {
  result: FinishGameResponse;
  /** Record détenu avant la partie : celui du compte, ou du navigateur pour un invité (EF-5.1). */
  previous: Performance | null;
  improved: boolean;
  category: string;
  categoryName: string;
  difficulty: Difficulty;
}
