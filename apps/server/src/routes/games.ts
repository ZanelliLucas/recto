import { DAILY_DIFFICULTY, DIFFICULTY_ORDER } from '@recto/shared';
import { Router } from 'express';
import { z } from 'zod';
import type { DailyService } from '../games/dailyService';
import type { GameService } from '../games/gameService';
import { HttpError } from '../http/httpError';
import { parseBody } from '../http/validate';

const GAME_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const token = z.string().min(1).max(128);
const position = z.number().int().min(0).max(999);

const createSchema = z.object({
  category: z.string().min(1).max(64),
  difficulty: z.enum(DIFFICULTY_ORDER),
  /** Partie du défi du jour : même tirage pour tous, et classement à la clôture. */
  daily: z.boolean().optional(),
});
const tokenSchema = z.object({ token });
const finishSchema = z.object({
  token,
  moves: z.array(z.tuple([position, position])).max(5000),
});

function gameId(raw: string | undefined): string {
  if (!raw || !GAME_ID.test(raw)) throw new HttpError(404, 'partie_introuvable', 'Partie introuvable.');
  return raw;
}

export function gamesRouter(games: GameService, daily?: DailyService): Router {
  const router = Router();

  router.post('/', async (req, res) => {
    const { category, difficulty, daily: isDaily } = parseBody(createSchema, req.body);
    // Le jour et la catégorie du défi viennent du serveur : le client ne choisit pas sa grille.
    let day: string | null = null;
    if (isDaily) {
      const today = await daily?.category();
      if (!today || today.slug !== category || difficulty !== DAILY_DIFFICULTY) {
        throw new HttpError(409, 'defi_expire', 'Le défi du jour a changé : rechargez la page.');
      }
      day = daily!.today();
    }
    res.status(201).json(await games.create(res.locals.player!, category, difficulty, day));
  });

  router.post('/:id/start', async (req, res) => {
    res.json(await games.start(gameId(req.params.id), parseBody(tokenSchema, req.body).token));
  });

  router.post('/:id/pause', async (req, res) => {
    await games.pause(gameId(req.params.id), parseBody(tokenSchema, req.body).token);
    res.status(204).end();
  });

  router.post('/:id/resume', async (req, res) => {
    await games.resume(gameId(req.params.id), parseBody(tokenSchema, req.body).token);
    res.status(204).end();
  });

  router.post('/:id/abandon', async (req, res) => {
    await games.abandon(gameId(req.params.id), parseBody(tokenSchema, req.body).token);
    res.status(204).end();
  });

  router.post('/:id/finish', async (req, res) => {
    const body = parseBody(finishSchema, req.body);
    res.json(await games.finish(gameId(req.params.id), body.token, body.moves));
  });

  return router;
}
