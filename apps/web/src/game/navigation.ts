import type { CardImage, CreateGameResponse, Difficulty, FinishGameResponse, Performance } from '@recto/shared';

/** État transmis à /partie/:id ; conservé par l'historique du navigateur. */
export interface GameLocationState {
  game: CreateGameResponse;
  categoryName: string;
  /** Partie du défi du jour : le classement suit le résultat. */
  daily?: boolean;
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
  /** Images de la partie, revues après coup ; absentes d'un historique antérieur à leur ajout. */
  cards?: CardImage[];
  /** Images d'au moins une paire manquée : celles que la mémoire a laissé filer (EF-7.3). */
  missed?: string[];
  /** Partie du défi du jour : le classement est proposé à la suite du résultat. */
  daily?: boolean;
}
