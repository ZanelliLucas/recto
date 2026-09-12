import { describe, expect, it } from 'vitest';
import { nextFocus } from '../src/game/layout';
import { formatDelta, formatDuration, formatPercent } from '../src/lib/format';

describe('formatDuration', () => {
  it('affiche minutes, secondes et centièmes', () => {
    expect(formatDuration(0)).toBe('0:00,00');
    expect(formatDuration(45_239)).toBe('0:45,23');
    expect(formatDuration(65_234)).toBe('1:05,23');
    expect(formatDuration(-5)).toBe('0:00,00');
  });
});

describe('formatDelta', () => {
  it('signe l’écart au record (EF-5.1)', () => {
    expect(formatDelta(-4_200)).toBe('−4,2 s');
    expect(formatDelta(1_340)).toBe('+1,3 s');
    expect(formatDelta(-20)).toBe('+0,0 s');
  });
});

describe('formatPercent', () => {
  it('arrondit la précision', () => {
    expect(formatPercent(8 / 9)).toMatch(/^89\s?%$/);
  });
});

describe('nextFocus', () => {
  it('parcourt la grille aux flèches sans en sortir (ENF-4.1)', () => {
    expect(nextFocus('ArrowRight', 3, 16, 4)).toBe(4);
    expect(nextFocus('ArrowDown', 13, 16, 4)).toBe(13);
    expect(nextFocus('ArrowDown', 1, 16, 4)).toBe(5);
    expect(nextFocus('ArrowUp', 1, 16, 4)).toBe(1);
    expect(nextFocus('End', 0, 16, 4)).toBe(15);
    expect(nextFocus('Enter', 0, 16, 4)).toBeNull();
  });
});
