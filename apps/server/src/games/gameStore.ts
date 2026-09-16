import type { GameStatus } from '@recto/shared';
import { and, asc, count, eq, inArray, isNull, lt, or } from 'drizzle-orm';
import type { Database } from '../db/client';
import { dailyScores, games, lastDraws } from '../db/schema';
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
  /** Classe une partie du défi ; sans effet si le compte a déjà une entrée ce jour-là. */
  recordDailyScore(game: GameRecord): Promise<void>;
  /** Meilleurs temps du jour, du plus rapide au plus lent, à égalité le moins de coups. */
  dailyLeaderboard(day: string, limit: number): Promise<DailyEntry[]>;
  /** Entrée d'un compte pour ce jour, classement compris. */
  dailyEntry(day: string, userId: string): Promise<(DailyEntry & { rank: number }) | undefined>;
  /** Nombre de comptes classés ce jour-là. */
  dailyPlayers(day: string): Promise<number>;
}

export interface DailyEntry {
  userId: string;
  durationMs: number;
  moves: number;
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

  async recordDailyScore(game: GameRecord): Promise<void> {
    await this.db
      .insert(dailyScores)
      .values({
        day: game.dailyDay!,
        userId: game.userId!,
        categoryId: game.categoryId,
        durationMs: game.durationMs!,
        moves: game.moves!,
        gameId: game.id,
        finishedAt: game.finishedAt!,
      })
      // Seule la première partie terminée du jour compte : rejouer n'améliore pas son classement.
      .onConflictDoNothing();
  }

  async dailyLeaderboard(day: string, limit: number): Promise<DailyEntry[]> {
    return this.db
      .select({ userId: dailyScores.userId, durationMs: dailyScores.durationMs, moves: dailyScores.moves })
      .from(dailyScores)
      .where(eq(dailyScores.day, day))
      .orderBy(asc(dailyScores.durationMs), asc(dailyScores.moves))
      .limit(limit);
  }

  async dailyEntry(day: string, userId: string): Promise<(DailyEntry & { rank: number }) | undefined> {
    const mine = await this.db
      .select({ userId: dailyScores.userId, durationMs: dailyScores.durationMs, moves: dailyScores.moves })
      .from(dailyScores)
      .where(and(eq(dailyScores.day, day), eq(dailyScores.userId, userId)))
      .get();
    if (!mine) return undefined;
    // Rang : nombre de joueurs strictement devant, plus un.
    const ahead = await this.db
      .select({ count: count() })
      .from(dailyScores)
      .where(
        and(
          eq(dailyScores.day, day),
          or(
            lt(dailyScores.durationMs, mine.durationMs),
            and(eq(dailyScores.durationMs, mine.durationMs), lt(dailyScores.moves, mine.moves)),
          ),
        ),
      )
      .get();
    return { ...mine, rank: (ahead?.count ?? 0) + 1 };
  }

  async dailyPlayers(day: string): Promise<number> {
    const row = await this.db.select({ count: count() }).from(dailyScores).where(eq(dailyScores.day, day)).get();
    return row?.count ?? 0;
  }

  /** Les parties laissées en plan sont classées abandonnées (EF-1.6) ; renvoie leur nombre. */
  async expireUnfinished(createdBefore: number): Promise<number> {
    const result = await this.db
      .update(games)
      .set({ status: 'abandonnee', finishedAt: Date.now() })
      .where(and(inArray(games.status, ['preparee', 'en_cours']), lt(games.createdAt, createdBefore)));
    return result.rowsAffected;
  }

  /** Parties jouées sans compte, au-delà de la durée annoncée par la politique de confidentialité. */
  async purgeGuestGames(createdBefore: number): Promise<number> {
    const result = await this.db.delete(games).where(and(isNull(games.userId), lt(games.createdAt, createdBefore)));
    return result.rowsAffected;
  }
}
