import type { GameStatus } from '@recto/shared';
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

/** Magasin du lot 1. Les copies à l'entrée et à la sortie reproduisent le comportement d'une base. */
export class InMemoryGameStore implements GameStore {
  private readonly games = new Map<string, GameRecord>();
  private readonly draws = new Map<string, string[]>();

  async insert(game: GameRecord): Promise<void> {
    this.games.set(game.id, structuredClone(game));
  }

  async get(id: string): Promise<GameRecord | undefined> {
    const game = this.games.get(id);
    return game && structuredClone(game);
  }

  async updateIf(game: GameRecord, expected: GameStatus): Promise<boolean> {
    if (this.games.get(game.id)?.status !== expected) return false;
    this.games.set(game.id, structuredClone(game));
    return true;
  }

  async lastDraw(key: string): Promise<string[] | undefined> {
    return this.draws.get(key)?.slice();
  }

  async setLastDraw(key: string, imageIds: readonly string[]): Promise<void> {
    this.draws.set(key, [...imageIds]);
  }

  /** Supprime les parties créées avant `timestamp` ; renvoie le nombre de parties supprimées. */
  purgeCreatedBefore(timestamp: number): number {
    let removed = 0;
    for (const [id, game] of this.games) {
      if (game.createdAt < timestamp) {
        this.games.delete(id);
        removed++;
      }
    }
    return removed;
  }
}
