import type { Difficulty, ImageSize } from '@recto/shared';

// Image AVIF de 1 × 1 px : si le navigateur la décode, il reçoit de l'AVIF, sinon du WebP (EF-3.12).
const AVIF_PROBE =
  'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAACAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKCBgANogQEAwgMg8f8D///8WfhwB8+ErK42A=';

let avifSupport: Promise<boolean> | null = null;

export function supportsAvif(): Promise<boolean> {
  avifSupport ??= new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image.width > 0);
    image.onerror = () => resolve(false);
    image.src = AVIF_PROBE;
  });
  return avifSupport;
}

/**
 * EF-3.11 — 200 px pour la grille dense (Difficile), 400 px pour la grille
 * standard ; les écrans à haute densité reçoivent toujours 400 px.
 */
export function sizeForDifficulty(difficulty: Difficulty, pixelRatio = window.devicePixelRatio || 1): ImageSize {
  return difficulty === 'difficile' && pixelRatio < 1.5 ? 200 : 400;
}
