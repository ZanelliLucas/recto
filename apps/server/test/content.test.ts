import { existsSync } from 'node:fs';
import path from 'node:path';
import { playableDifficulties } from '@recto/shared';
import { describe, expect, it } from 'vitest';
import { FileCategoryRepository } from '../src/content/fileCategoryRepository';
import { contentDir } from './helpers';

describe('catégorie Drapeaux', async () => {
  const repository = await FileCategoryRepository.load(contentDir);
  const drapeaux = await repository.findPublished('drapeaux');

  it('est publiée avec au moins 60 images et les trois difficultés (EF-3.8, CA-02)', () => {
    expect(drapeaux).toBeDefined();
    expect(drapeaux!.images.length).toBeGreaterThanOrEqual(60);
    expect(playableDifficulties(drapeaux!.images)).toEqual(['facile', 'normal', 'difficile']);
  });

  it('référence des fichiers existants, sources et licences renseignées (ENF-8, CA-12)', () => {
    for (const image of drapeaux!.images) {
      expect(existsSync(path.join(contentDir, 'drapeaux', image.file)), image.file).toBe(true);
      expect(image.author).not.toBe('');
      expect(image.licence).not.toBe('');
      expect(image.sourceUrl).toMatch(/^https:\/\//);
    }
  });
});
