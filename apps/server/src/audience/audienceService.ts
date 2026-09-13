import type { AudienceSummary } from '@recto/shared';
import { desc, eq, gte, lt, sql } from 'drizzle-orm';
import type { CategoryRepository } from '../content/types';
import type { Database } from '../db/client';
import { categories, games, pageViews } from '../db/schema';

const DAY_MS = 24 * 60 * 60 * 1000;
export const isoDay = (time: number) => new Date(time).toISOString().slice(0, 10);

/** Pages comptées telles quelles ; les autres adresses sont ramenées à leur gabarit ou ignorées. */
const STATIC_PATHS = new Set([
  '/',
  '/categories',
  '/comment-jouer',
  '/credits',
  '/mentions-legales',
  '/confidentialite',
  '/contact',
  '/connexion',
  '/inscription',
  '/verification',
  '/mot-de-passe-oublie',
  '/reinitialisation',
  '/profil',
  '/parametres',
]);

/**
 * Ramène une adresse à un gabarit sans donnée propre au visiteur : pas de paramètre (jetons des
 * liens envoyés par courriel), pas d'identifiant de partie. Adresses inconnues et back-office : null.
 */
export function normalizePath(raw: string, slugs: ReadonlySet<string>): string | null {
  const path = raw.split(/[?#]/)[0]!.replace(/\/+$/, '') || '/';
  if (STATIC_PATHS.has(path)) return path;
  const category = /^\/jouer\/([a-z0-9-]+)$/.exec(path);
  if (category) return slugs.has(category[1]!) ? path : null;
  if (/^\/partie\/[\w-]+\/resultat$/.test(path)) return '/partie/resultat';
  if (/^\/partie\/[\w-]+$/.test(path)) return '/partie';
  return null;
}

export class AudienceService {
  private slugs: { value: Set<string>; expiresAt: number } | null = null;

  constructor(
    private readonly db: Database,
    private readonly content: CategoryRepository,
    private readonly now: () => number = Date.now,
  ) {}

  /** Compte une vue ; renvoie faux si l'adresse n'est pas une page comptée. */
  async record(rawPath: string): Promise<boolean> {
    const path = normalizePath(rawPath, await this.publishedSlugs());
    if (!path) return false;
    await this.db
      .insert(pageViews)
      .values({ day: isoDay(this.now()), path, views: 1 })
      .onConflictDoUpdate({ target: [pageViews.day, pageViews.path], set: { views: sql`${pageViews.views} + 1` } });
    return true;
  }

  async summary(days = 30): Promise<AudienceSummary> {
    const now = this.now();
    const since = now - (days - 1) * DAY_MS;
    const from = isoDay(since);
    const to = isoDay(now);
    const sinceMidnight = Date.parse(`${from}T00:00:00Z`);

    const views = await this.db
      .select({ day: pageViews.day, views: sql<number>`sum(${pageViews.views})` })
      .from(pageViews)
      .where(gte(pageViews.day, from))
      .groupBy(pageViews.day);
    const played = await this.db
      .select({
        day: sql<string>`strftime('%Y-%m-%d', ${games.createdAt} / 1000, 'unixepoch')`,
        started: sql<number>`sum(${games.startedAt} is not null)`,
        finished: sql<number>`sum(${games.status} = 'terminee')`,
      })
      .from(games)
      .where(gte(games.createdAt, sinceMidnight))
      .groupBy(sql`1`);
    const pages = await this.db
      .select({ path: pageViews.path, views: sql<number>`sum(${pageViews.views})` })
      .from(pageViews)
      .where(gte(pageViews.day, from))
      .groupBy(pageViews.path)
      .orderBy(desc(sql`2`))
      .limit(20);
    const perCategory = await this.db
      .select({
        name: categories.name,
        games: sql<number>`count(*)`,
        finished: sql<number>`sum(${games.status} = 'terminee')`,
      })
      .from(games)
      .innerJoin(categories, eq(categories.id, games.categoryId))
      .where(gte(games.createdAt, sinceMidnight))
      .groupBy(categories.id)
      .orderBy(desc(sql`2`));

    const viewsByDay = new Map(views.map((row) => [row.day, Number(row.views)]));
    const gamesByDay = new Map(played.map((row) => [row.day, row]));
    const series = Array.from({ length: days }, (_, offset) => {
      const day = isoDay(since + offset * DAY_MS);
      const gamesOfDay = gamesByDay.get(day);
      return {
        day,
        views: viewsByDay.get(day) ?? 0,
        gamesStarted: Number(gamesOfDay?.started ?? 0),
        gamesFinished: Number(gamesOfDay?.finished ?? 0),
      };
    });

    return {
      from,
      to,
      days: series,
      pages: pages.map((row) => ({ path: row.path, views: Number(row.views) })),
      categories: perCategory.map((row) => ({ name: row.name, games: Number(row.games), finished: Number(row.finished ?? 0) })),
    };
  }

  /** Durée de conservation annoncée par la politique de confidentialité. */
  async purge(before: number): Promise<number> {
    const result = await this.db.delete(pageViews).where(lt(pageViews.day, isoDay(before)));
    return result.rowsAffected;
  }

  /** Les catégories changent rarement : la liste des adresses admises est relue chaque minute au plus. */
  private async publishedSlugs(): Promise<Set<string>> {
    const now = this.now();
    if (this.slugs && this.slugs.expiresAt > now) return this.slugs.value;
    const value = new Set((await this.content.listPublished()).map((category) => category.slug));
    this.slugs = { value, expiresAt: now + 60_000 };
    return value;
  }
}
