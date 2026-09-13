import type { Difficulty, FinishGameResponse, GameStatus, UserRole } from '@recto/shared';
import { index, integer, primaryKey, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

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
    /** Comparaison au record établie à la clôture : rendue telle quelle si la clôture est répétée. */
    recordOutcome: text('record_outcome', { mode: 'json' }).$type<NonNullable<FinishGameResponse['record']>>(),
  },
  (table) => [
    index('games_player_idx').on(table.playerKey),
    index('games_user_idx').on(table.userId),
    index('games_created_idx').on(table.createdAt),
  ],
);

const USER_ROLE_VALUES = ['joueur', 'admin'] as const satisfies readonly UserRole[];

/** EF-4 — minimisation (ENF-6.1) : adresse, empreinte du mot de passe, pseudonyme, avatar. */
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  /** Adresse normalisée en minuscules. */
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  pseudo: text('pseudo').notNull(),
  /** Pseudonyme en minuscules : l'unicité ignore la casse. */
  pseudoKey: text('pseudo_key').notNull().unique(),
  avatar: text('avatar').notNull(),
  role: text('role', { enum: USER_ROLE_VALUES }).notNull().default('joueur'),
  emailVerifiedAt: integer('email_verified_at'),
  /** Incrémentée à chaque changement de mot de passe : révoque toutes les sessions ouvertes. */
  tokenVersion: integer('token_version').notNull().default(0),
  createdAt: integer('created_at').notNull(),
});

/** Jetons d'usage unique envoyés par courriel (EF-4.2, EF-4.3) ; seule leur empreinte est stockée. */
export const emailTokens = sqliteTable(
  'email_tokens',
  {
    tokenHash: text('token_hash').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    purpose: text('purpose', { enum: ['verification', 'reinitialisation'] }).notNull(),
    expiresAt: integer('expires_at').notNull(),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [index('email_tokens_user_idx').on(table.userId)],
);

/**
 * Record par couple catégorie × difficulté (§ 5.2). Redondant avec `games`, à dessein :
 * l'écran de résultat et le profil n'ont aucun agrégat à calculer.
 */
export const personalBests = sqliteTable(
  'personal_bests',
  {
    userId: text('user_id').notNull(),
    categoryId: text('category_id').notNull(),
    difficulty: text('difficulty', { enum: DIFFICULTY_VALUES }).notNull(),
    bestTimeMs: integer('best_time_ms').notNull(),
    /** Coups de la partie détentrice du meilleur temps : départage (EF-1.1). */
    recordMoves: integer('record_moves').notNull(),
    bestMoves: integer('best_moves').notNull(),
    bestAccuracy: real('best_accuracy').notNull(),
    gameId: text('game_id').notNull(),
    obtainedAt: integer('obtained_at').notNull(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.categoryId, table.difficulty] })],
);

/**
 * ENF-6.4 — mesure d'audience sans cookie : un compteur par jour et par page, sans identifiant
 * ni adresse IP. Rien ne permet de relier deux vues entre elles.
 */
export const pageViews = sqliteTable(
  'page_views',
  {
    /** Jour UTC, au format AAAA-MM-JJ. */
    day: text('day').notNull(),
    /** Gabarit de la page (`/jouer/monuments`, `/partie`…), jamais une adresse complète. */
    path: text('path').notNull(),
    views: integer('views').notNull().default(0),
  },
  (table) => [primaryKey({ columns: [table.day, table.path] })],
);

/** Dernier tirage par joueur et couple catégorie × difficulté (EF-1.8). */
export const lastDraws = sqliteTable('last_draws', {
  drawKey: text('draw_key').primaryKey(),
  imageIds: text('image_ids', { mode: 'json' }).$type<string[]>().notNull(),
  updatedAt: integer('updated_at').notNull(),
});
