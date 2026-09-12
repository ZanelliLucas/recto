import type { Difficulty, GameStatus } from '@recto/shared';
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/**
 * Modèle de données du § 5.2. Les horodatages sont en millisecondes epoch.
 * Comptes, records et badges arrivent au lot 3 ; les classements s'appuieront sur `games`.
 */

const DIFFICULTY_VALUES = ['facile', 'normal', 'difficile'] as const satisfies readonly Difficulty[];
const GAME_STATUS_VALUES = ['preparee', 'en_cours', 'terminee', 'abandonnee', 'rejetee'] as const satisfies readonly GameStatus[];

export const categories = sqliteTable('categories', {
  id: text('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  thumbnailImageId: text('thumbnail_image_id'),
  sortOrder: integer('sort_order').notNull().default(0),
  /** Difficulté la plus élevée proposée ; fixe le minimum d'images (EF-3.8, EF-7.4). */
  maxDifficulty: text('max_difficulty', { enum: DIFFICULTY_VALUES }).notNull().default('difficile'),
  published: integer('published', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const images = sqliteTable(
  'images',
  {
    id: text('id').primaryKey(),
    categoryId: text('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'cascade' }),
    /** `vector` : un SVG unique ; `raster` : trois résolutions en AVIF et WebP. */
    kind: text('kind', { enum: ['vector', 'raster'] }).notNull(),
    /** Préfixe des fichiers dans le stockage des médias. */
    storageKey: text('storage_key').notNull(),
    title: text('title').notNull(),
    caption: text('caption'),
    date: text('date'),
    place: text('place'),
    author: text('author').notNull(),
    sourceUrl: text('source_url').notNull(),
    licence: text('licence').notNull(),
    licenceUrl: text('licence_url'),
    retrievedAt: text('retrieved_at').notNull(),
    visualGroup: text('visual_group'),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [index('images_category_idx').on(table.categoryId)],
);

export const games = sqliteTable(
  'games',
  {
    id: text('id').primaryKey(),
    token: text('token').notNull(),
    playerKey: text('player_key').notNull(),
    userId: text('user_id'),
    categoryId: text('category_id').notNull(),
    difficulty: text('difficulty', { enum: DIFFICULTY_VALUES }).notNull(),
    seed: integer('seed').notNull(),
    imageIds: text('image_ids', { mode: 'json' }).$type<string[]>().notNull(),
    deck: text('deck', { mode: 'json' }).$type<string[]>().notNull(),
    status: text('status', { enum: GAME_STATUS_VALUES }).notNull(),
    createdAt: integer('created_at').notNull(),
    startedAt: integer('started_at'),
    pausedAt: integer('paused_at'),
    pausedMs: integer('paused_ms').notNull().default(0),
    finishedAt: integer('finished_at'),
    durationMs: integer('duration_ms'),
    moves: integer('moves'),
  },
  (table) => [index('games_player_idx').on(table.playerKey), index('games_created_idx').on(table.createdAt)],
);

/** Dernier tirage par joueur et couple catégorie × difficulté (EF-1.8). */
export const lastDraws = sqliteTable('last_draws', {
  drawKey: text('draw_key').primaryKey(),
  imageIds: text('image_ids', { mode: 'json' }).$type<string[]>().notNull(),
  updatedAt: integer('updated_at').notNull(),
});
