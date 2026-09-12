import { mkdtempSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Difficulty, Move } from '@recto/shared';
import request from 'supertest';
import { AdminAuth } from '../src/admin/adminAuth';
import { AdminService } from '../src/admin/adminService';
import { createApp } from '../src/app';
import { SqlContentRepository } from '../src/content/contentRepository';
import { openDatabase } from '../src/db/client';
import { GameService } from '../src/games/gameService';
import { SqlGameStore } from '../src/games/gameStore';
import { LocalMediaStorage } from '../src/media/storage';

export const migrationsDir = fileURLToPath(new URL('../drizzle/', import.meta.url));
export const contentDir = fileURLToPath(new URL('../content/', import.meta.url));
export const ADMIN_SECRET = 'secret-de-test-assez-long';

export interface SeedCategory {
  slug: string;
  count: number;
  visualGroup?: (index: number) => string | null;
  published?: boolean;
  maxDifficulty?: Difficulty;
}

/** Base SQLite jetable, dans un dossier temporaire propre au test. */
export async function testDatabase() {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'recto-test-'));
  const db = await openDatabase(`file:${path.join(dir, 'test.db').replaceAll('\\', '/')}`, migrationsDir);
  return { db, dir };
}

/** Insère une catégorie et ses images (vectorielles, sans fichier) directement en base. */
export async function seedCategory(content: SqlContentRepository, seed: SeedCategory): Promise<{ id: string; imageIds: string[] }> {
  const id = crypto.randomUUID();
  const imageIds: string[] = [];
  await content.insertCategory({
    id,
    slug: seed.slug,
    name: seed.slug,
    description: '',
    thumbnailImageId: null,
    sortOrder: 0,
    maxDifficulty: seed.maxDifficulty ?? 'difficile',
    published: seed.published ?? true,
    createdAt: 0,
    updatedAt: 0,
  });
  for (let i = 0; i < seed.count; i++) {
    imageIds.push(crypto.randomUUID());
    await content.insertImage({
      id: imageIds[i]!,
      categoryId: id,
      kind: 'vector',
      storageKey: `img/${seed.slug}-${i}`,
      title: `Image ${i}`,
      caption: null,
      date: null,
      place: null,
      author: 'Test',
      sourceUrl: `https://example.org/${seed.slug}/${i}`,
      licence: 'Domaine public',
      licenceUrl: null,
      retrievedAt: '2026-09-12',
      visualGroup: seed.visualGroup?.(i) ?? null,
      createdAt: i,
    });
  }
  return { id, imageIds };
}

/** Index d'une image de test à partir de son titre « Image n ». */
export const imageIndex = (title: string) => Number(title.replace('Image ', ''));

/** Coups d'une partie parfaite : chaque paire retournée du premier coup. */
export function perfectMoves(deck: readonly string[]): Move[] {
  const positions = new Map<string, number[]>();
  deck.forEach((id, index) => positions.set(id, [...(positions.get(id) ?? []), index]));
  return [...positions.values()].map(([a, b]) => [a!, b!] as const);
}

export async function setup(seeds: SeedCategory[] = [{ slug: 'test', count: 60 }], adminSecret: string | null = ADMIN_SECRET) {
  let now = 1_700_000_000_000;
  const clock = () => now;
  const { db, dir } = await testDatabase();
  const content = new SqlContentRepository(db);
  const categoryIds = new Map<string, string>();
  const imageIds = new Map<string, string[]>();
  for (const seed of seeds) {
    const seeded = await seedCategory(content, seed);
    categoryIds.set(seed.slug, seeded.id);
    imageIds.set(seed.slug, seeded.imageIds);
  }

  const media = new LocalMediaStorage(path.join(dir, 'media'));
  const app = createApp({
    categories: content,
    games: new GameService(content, new SqlGameStore(db), media, { now: clock }),
    admin: new AdminService(content, media, clock),
    adminAuth: new AdminAuth(adminSecret, false, clock),
    media,
    mediaDir: media.root,
  });

  return {
    app,
    agent: request.agent(app),
    content,
    media,
    categoryIds,
    imageIds,
    advance(ms: number) {
      now += ms;
    },
  };
}
