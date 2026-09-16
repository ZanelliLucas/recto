import { describe, expect, it } from 'vitest';
import { dailyCategory, dailyDay, dailySeed, hashString } from '../src/daily';

describe('dailyDay', () => {
  it('découpe la journée sur l’heure française, pas sur celle du joueur', () => {
    // 22 h à New York le 15, mais déjà le 16 à Paris : le défi a changé.
    expect(dailyDay(Date.UTC(2026, 8, 16, 2, 0))).toBe('2026-09-16');
    expect(dailyDay(Date.UTC(2026, 8, 15, 21, 0))).toBe('2026-09-15');
  });
});

describe('dailySeed', () => {
  it('donne la même graine à tous, et une autre le lendemain', () => {
    expect(dailySeed('2026-09-16')).toBe(dailySeed('2026-09-16'));
    expect(dailySeed('2026-09-16')).not.toBe(dailySeed('2026-09-17'));
  });
});

describe('dailyCategory', () => {
  const slugs = ['monuments', 'histoire', 'drapeaux', 'faune', 'espace'];

  it('choisit la même catégorie pour tout le monde un jour donné', () => {
    expect(dailyCategory('2026-09-16', slugs)).toBe(dailyCategory('2026-09-16', slugs));
    expect(slugs).toContain(dailyCategory('2026-09-16', slugs));
  });

  it('fait tourner les catégories au fil des jours', () => {
    const week = ['16', '17', '18', '19', '20', '21', '22'].map((d) => dailyCategory(`2026-09-${d}`, slugs));
    expect(new Set(week).size).toBeGreaterThan(1);
  });

  it('ne dépend pas de l’ordre de la liste reçue', () => {
    const shuffled = [...slugs].reverse();
    expect(dailyCategory('2026-09-16', shuffled)).toBe(dailyCategory('2026-09-16', slugs));
  });

  it('rend null sans catégorie proposée', () => {
    expect(dailyCategory('2026-09-16', [])).toBeNull();
  });
});

describe('hashString', () => {
  it('reste dans les entiers non signés de 32 bits', () => {
    for (const value of ['', 'a', 'recto', '2026-09-16']) {
      expect(hashString(value)).toBeGreaterThanOrEqual(0);
      expect(hashString(value)).toBeLessThanOrEqual(0xffffffff);
    }
  });
});
