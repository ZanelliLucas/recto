/** EF-3.11 — trois résolutions : grille dense, grille standard, fiche d'information. */
export const IMAGE_SIZES = [200, 400, 800] as const;
export type ImageSize = (typeof IMAGE_SIZES)[number];

/**
 * Adresses d'une image. Les tracés vectoriels (drapeaux) valent pour toutes les
 * tailles ; les photographies existent en AVIF, avec repli WebP (EF-3.12).
 */
export type ImageSources =
  | { kind: 'vector'; url: string }
  | { kind: 'raster'; avif: Record<ImageSize, string>; webp: Record<ImageSize, string> };

export function pickImageUrl(sources: ImageSources, size: ImageSize, avif: boolean): string {
  if (sources.kind === 'vector') return sources.url;
  return (avif ? sources.avif : sources.webp)[size];
}
