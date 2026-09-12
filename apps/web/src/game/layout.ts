import type { Difficulty } from '@recto/shared';

/**
 * Disposition sur mobile en portrait (ENF-3.3, arbitrage A-7) : grille recomposée
 * verticalement, défilement autorisé. Cinq colonnes pour Difficile garantissent des
 * cartes de 56 px dès 320 px de large.
 */
export const NARROW_LAYOUT: Record<Difficulty, { cols: number; rows: number }> = {
  facile: { cols: 4, rows: 4 },
  normal: { cols: 5, rows: 6 },
  difficile: { cols: 5, rows: 12 },
};

/** ENF-4.1 — position suivante lors du parcours de la grille au clavier ; null si la touche ne déplace pas. */
export function nextFocus(key: string, current: number, count: number, cols: number): number | null {
  switch (key) {
    case 'ArrowRight':
      return Math.min(current + 1, count - 1);
    case 'ArrowLeft':
      return Math.max(current - 1, 0);
    case 'ArrowDown':
      return current + cols < count ? current + cols : current;
    case 'ArrowUp':
      return current - cols >= 0 ? current - cols : current;
    case 'Home':
      return 0;
    case 'End':
      return count - 1;
    default:
      return null;
  }
}

/** Nombre de colonnes réellement affichées, la grille se recomposant selon l'écran. */
export function columnCount(grid: HTMLElement | null): number {
  if (!grid) return 1;
  return getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length || 1;
}
