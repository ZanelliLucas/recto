import { IMAGE_SIZES, type ImageSize, type ImageSources } from '@recto/shared';
import type { MediaStorage } from './storage';

export type ImageKind = 'vector' | 'raster';
export type RasterFormat = 'avif' | 'webp';

export const variantSuffix = (size: ImageSize, format: RasterFormat) => `-${size}.${format}`;
export const VECTOR_SUFFIX = '.svg';

/** Fichiers produits pour une image : un SVG, ou trois résolutions en deux formats. */
export function storedKeys(kind: ImageKind, storageKey: string): string[] {
  if (kind === 'vector') return [storageKey + VECTOR_SUFFIX];
  return IMAGE_SIZES.flatMap((size) => (['avif', 'webp'] as const).map((format) => storageKey + variantSuffix(size, format)));
}

export function imageSources(storage: MediaStorage, kind: ImageKind, storageKey: string): ImageSources {
  if (kind === 'vector') return { kind, url: storage.url(storageKey + VECTOR_SUFFIX) };
  const urls = (format: RasterFormat) =>
    Object.fromEntries(IMAGE_SIZES.map((size) => [size, storage.url(storageKey + variantSuffix(size, format))])) as Record<
      ImageSize,
      string
    >;
  return { kind, avif: urls('avif'), webp: urls('webp') };
}
