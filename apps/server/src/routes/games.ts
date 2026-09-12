import { DIFFICULTY_ORDER } from '@recto/shared';
import { Router } from 'express';
import { z } from 'zod';
import type { GameService } from '../games/gameService';
import { HttpError } from '../http/httpError';
import { parseBody } from '../http/validate';

const GAME_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const token = z.string().min(1).max(128);
const position = z.number().int().min(0).max(999);

const createSchema = z.object({
  category: z.string().min(1).max(64),
  difficulty: z.enum(DIFFICULTY_ORDER),
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

export function gamesRouter(games: GameService): Router {
  const router = Router();

  router.post('/', async (req, res) => {
    const { category, difficulty } = parseBody(createSchema, req.body);
    res.status(201).json(await games.create(res.locals.playerKey as string, category, difficulty));
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
