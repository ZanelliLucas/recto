import { describe, expect, it } from 'vitest';
import { formatWikidataTime, lifeDates } from '../scripts/commons/wikimedia';

describe('dates d’une vie', () => {
  it('donne les deux bornes, ou l’année de naissance accordée pour une personne vivante', () => {
    expect(lifeDates('1869', '1948', 'Q6581097')).toBe('1869–1948');
    expect(lifeDates('1930', null, 'Q6581097')).toBe('né en 1930');
    expect(lifeDates('1937', null, 'Q6581072')).toBe('née en 1937');
    expect(lifeDates('1950', null, null)).toBe('naissance en 1950');
  });
});

describe('dates Wikidata en français (EF-7.3)', () => {
  it('rend l’année, la décennie, le siècle ou le millénaire selon la précision', () => {
    expect(formatWikidataTime({ time: '+1889-03-31T00:00:00Z', precision: 11 })).toBe('1889');
    expect(formatWikidataTime({ time: '+1880-00-00T00:00:00Z', precision: 8 })).toBe('années 1880');
    expect(formatWikidataTime({ time: '+1250-00-00T00:00:00Z', precision: 7 })).toBe('XIIIe siècle');
    expect(formatWikidataTime({ time: '+1000-00-00T00:00:00Z', precision: 6 })).toBe('Ie millénaire');
  });

  it('marque les dates avant notre ère et ignore les précisions inexploitables', () => {
    expect(formatWikidataTime({ time: '-2560-00-00T00:00:00Z', precision: 9 })).toBe('2560 av. J.-C.');
    expect(formatWikidataTime({ time: '-0450-00-00T00:00:00Z', precision: 7 })).toBe('Ve siècle av. J.-C.');
    expect(formatWikidataTime({ time: '+2000-00-00T00:00:00Z', precision: 3 })).toBeNull();
  });
});
