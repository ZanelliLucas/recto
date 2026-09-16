import type { CategorySummary } from '@recto/shared';
import { describe, expect, it } from 'vitest';
import { matching, sorted } from '../src/components/CategoryFilters';

const category = (name: string, description: string, imageCount: number): CategorySummary => ({
  slug: name.toLowerCase(),
  name,
  description,
  imageCount,
  thumbnail: null,
  difficulties: ['facile'],
});

const catalogue = [
  category('Monuments', 'Monuments emblématiques du monde entier.', 70),
  category('Cuisine du monde', 'Sushis, paella, couscous, tacos.', 64),
  category('Éléments', 'Minéraux et gemmes de collection.', 87),
];

describe('matching', () => {
  it('ignore la casse et les accents', () => {
    expect(matching(catalogue, 'elements').map((found) => found.name)).toEqual(['Éléments']);
    expect(matching(catalogue, 'MONUM').map((found) => found.name)).toEqual(['Monuments']);
  });

  it('cherche aussi dans la description', () => {
    expect(matching(catalogue, 'couscous').map((found) => found.name)).toEqual(['Cuisine du monde']);
    expect(matching(catalogue, 'gemmes').map((found) => found.name)).toEqual(['Éléments']);
  });

  it('rend la liste entière sans recherche, et rien sans correspondance', () => {
    expect(matching(catalogue, '   ')).toHaveLength(3);
    expect(matching(catalogue, 'trombone')).toHaveLength(0);
  });
});

describe('sorted', () => {
  it('garde l’ordre de l’éditeur par défaut', () => {
    expect(sorted(catalogue, 'default').map((found) => found.name)).toEqual(['Monuments', 'Cuisine du monde', 'Éléments']);
  });

  it('trie par nom selon l’alphabet français, accents compris', () => {
    expect(sorted(catalogue, 'name').map((found) => found.name)).toEqual(['Cuisine du monde', 'Éléments', 'Monuments']);
  });

  it('trie par nombre d’images décroissant', () => {
    expect(sorted(catalogue, 'images').map((found) => found.imageCount)).toEqual([87, 70, 64]);
  });

  it('ne modifie pas la liste reçue', () => {
    const original = [...catalogue];
    sorted(catalogue, 'name');
    expect(catalogue).toEqual(original);
  });
});
