import {
  accuracy,
  comparePerformances,
  playableDifficulties,
  type Difficulty,
  type HistoryEntry,
  type Performance,
  type PlayerStats,
  type RecordEntry,
} from '@recto/shared';
import { and, count, desc, eq, inArray, isNull } from 'drizzle-orm';
import type { SqlContentRepository } from '../content/contentRepository';
import type { Database } from '../db/client';
import { games, personalBests } from '../db/schema';
import type { GameRecord } from '../games/types';

type BestRow = typeof personalBests.$inferSelect;
const PLAYED = ['terminee', 'abandonnee'] as const;
const keyOf = (categoryId: string, difficulty: Difficulty) => `${categoryId}:${difficulty}`;

export interface RecordOutcome {
  previous: Performance | null;
  improved: boolean;
}

/** Records personnels et statistiques (EF-5). */
export class RecordService {
  constructor(
    private readonly db: Database,
    private readonly content: SqlContentRepository,
  ) {}

  /** Met à jour le record d'un couple catégorie × difficulté après une partie validée. */
  async registerFinish(game: GameRecord): Promise<RecordOutcome> {
    if (!game.userId || game.durationMs === null || game.moves === null) return { previous: null, improved: false };
    const existing = await this.db
      .select()
      .from(personalBests)
      .where(
        and(
          eq(personalBests.userId, game.userId),
          eq(personalBests.categoryId, game.categoryId),
          eq(personalBests.difficulty, game.difficulty),
        ),
      )
      .get();
    const previous = existing ? { durationMs: existing.bestTimeMs, moves: existing.recordMoves } : null;
    const next = mergeBest(existing, game);
    await this.db
      .insert(personalBests)
      .values(next)
      .onConflictDoUpdate({
        target: [personalBests.userId, personalBests.categoryId, personalBests.difficulty],
        set: next,
      });
    return { previous, improved: next.gameId === game.id };
  }

  /** Recalcule tous les records d'un compte à partir de ses parties terminées. */
  async recompute(userId: string): Promise<void> {
    const finished = (await this.db
      .select()
      .from(games)
      .where(and(eq(games.userId, userId), eq(games.status, 'terminee')))
      .orderBy(games.finishedAt)) as GameRecord[];
    const bests = new Map<string, BestRow>();
    for (const game of finished) {
      const key = keyOf(game.categoryId, game.difficulty);
      bests.set(key, mergeBest(bests.get(key), game));
    }
    await this.db.delete(personalBests).where(eq(personalBests.userId, userId));
    if (bests.size > 0) await this.db.insert(personalBests).values([...bests.values()]);
  }

  /** EF-4.4 — parties jouées en invité sur ce navigateur et encore rattachables. */
  async countGuestGames(guestKey: string): Promise<number> {
    const [row] = await this.db
      .select({ n: count() })
      .from(games)
      .where(and(eq(games.playerKey, guestKey), isNull(games.userId), inArray(games.status, [...PLAYED])));
    return row?.n ?? 0;
  }

  /**
   * Rattache au compte les parties jouées en invité. Seules les parties mesurées et
   * validées par le serveur sont reprises : les records locaux du navigateur, modifiables
   * à volonté, ne font jamais foi (§ 5.4).
   */
  async claimGuestGames(guestKey: string, userId: string): Promise<number> {
    const result = await this.db
      .update(games)
      .set({ userId })
      .where(and(eq(games.playerKey, guestKey), isNull(games.userId), inArray(games.status, [...PLAYED])));
    if (result.rowsAffected > 0) await this.recompute(userId);
    return result.rowsAffected;
  }

