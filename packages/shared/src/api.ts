import type { Difficulty } from './difficulty';
import type { Move } from './replay';

export type GameStatus = 'preparee' | 'en_cours' | 'terminee' | 'abandonnee' | 'rejetee';

export interface CategorySummary {
  slug: string;
  name: string;
  description: string;
  imageCount: number;
  thumbnailUrl: string;
  /** Difficultés que la volumétrie de la catégorie autorise (EF-3.8). */
  difficulties: Difficulty[];
}

export interface CardImage {
  id: string;
  url: string;
  /** Titre de l'image, qui alimente aussi son texte de remplacement (ENF-4.5). */
  title: string;
}

export interface CreateGameRequest {
  category: string;
  difficulty: Difficulty;
}

export interface CreateGameResponse {
  gameId: string;
  /** Secret de partie : prouve que les appels suivants émanent de celui qui l'a ouverte. */
  token: string;
  category: string;
  difficulty: Difficulty;
  pairs: number;
  /** Identifiant de l'image portée par chaque position de la grille. */
  deck: string[];
  images: CardImage[];
}

export interface GameTokenRequest {
  token: string;
}

export interface StartGameResponse {
  /** Durée du décompte : le serveur fait partir le chronomètre à son issue. */
  countdownMs: number;
}

export interface FinishGameRequest extends GameTokenRequest {
  moves: Move[];
}

export interface FinishGameResponse {
  /** Durée mesurée par le serveur, pauses déduites (ENF-1.1). */
  durationMs: number;
  moves: number;
  pairs: number;
  accuracy: number;
}

export interface ApiErrorBody {
  error: { code: string; message: string };
}
