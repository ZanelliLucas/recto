import { describe, expect, it } from 'vitest';
import { difficultiesUpTo } from '../src/difficulty';
import { playableDifficulties, publicationIssues } from '../src/draw';
import { IMAGE_SIZES, pickImageUrl, type ImageSources } from '../src/images';

const pool = (count: number, groups = count) =>
  Array.from({ length: count }, (_, i) => ({ id: `img${i}`, visualGroup: `g${i % groups}` }));

describe('difficultiesUpTo', () => {
  it('liste les niveaux jusqu’à la difficulté la plus élevée', () => {
    expect(difficultiesUpTo('facile')).toEqual(['facile']);
    expect(difficultiesUpTo('difficile')).toEqual(['facile', 'normal', 'difficile']);
  });
});

describe('playableDifficulties avec plafond', () => {
  it('ne propose jamais un niveau au-delà du plafond de la catégorie', () => {
    expect(playableDifficulties(pool(60), 'normal')).toEqual(['facile', 'normal']);
  });
});

describe('publicationIssues (EF-7.4)', () => {
  it('accepte une catégorie dont la volumétrie couvre son niveau le plus élevé', () => {
    expect(publicationIssues(pool(60), 'difficile')).toEqual([]);
    expect(publicationIssues(pool(16), 'facile')).toEqual([]);
  });

  it('signale le manque d’images et de groupes visuels', () => {
    expect(publicationIssues(pool(40, 20), 'difficile')).toEqual([
      { code: 'images_insuffisantes', required: 60, actual: 40 },
      { code: 'groupes_insuffisants', required: 31, actual: 20 },
    ]);
  });
});

describe('pickImageUrl', () => {
  const urls = (format: string) => Object.fromEntries(IMAGE_SIZES.map((size) => [size, `/m/a-${size}.${format}`]));
  const raster = { kind: 'raster', avif: urls('avif'), webp: urls('webp') } as ImageSources;

  it('choisit le format et la résolution', () => {
    expect(pickImageUrl(raster, 200, true)).toBe('/m/a-200.avif');
    expect(pickImageUrl(raster, 400, false)).toBe('/m/a-400.webp');
    expect(pickImageUrl({ kind: 'vector', url: '/m/a.svg' }, 800, true)).toBe('/m/a.svg');
  });
});
