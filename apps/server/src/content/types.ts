import type { Difficulty } from '@recto/shared';
import type { ImageKind } from '../media/sources';

export interface ContentImage {
  id: string;
  categoryId: string;
  kind: ImageKind;
  storageKey: string;
  title: string;
  caption: string | null;
  date: string | null;
  place: string | null;
  /** ENF-8 — auteur, source, licence et date de récupération sont obligatoires. */
  author: string;
  sourceUrl: string;
  licence: string;
  licenceUrl: string | null;
  retrievedAt: string;
  visualGroup: string | null;
  /** Article de référence proposé après la partie (« En savoir plus »). */
  infoUrl: string | null;
  createdAt: number;
}

export interface ContentCategory {
  id: string;
  slug: string;
  name: string;
  description: string;
  sortOrder: number;
  maxDifficulty: Difficulty;
  published: boolean;
  thumbnailImageId: string | null;
  createdAt: number;
  updatedAt: number;
  images: ContentImage[];
}

/** Lecture du contenu publié, seule dépendance du jeu envers le contenu. */
export interface CategoryRepository {
  listPublished(): Promise<ContentCategory[]>;
  findPublished(slug: string): Promise<ContentCategory | undefined>;
}
