import type { Move } from '@recto/shared';
import { describe, expect, it } from 'vitest';
import { missedImages } from '../src/pages/GamePage';

// Six positions, trois images : chaque image occupe deux cases de la grille.
const deck = ['lion', 'tigre', 'lion', 'ours', 'tigre', 'ours'];

describe('missedImages', () => {
  it('retient les images des tentatives infructueuses, sans doublon', () => {
    const moves: Move[] = [
      [0, 1], // lion / tigre : manqué
      [0, 2], // lion / lion : trouvé
      [1, 3], // tigre / ours : manqué
    ];
    expect(missedImages(moves, deck).sort()).toEqual(['lion', 'ours', 'tigre']);
  });

  it('ne retient rien quand chaque paire tombe du premier coup', () => {
    const moves: Move[] = [
      [0, 2],
      [1, 4],
      [3, 5],
    ];
    expect(missedImages(moves, deck)).toEqual([]);
  });

  it('ignore une position hors de la grille', () => {
    expect(missedImages([[0, 99]], deck)).toEqual([]);
  });
});
