import { existsSync } from 'node:fs';
import path from 'node:path';
import cookieParser from 'cookie-parser';
import express, { type Express } from 'express';
import helmet from 'helmet';
import type { AdminAuth } from './admin/adminAuth';
import type { AdminService } from './admin/adminService';
import type { CategoryRepository } from './content/types';
import type { GameService } from './games/gameService';
import { errorHandler } from './http/errorHandler';
import { HttpError } from './http/httpError';
import { playerIdentity } from './http/playerIdentity';
import { rateLimit } from './http/rateLimit';
import type { MediaStorage } from './media/storage';
import { adminRouter } from './routes/admin';
import { categoriesRouter, creditsRouter } from './routes/categories';
import { gamesRouter } from './routes/games';

export interface AppDependencies {
  categories: CategoryRepository;
  games: GameService;
  admin: AdminService;
  adminAuth: AdminAuth;
  media: MediaStorage;
  mediaDir: string;
  webDistDir?: string;
  secureCookies?: boolean;
}

export function createApp(deps: AppDependencies): Express {
  const app = express();

  // ENF-5.1 — en-têtes de sécurité et politique de sécurité de contenu restrictive.
  app.use(helmet());

  // Les images portent un nom unique : elles sont immuables et mises en cache longtemps.
  app.use('/media', express.static(deps.mediaDir, { index: false, maxAge: '365d', immutable: true }));
  app.use('/media', (_req, res) => {
    res.status(404).end();
  });

  const api = express.Router();
  api.use(express.json({ limit: '64kb' }));
  api.use(cookieParser());
  api.use('/admin', adminRouter(deps.admin, deps.adminAuth));
  api.use(playerIdentity(deps.secureCookies ?? false));
  api.use('/categories', categoriesRouter(deps.categories, deps.media));
  api.use('/credits', creditsRouter(deps.categories));
  // ENF-1.3 — limitation du débit d'ouverture de parties.
  api.post(
    '/games',
    rateLimit({
      windowMs: 60_000,
      max: 30,
      key: (req) => `${req.ip}:${String(req.res?.locals.playerKey)}`,
      message: 'Trop de parties ouvertes en peu de temps. Patientez une minute.',
    }),
  );
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
