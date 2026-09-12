import type { GameStatus } from '@recto/shared';
import { and, eq, inArray, lt } from 'drizzle-orm';
import type { Database } from '../db/client';
import { games, lastDraws } from '../db/schema';
import type { GameRecord } from './types';

export interface GameStore {
  insert(game: GameRecord): Promise<void>;
  get(id: string): Promise<GameRecord | undefined>;
  /**
   * Enregistre la partie seulement si son statut stocké vaut encore `expected`.
   * Garantit la clôture unique d'une partie même face à des requêtes simultanées (ENF-1.2).
   */
  updateIf(game: GameRecord, expected: GameStatus): Promise<boolean>;
  /** Dernier tirage d'un joueur pour un couple catégorie × difficulté (EF-1.8). */
  lastDraw(key: string): Promise<string[] | undefined>;
  setLastDraw(key: string, imageIds: readonly string[]): Promise<void>;
}

export class SqlGameStore implements GameStore {
  constructor(private readonly db: Database) {}

  async insert(game: GameRecord): Promise<void> {
    await this.db.insert(games).values(game);
  }

  async get(id: string): Promise<GameRecord | undefined> {
    return this.db.select().from(games).where(eq(games.id, id)).get();
  }

  async updateIf(game: GameRecord, expected: GameStatus): Promise<boolean> {
    const { id, ...fields } = game;
    const result = await this.db
      .update(games)
      .set(fields)
      .where(and(eq(games.id, id), eq(games.status, expected)));
    return result.rowsAffected > 0;
  }

  async lastDraw(key: string): Promise<string[] | undefined> {
    const row = await this.db.select().from(lastDraws).where(eq(lastDraws.drawKey, key)).get();
    return row?.imageIds;
  }

  async setLastDraw(key: string, imageIds: readonly string[]): Promise<void> {
    const values = { drawKey: key, imageIds: [...imageIds], updatedAt: Date.now() };
    await this.db
      .insert(lastDraws)
      .values(values)
      .onConflictDoUpdate({ target: lastDraws.drawKey, set: { imageIds: values.imageIds, updatedAt: values.updatedAt } });
  }

  /** Les parties laissées en plan sont classées abandonnées (EF-1.6) ; renvoie leur nombre. */
  async expireUnfinished(createdBefore: number): Promise<number> {
    const result = await this.db
      .update(games)
      .set({ status: 'abandonnee', finishedAt: Date.now() })
      .where(and(inArray(games.status, ['preparee', 'en_cours']), lt(games.createdAt, createdBefore)));
    return result.rowsAffected;
  }
}
