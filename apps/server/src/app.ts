import { existsSync } from 'node:fs';
import path from 'node:path';
import cookieParser from 'cookie-parser';
import express, { type Express } from 'express';
import helmet from 'helmet';
import type { CategoryRepository } from './content/types';
import type { GameService } from './games/gameService';
import { errorHandler } from './http/errorHandler';
import { HttpError } from './http/httpError';
import { playerIdentity } from './http/playerIdentity';
import { categoriesRouter } from './routes/categories';
import { gamesRouter } from './routes/games';

export interface AppDependencies {
  categories: CategoryRepository;
  games: GameService;
  contentDir: string;
  webDistDir?: string;
  secureCookies?: boolean;
}

export function createApp(deps: AppDependencies): Express {
  const app = express();

  // ENF-5.1 — en-têtes de sécurité et politique de sécurité de contenu restrictive.
  app.use(helmet());

  app.use('/media', express.static(deps.contentDir, { index: false, maxAge: '7d', immutable: true }));
  app.use('/media', (_req, res) => {
    res.status(404).end();
  });

  const api = express.Router();
  api.use(express.json({ limit: '64kb' }));
  api.use(cookieParser());
  api.use(playerIdentity(deps.secureCookies ?? false));
  api.use('/categories', categoriesRouter(deps.categories));
  api.use('/games', gamesRouter(deps.games));
  api.use(() => {
    throw new HttpError(404, 'route_introuvable', 'Point d’entrée inconnu.');
  });
  app.use('/api', api);

  const webDistDir = deps.webDistDir;
  if (webDistDir && existsSync(webDistDir)) {
    app.use(express.static(webDistDir, { index: false }));
    app.get(/^\/(?!api\/|media\/).*/, (_req, res) => {
      res.sendFile(path.join(webDistDir, 'index.html'));
    });
  }

  app.use(errorHandler);
  return app;
}
