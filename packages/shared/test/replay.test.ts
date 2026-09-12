import { describe, expect, it } from 'vitest';
import { replayMoves, type Move } from '../src/replay';
import { accuracy, comparePerformances } from '../src/score';

const deck = ['a', 'b', 'a', 'c', 'b', 'c'];

describe('replayMoves', () => {
  it('valide une partie parfaite : un coup par paire (EF-1.2)', () => {
    expect(replayMoves(deck, [[0, 2], [1, 4], [3, 5]])).toEqual({ ok: true, moves: 3, pairsFound: 3 });
  });

  it('compte les coups manqués', () => {
    const moves: Move[] = [[0, 1], [0, 2], [3, 4], [1, 4], [3, 5]];
    expect(replayMoves(deck, moves)).toEqual({ ok: true, moves: 5, pairsFound: 3 });
  });

  it('refuse une position hors de la grille', () => {
    expect(replayMoves(deck, [[0, 6]])).toMatchObject({ ok: false, reason: 'indice_invalide' });
    expect(replayMoves(deck, [[-1, 2]])).toMatchObject({ ok: false, reason: 'indice_invalide' });
  });

  it('refuse deux fois la même carte', () => {
    expect(replayMoves(deck, [[1, 1]])).toMatchObject({ ok: false, reason: 'meme_carte' });
  });

  it('refuse de rejouer une carte déjà trouvée', () => {
    expect(replayMoves(deck, [[0, 2], [2, 1]])).toMatchObject({ ok: false, reason: 'carte_deja_trouvee', moveIndex: 1 });
  });

  it('refuse une partie inachevée', () => {
    expect(replayMoves(deck, [[0, 2]])).toMatchObject({ ok: false, reason: 'partie_incomplete' });
  });
});

describe('score', () => {
  it('calcule la précision (EF-1.3)', () => {
    expect(accuracy(15, 15)).toBe(1);
    expect(accuracy(15, 30)).toBe(0.5);
    expect(accuracy(8, 0)).toBe(0);
  });

  it('classe au temps puis au nombre de coups (EF-1.1)', () => {
    expect(comparePerformances({ durationMs: 40_000, moves: 20 }, { durationMs: 45_000, moves: 10 })).toBeLessThan(0);
    expect(comparePerformances({ durationMs: 40_000, moves: 12 }, { durationMs: 40_000, moves: 10 })).toBeGreaterThan(0);
  });
});
