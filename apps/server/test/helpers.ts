import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { CreateGameResponse, Difficulty, FinishGameResponse, Move, PublicUser } from '@recto/shared';
import request from 'supertest';
import { AdminService } from '../src/admin/adminService';
import { createApp } from '../src/app';
import { AudienceService } from '../src/audience/audienceService';
import { AuthService } from '../src/auth/authService';
import { SessionManager } from '../src/auth/sessions';
import { SqlUserRepository } from '../src/auth/userRepository';
import { SqlContentRepository } from '../src/content/contentRepository';
import { openDatabase } from '../src/db/client';
import { GameService } from '../src/games/gameService';
import { SqlGameStore } from '../src/games/gameStore';
import { MemoryMailer } from '../src/mail/mailer';
import { LocalMediaStorage } from '../src/media/storage';
import { RecordService } from '../src/records/recordService';

export const migrationsDir = fileURLToPath(new URL('../drizzle/', import.meta.url));
export const contentDir = fileURLToPath(new URL('../content/', import.meta.url));
export const PASSWORD = 'correct-horse-battery';

/** Gabarit réduit de la page produite par Vite, avec les mêmes marqueurs. */
export const PAGE_TEMPLATE =
  '<!doctype html><html lang="fr"><head><!--recto:head--><title>RECTO</title><!--/recto:head--></head>' +
  '<body><div id="root"><!--recto:body--></div></body></html>';

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
      infoUrl: i === 0 ? `https://fr.wikipedia.org/wiki/${seed.slug}` : null,
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

export async function setup(seeds: SeedCategory[] = [{ slug: 'test', count: 60 }]) {
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
  const users = new SqlUserRepository(db);
  const records = new RecordService(db, content);
  const audience = new AudienceService(db, content, clock);
  const mailer = new MemoryMailer();
  const webDistDir = path.join(dir, 'web');
  mkdirSync(webDistDir);
  writeFileSync(path.join(webDistDir, 'index.html'), PAGE_TEMPLATE);
  const app = createApp({
    categories: content,
    games: new GameService(content, new SqlGameStore(db), media, records, { now: clock }),
    admin: new AdminService(content, media, clock),
    auth: new AuthService(users, mailer, { appUrl: 'https://recto.test', now: clock }),
    records,
    users,
    sessions: new SessionManager('secret-de-session-de-test-assez-long-pour-hs256', false),
    media,
    audience,
    mediaDir: media.root,
    appUrl: 'https://recto.test',
    webDistDir,
    indexable: true,
  });

  return {
    app,
    db,
    audience,
    now: clock,
    agent: request.agent(app),
    newAgent: () => request.agent(app),
    content,
    media,
    users,
    mailer,
    categoryIds,
    imageIds,
    advance(ms: number) {
      now += ms;
    },
  };
}

export type Context = Awaited<ReturnType<typeof setup>>;
export type Agent = Context['agent'];

let counter = 0;

/** Inscrit un compte sur cet agent, qui en garde la session. */
export async function register(agent: Agent, overrides: Partial<{ email: string; pseudo: string; password: string }> = {}) {
  counter++;
  const body = {
    email: `joueur${counter}@exemple.fr`,
    pseudo: `Joueur${counter}`,
    password: PASSWORD,
    avatar: 'orbite',
    ageConfirmed: true,
    ...overrides,
  };
  const response = await agent.post('/api/auth/register').send(body).expect(201);
  return { ...body, user: response.body as PublicUser };
}

/** Jeton du dernier lien envoyé par courriel. */
export function lastToken(ctx: Context): string {
  const text = ctx.mailer.sent.at(-1)?.text ?? '';
  const match = /jeton=([\w-]+)/.exec(text);
  if (!match) throw new Error('Aucun lien dans le dernier courriel');
  return match[1]!;
}

/** Joue une partie parfaite de `elapsedMs` sur l'horloge du serveur. */
export async function playGame(ctx: Context, agent: Agent, elapsedMs = 30_000, difficulty: Difficulty = 'facile', category = 'test') {
  const game = (await agent.post('/api/games').send({ category, difficulty }).expect(201)).body as CreateGameResponse;
  await agent.post(`/api/games/${game.gameId}/start`).send({ token: game.token }).expect(200);
  ctx.advance(3_000 + elapsedMs);
  const moves = perfectMoves(game.deck);
  const result = await agent.post(`/api/games/${game.gameId}/finish`).send({ token: game.token, moves }).expect(200);
  return result.body as FinishGameResponse;
}
