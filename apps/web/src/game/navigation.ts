import type { CreateGameResponse, Difficulty, FinishGameResponse } from '@recto/shared';
import type { LocalRecord } from './records';

/** État transmis à /partie/:id ; conservé par l'historique du navigateur. */
export interface GameLocationState {
  game: CreateGameResponse;
  categoryName: string;
}

/** État transmis à /partie/:id/resultat. */
export interface ResultLocationState {
  result: FinishGameResponse;
  previous: LocalRecord | undefined;
  improved: boolean;
  category: string;
  categoryName: string;
  difficulty: Difficulty;
}
