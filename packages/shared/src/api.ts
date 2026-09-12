import type { Difficulty } from './difficulty';
import type { PublicationIssue } from './draw';
import type { ImageSources } from './images';
import type { Move } from './replay';

export type GameStatus = 'preparee' | 'en_cours' | 'terminee' | 'abandonnee' | 'rejetee';

export interface CategorySummary {
  slug: string;
  name: string;
  description: string;
  imageCount: number;
  thumbnail: ImageSources | null;
  /** Difficultés proposées et permises par la volumétrie de la catégorie (EF-3.8). */
  difficulties: Difficulty[];
}

export interface CardImage {
  id: string;
  /** Titre de l'image, qui alimente aussi son texte de remplacement (ENF-4.5). */
  title: string;
  sources: ImageSources;
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

/** ENF-8 — crédits iconographiques restitués automatiquement. */
export interface CreditEntry {
  id: string;
  title: string;
  author: string;
  licence: string;
  licenceUrl: string | null;
  sourceUrl: string;
  retrievedAt: string;
}

export interface CreditsCategory {
  slug: string;
  name: string;
  images: CreditEntry[];
}

// ——— Administration du contenu (EF-7) ———

export interface AdminImage {
  id: string;
  title: string;
  caption: string | null;
  date: string | null;
  place: string | null;
  author: string;
  sourceUrl: string;
  licence: string;
  licenceUrl: string | null;
  retrievedAt: string;
  visualGroup: string | null;
  sources: ImageSources;
}

export interface AdminCategorySummary {
  id: string;
  slug: string;
  name: string;
  description: string;
  sortOrder: number;
  maxDifficulty: Difficulty;
  published: boolean;
  thumbnailImageId: string | null;
  thumbnail: ImageSources | null;
  imageCount: number;
  groupCount: number;
  /** Vide si la catégorie peut être publiée (EF-7.4). */
  issues: PublicationIssue[];
}

export interface AdminCategoryDetail extends AdminCategorySummary {
  images: AdminImage[];
}

export interface CategoryInput {
  slug: string;
  name: string;
  description: string;
  sortOrder: number;
  maxDifficulty: Difficulty;
}

export interface CategoryPatch extends Partial<CategoryInput> {
  published?: boolean;
  thumbnailImageId?: string | null;
}

/** EF-7.2 et EF-7.3 — source et licence obligatoires, métadonnées pédagogiques facultatives. */
export interface ImageMetadataInput {
  title: string;
  author: string;
  sourceUrl: string;
  licence: string;
  licenceUrl?: string | null;
  retrievedAt?: string;
  caption?: string | null;
  date?: string | null;
  place?: string | null;
  visualGroup?: string | null;
}

export interface ApiErrorBody {
  error: { code: string; message: string; details?: unknown };
}
