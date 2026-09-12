import { describe, expect, it } from 'vitest';
import { buildDeck, drawImages, drawSignature, playableDifficulties, type DrawableImage } from '../src/draw';
import { mulberry32 } from '../src/random';

const distinctPool = (count: number): DrawableImage[] =>
  Array.from({ length: count }, (_, i) => ({ id: `img${i}`, visualGroup: null }));

describe('drawImages', () => {
  it('tire le nombre de paires demandé, sans doublon', () => {
    const ids = drawImages(distinctPool(60), 30, mulberry32(1));
    expect(ids).toHaveLength(30);
    expect(new Set(ids).size).toBe(30);
  });

  it('ne réunit jamais deux images du même groupe visuel (EF-3.9)', () => {
    const pool = Array.from({ length: 40 }, (_, i) => ({ id: `img${i}`, visualGroup: `g${Math.floor(i / 2)}` }));
    const groupOf = new Map(pool.map((image) => [image.id, image.visualGroup]));
    for (let seed = 0; seed < 200; seed++) {
      const groups = drawImages(pool, 15, mulberry32(seed)).map((id) => groupOf.get(id));
      expect(new Set(groups).size).toBe(15);
    }
  });

  it('échoue quand les groupes visuels sont trop peu nombreux', () => {
    const pool = Array.from({ length: 20 }, (_, i) => ({ id: `img${i}`, visualGroup: `g${i % 5}` }));
    expect(() => drawImages(pool, 8, mulberry32(1))).toThrow(/Tirage impossible/);
  });

  it('ne reproduit jamais le tirage précédent, même avec une marge minimale (EF-1.8)', () => {
    const pool = distinctPool(9);
    const previous = drawImages(pool, 8, mulberry32(0));
    for (let seed = 1; seed < 300; seed++) {
      const next = drawImages(pool, 8, mulberry32(seed), previous);
      expect(drawSignature(next)).not.toBe(drawSignature(previous));
      expect(new Set(next).size).toBe(8);
    }
  });
});

describe('buildDeck', () => {
  it('contient chaque image exactement deux fois', () => {
    const ids = ['a', 'b', 'c', 'd'];
    const deck = buildDeck(ids, mulberry32(5));
    expect(deck).toHaveLength(8);
    for (const id of ids) expect(deck.filter((card) => card === id)).toHaveLength(2);
  });
});

describe('playableDifficulties', () => {
  it('applique le minimum du double des paires (EF-3.8)', () => {
    expect(playableDifficulties(distinctPool(16))).toEqual(['facile']);
    expect(playableDifficulties(distinctPool(59))).toEqual(['facile', 'normal']);
    expect(playableDifficulties(distinctPool(60))).toEqual(['facile', 'normal', 'difficile']);
  });

  it('exige plus de groupes visuels que de paires', () => {
    const pool = Array.from({ length: 60 }, (_, i) => ({ id: `img${i}`, visualGroup: `g${i % 30}` }));
    expect(playableDifficulties(pool)).toEqual(['facile', 'normal']);
  });
});
