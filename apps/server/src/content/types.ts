export interface ContentImage {
  id: string;
  title: string;
  file: string;
  /** ENF-8 — auteur, source, licence et date de récupération sont obligatoires. */
  author: string;
  sourceUrl: string;
  licence: string;
  retrievedAt: string;
  visualGroup: string | null;
}

export interface ContentCategory {
  slug: string;
  name: string;
  description: string;
  order: number;
  published: boolean;
  /** Identifiant de l'image servant de vignette. */
  thumbnail: string;
  images: ContentImage[];
}

/** Accès au contenu. Asynchrone pour que l'implémentation en base du lot 2 s'y substitue telle quelle. */
export interface CategoryRepository {
  listPublished(): Promise<ContentCategory[]>;
  findPublished(slug: string): Promise<ContentCategory | undefined>;
}

export function mediaUrl(slug: string, file: string): string {
  return `/media/${encodeURIComponent(slug)}/${encodeURIComponent(file)}`;
}
