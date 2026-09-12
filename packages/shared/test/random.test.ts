import { describe, expect, it } from 'vitest';
import { mulberry32, shuffle } from '../src/random';

describe('mulberry32', () => {
  it('produit la même suite pour une même graine', () => {
    expect(Array.from({ length: 8 }, mulberry32(42))).toEqual(Array.from({ length: 8 }, mulberry32(42)));
  });

  it('produit des suites différentes pour des graines différentes', () => {
    expect(Array.from({ length: 8 }, mulberry32(1))).not.toEqual(Array.from({ length: 8 }, mulberry32(2)));
  });

  it('reste dans [0, 1[', () => {
    const rng = mulberry32(7);
    for (let i = 0; i < 10_000; i++) {
      const value = rng();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

describe('shuffle', () => {
  it("renvoie une permutation sans modifier l'entrée", () => {
    const input = Array.from({ length: 30 }, (_, i) => i);
    const output = shuffle(input, mulberry32(3));
    expect(input).toEqual(Array.from({ length: 30 }, (_, i) => i));
    expect([...output].sort((a, b) => a - b)).toEqual(input);
    expect(output).not.toEqual(input);
  });
});
