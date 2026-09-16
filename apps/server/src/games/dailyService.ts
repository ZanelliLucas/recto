import { AVATARS, DAILY_DIFFICULTY, dailyCategory, dailyDay, type DailyChallenge, type DailyEntry } from '@recto/shared';
import type { CategoryRepository } from '../content/types';
import type { MediaStorage } from '../media/storage';
import { publishedSummaries } from '../routes/categories';
import type { SqlUserRepository } from '../auth/userRepository';
import type { GameStore } from './gameStore';

/** Nombre de lignes affichées : au-delà, le tableau cesse d'être lisible. */
const BOARD_SIZE = 20;

/**
 * Défi du jour (§ 3.3) : une même grille pour tout le monde, tirée de la date. Seuls les comptes
 * sont classés — un invité joue le défi, mais aucune donnée nominative ne naît d'une visite
 * anonyme. Le classement porte sur la première partie terminée du jour.
 */
export class DailyService {
  constructor(
    private readonly categories: CategoryRepository,
    private readonly media: MediaStorage,
    private readonly games: GameStore,
    private readonly users: SqlUserRepository,
    private readonly now: () => number = Date.now,
  ) {}

  /** Jour courant selon l'horloge du service : une seule source, pour le tirage et le classement. */
  today(): string {
    return dailyDay(this.now());
  }

  /** Catégorie du jour, prise parmi celles qui proposent la difficulté du défi. */
  async category(day = this.today()): Promise<{ slug: string; name: string } | null> {
    const playable = (await publishedSummaries(this.categories, this.media)).filter((summary) =>
      summary.difficulties.includes(DAILY_DIFFICULTY),
    );
    const slug = dailyCategory(day, playable.map((summary) => summary.slug));
    const found = playable.find((summary) => summary.slug === slug);
    return found ? { slug: found.slug, name: found.name } : null;
  }

  async challenge(userId: string | null): Promise<DailyChallenge> {
    const day = this.today();
    const category = await this.category(day);
    const [top, mine] = await Promise.all([
      this.games.dailyLeaderboard(day, BOARD_SIZE),
      userId ? this.games.dailyEntry(day, userId) : Promise.resolve(undefined),
    ]);

    const ids = [...new Set([...top.map((entry) => entry.userId), ...(mine ? [mine.userId] : [])])];
    const profiles = await this.users.publicProfiles(ids);
    const line = (entry: { userId: string; durationMs: number; moves: number }, rank: number): DailyEntry => ({
      rank,
      pseudo: profiles.get(entry.userId)?.pseudo ?? 'Joueur',
      avatar: profiles.get(entry.userId)?.avatar ?? AVATARS[0],
      durationMs: entry.durationMs,
      moves: entry.moves,
      mine: entry.userId === userId,
    });

    return {
      day,
      difficulty: DAILY_DIFFICULTY,
      category: category?.slug ?? null,
      categoryName: category?.name ?? null,
      leaderboard: top.map((entry, index) => line(entry, index + 1)),
      mine: mine ? line(mine, mine.rank) : null,
      players: await this.games.dailyPlayers(day),
    };
  }
}