  async stats(userId: string): Promise<PlayerStats> {
    const categories = await this.content.listAll();
    const categoryById = new Map(categories.map((category) => [category.id, category]));
    const played = await this.db
      .select()
      .from(games)
      .where(and(eq(games.userId, userId), inArray(games.status, [...PLAYED])))
      .orderBy(desc(games.finishedAt));
    const finished = played.filter((game) => game.status === 'terminee');
    const bests = await this.db.select().from(personalBests).where(eq(personalBests.userId, userId));

    const perKey = new Map<string, { count: number; total: number }>();
    for (const game of finished) {
      const key = keyOf(game.categoryId, game.difficulty);
      const entry = perKey.get(key) ?? { count: 0, total: 0 };
      perKey.set(key, { count: entry.count + 1, total: entry.total + (game.durationMs ?? 0) });
    }

    const completable = new Set(
      categories
        .filter((category) => category.published)
        .flatMap((category) =>
          playableDifficulties(category.images, category.maxDifficulty).map((difficulty) => keyOf(category.id, difficulty)),
        ),
    );

    const records: RecordEntry[] = bests.flatMap((best) => {
      const category = categoryById.get(best.categoryId);
      if (!category) return [];
      const aggregate = perKey.get(keyOf(best.categoryId, best.difficulty)) ?? { count: 0, total: 0 };
      return [
        {
          category: category.slug,
          categoryName: category.name,
          difficulty: best.difficulty,
          bestMs: best.bestTimeMs,
          recordMoves: best.recordMoves,
          bestMoves: best.bestMoves,
          bestAccuracy: best.bestAccuracy,
          gamesFinished: aggregate.count,
          averageMs: aggregate.count > 0 ? Math.round(aggregate.total / aggregate.count) : best.bestTimeMs,
          obtainedAt: new Date(best.obtainedAt).toISOString(),
        },
      ];
    });

    const history: HistoryEntry[] = played.slice(0, 20).flatMap((game) => {
      const category = categoryById.get(game.categoryId);
      if (!category) return [];
      return [
        {
          id: game.id,
          category: category.slug,
          categoryName: category.name,
          difficulty: game.difficulty,
          status: game.status as HistoryEntry['status'],
          durationMs: game.durationMs,
          moves: game.moves,
          playedAt: new Date(game.finishedAt ?? game.createdAt).toISOString(),
        },
      ];
    });

    return {
      totals: {
        gamesPlayed: played.length,
        gamesFinished: finished.length,
        totalPlayMs: finished.reduce((sum, game) => sum + (game.durationMs ?? 0), 0),
        cardsFlipped: finished.reduce((sum, game) => sum + (game.moves ?? 0) * 2, 0),
        completed: [...perKey.keys()].filter((key) => completable.has(key)).length,
        completable: completable.size,
      },
      records,
      history,
    };
  }

  /** ENF-6.2 — toutes les parties d'un compte, pour l'export des données. */
  async gamesOf(userId: string) {
    const categories = new Map((await this.content.listAll()).map((category) => [category.id, category.slug]));
    const rows = await this.db.select().from(games).where(eq(games.userId, userId)).orderBy(games.createdAt);
    return rows.map((game) => ({
      category: categories.get(game.categoryId) ?? null,
      difficulty: game.difficulty,
      status: game.status,
      createdAt: new Date(game.createdAt).toISOString(),
      finishedAt: game.finishedAt === null ? null : new Date(game.finishedAt).toISOString(),
      durationMs: game.durationMs,
      moves: game.moves,
    }));
  }
}

/** Fusionne une partie terminée dans un record : temps d'abord, coups en départage (EF-1.1). */
function mergeBest(existing: BestRow | undefined, game: GameRecord): BestRow {
  const performance = { durationMs: game.durationMs!, moves: game.moves! };
  const gameAccuracy = accuracy(game.deck.length / 2, game.moves!);
  const improved =
    !existing || comparePerformances(performance, { durationMs: existing.bestTimeMs, moves: existing.recordMoves }) < 0;
  return {
    userId: game.userId!,
    categoryId: game.categoryId,
    difficulty: game.difficulty,
    bestTimeMs: improved ? performance.durationMs : existing.bestTimeMs,
    recordMoves: improved ? performance.moves : existing.recordMoves,
    bestMoves: Math.min(performance.moves, existing?.bestMoves ?? Infinity),
    bestAccuracy: Math.max(gameAccuracy, existing?.bestAccuracy ?? 0),
    gameId: improved ? game.id : existing.gameId,
    obtainedAt: improved ? (game.finishedAt ?? Date.now()) : existing.obtainedAt,
  };
}
