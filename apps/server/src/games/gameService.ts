import { randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import {
  COUNTDOWN_MS,
  DIFFICULTIES,
  accuracy,
  buildDeck,
  drawImages,
  minDurationMs,
  mulberry32,
  playableDifficulties,
  replayMoves,
  type CreateGameResponse,
  type Difficulty,
  type FinishGameResponse,
  type GameStatus,
  type Move,
  type StartGameResponse,
} from '@recto/shared';
import { mediaUrl, type CategoryRepository } from '../content/types';
import { HttpError } from '../http/httpError';
import type { GameStore } from './gameStore';
import type { GameRecord } from './types';

export interface GameServiceOptions {
  now?: () => number;
  randomSeed?: () => number;
}

const notFound = () => new HttpError(404, 'partie_introuvable', 'Partie introuvable.');
const conflict = (message: string) => new HttpError(409, 'etat_incompatible', message);

/**
 * Cycle de vie d'une partie. Le temps est mesuré exclusivement ici (ENF-1.1) :
 * le client ne transmet jamais de durée, seulement la liste de ses coups.
 */
export class GameService {
  private readonly now: () => number;
  private readonly randomSeed: () => number;

  constructor(
    private readonly categories: CategoryRepository,
    private readonly games: GameStore,
    options: GameServiceOptions = {},
  ) {
    this.now = options.now ?? Date.now;
    this.randomSeed = options.randomSeed ?? (() => randomBytes(4).readUInt32LE(0));
  }

  /** Tirage, mélange et enregistrement. Le chronomètre ne part qu'avec `start`, une fois les images préchargées. */
  async create(playerKey: string, slug: string, difficulty: Difficulty): Promise<CreateGameResponse> {
    const category = await this.categories.findPublished(slug);
    if (!category) throw new HttpError(404, 'categorie_introuvable', 'Catégorie introuvable.');

    const pool = category.images.map(({ id, visualGroup }) => ({ id, visualGroup }));
    if (!playableDifficulties(pool).includes(difficulty)) {
      throw new HttpError(400, 'difficulte_indisponible', 'Cette difficulté n’est pas proposée pour cette catégorie.');
    }

    const { pairs } = DIFFICULTIES[difficulty];
    const drawKey = `${playerKey}:${slug}:${difficulty}`;
    const seed = this.randomSeed();
    const rng = mulberry32(seed);
    const imageIds = drawImages(pool, pairs, rng, await this.games.lastDraw(drawKey));
    const deck = buildDeck(imageIds, rng);

    const game: GameRecord = {
      id: randomUUID(),
      token: randomBytes(24).toString('base64url'),
      playerKey,
      userId: null,
      categorySlug: slug,
      difficulty,
      seed,
      imageIds,
      deck,
      status: 'preparee',
      createdAt: this.now(),
      startedAt: null,
      pausedAt: null,
      pausedMs: 0,
      finishedAt: null,
      durationMs: null,
      moves: null,
    };
    await this.games.insert(game);
    await this.games.setLastDraw(drawKey, imageIds);

    const imagesById = new Map(category.images.map((image) => [image.id, image]));
    return {
      gameId: game.id,
      token: game.token,
      category: slug,
      difficulty,
      pairs,
      deck,
      images: imageIds.map((id) => {
        const image = imagesById.get(id)!;
        return { id, url: mediaUrl(slug, image.file), title: image.title };
      }),
    };
  }

  /** Appelé à l'issue du préchargement : le chronomètre démarre à la fin du décompte. */
  async start(id: string, token: string): Promise<StartGameResponse> {
    const game = await this.owned(id, token);
    if (game.status !== 'preparee') throw conflict('La partie a déjà commencé.');
    game.status = 'en_cours';
    game.startedAt = this.now() + COUNTDOWN_MS;
    await this.commit(game, 'preparee');
    return { countdownMs: COUNTDOWN_MS };
  }

  /** EF-1.5 — suspend le chronomètre. Sans effet si la partie est déjà en pause. */
  async pause(id: string, token: string): Promise<void> {
    const game = await this.running(id, token);
    if (game.pausedAt !== null) return;
    const now = this.now();
    if (now < game.startedAt!) throw conflict('Impossible de mettre en pause pendant le décompte.');
    game.pausedAt = now;
    await this.commit(game, 'en_cours');
  }

  async resume(id: string, token: string): Promise<void> {
    const game = await this.running(id, token);
    if (game.pausedAt === null) return;
    game.pausedMs += this.now() - game.pausedAt;
    game.pausedAt = null;
    await this.commit(game, 'en_cours');
  }

  /** Clôture : rejoue les coups, applique les contrôles de vraisemblance (ENF-1.2) et fige la durée. */
  async finish(id: string, token: string, moves: readonly Move[]): Promise<FinishGameResponse> {
    const game = await this.running(id, token);
    const now = this.now();
    const pausedMs = game.pausedMs + (game.pausedAt === null ? 0 : now - game.pausedAt);
    const durationMs = now - game.startedAt! - pausedMs;
    const pairs = game.deck.length / 2;
    const replay = replayMoves(game.deck, moves);

    game.finishedAt = now;
    game.pausedAt = null;
    game.pausedMs = pausedMs;

    if (!replay.ok || durationMs < minDurationMs(pairs)) {
      // Une partie rejetée est close : on ne peut pas retenter une autre liste de coups.
      game.status = 'rejetee';
      await this.commit(game, 'en_cours');
      throw replay.ok
        ? new HttpError(422, 'duree_invraisemblable', 'Durée de partie invraisemblable.')
        : new HttpError(422, 'coups_invalides', 'La liste des coups ne correspond pas à une partie terminée.');
    }

    game.status = 'terminee';
    game.durationMs = durationMs;
    game.moves = replay.moves;
    await this.commit(game, 'en_cours');
    return { durationMs, moves: replay.moves, pairs, accuracy: accuracy(pairs, replay.moves) };
  }

  /** EF-1.6 — la partie compte comme jouée mais n'entre jamais dans les records. */
  async abandon(id: string, token: string): Promise<void> {
    const game = await this.owned(id, token);
    if (game.status !== 'preparee' && game.status !== 'en_cours') throw conflict('La partie est déjà terminée.');
    const expected = game.status;
    game.status = 'abandonnee';
    game.finishedAt = this.now();
    await this.commit(game, expected);
  }

  /**
   * Seul le détenteur du secret de partie peut agir dessus. Le lot 3 y ajoutera
   * la vérification du compte connecté.
   */
  private async owned(id: string, token: string): Promise<GameRecord> {
    const game = await this.games.get(id);
    if (!game || !sameToken(game.token, token)) throw notFound();
    return game;
  }

  private async running(id: string, token: string): Promise<GameRecord> {
    const game = await this.owned(id, token);
    if (game.status !== 'en_cours') throw conflict('La partie n’est pas en cours.');
    return game;
  }

  private async commit(game: GameRecord, expected: GameStatus): Promise<void> {
    if (!(await this.games.updateIf(game, expected))) throw conflict('La partie a été modifiée entre-temps.');
  }
}

function sameToken(expected: string, received: string): boolean {
  const a = Buffer.from(expected);
  const b = Buffer.from(received);
  return a.length === b.length && timingSafeEqual(a, b);
}
