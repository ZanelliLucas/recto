import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { playableDifficulties } from '@recto/shared';
import { describe, expect, it } from 'vitest';
import { contentDir } from './helpers';

interface Manifest {
  images: { id: string; file: string; author: string; licence: string; sourceUrl: string; visualGroup: string | null }[];
}

describe('source de la catégorie Drapeaux', () => {
  const directory = path.join(contentDir, 'drapeaux');
  const manifest = JSON.parse(readFileSync(path.join(directory, 'manifest.json'), 'utf8')) as Manifest;

  it('compte au moins 60 images et permet les trois difficultés (EF-3.8, CA-02)', () => {
    expect(manifest.images.length).toBeGreaterThanOrEqual(60);
    expect(playableDifficulties(manifest.images)).toEqual(['facile', 'normal', 'difficile']);
  });

  it('référence des fichiers existants, sources et licences renseignées (ENF-8)', () => {
    for (const image of manifest.images) {
      expect(existsSync(path.join(directory, image.file)), image.file).toBe(true);
      expect(image.author).not.toBe('');
      expect(image.licence).not.toBe('');
      expect(image.sourceUrl).toMatch(/^https:\/\//);
    }
  });
});
