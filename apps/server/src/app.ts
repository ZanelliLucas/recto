import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import express, { type Express, type Response } from 'express';
import helmet from 'helmet';
import type { AdminService } from './admin/adminService';
import type { AudienceService } from './audience/audienceService';
import type { AuthService } from './auth/authService';
import { currentUser } from './auth/middleware';
import type { SessionManager } from './auth/sessions';
import type { SqlUserRepository } from './auth/userRepository';
import type { CategoryRepository } from './content/types';
import type { GameService } from './games/gameService';
import { errorHandler } from './http/errorHandler';
import { HttpError } from './http/httpError';
import { playerIdentity } from './http/playerIdentity';
import { rateLimit } from './http/rateLimit';
import { sameOrigin } from './http/sameOrigin';
import { logger } from './logger';
import type { MediaStorage } from './media/storage';
import type { RecordService } from './records/recordService';
import { adminRouter } from './routes/admin';
import { authRouter } from './routes/auth';
import { categoriesRouter, creditsRouter } from './routes/categories';
import { gamesRouter } from './routes/games';
import { meRouter } from './routes/me';
import { telemetryRouter } from './routes/telemetry';
import { renderPage, robotsTxt, SeoService } from './seo/pages';
import { SocialImages } from './seo/socialImage';

export interface AppDependencies {
  categories: CategoryRepository;
  games: GameService;
  admin: AdminService;
  auth: AuthService;
  records: RecordService;
  users: SqlUserRepository;
  sessions: SessionManager;
  media: MediaStorage;
  audience: AudienceService;
  mediaDir: string;
  /** Origine publique du site : liens absolus, et seule origine étrangère à l'hôte admise en écriture. */
  appUrl: string;
  webDistDir?: string;
  secureCookies?: boolean;
  /** Nombre de mandataires inverses de confiance (adresse du client, protocole d'origine). */
  trustProxy?: number | false;
  /** ENF-5.1 — redirige toute requête HTTP vers l'adresse HTTPS publique. */
  forceHttps?: boolean;
  /** Faux en développement et en recette : aucune page n'est indexée (§ 7.5). */
  indexable?: boolean;
  version?: string;
  /** Sonde de disponibilité : lève une erreur si une dépendance (la base) est hors service. */
  checkHealth?: () => Promise<void>;
}

const sendImage = (res: Response, image: Buffer) => {
  res.type('image/jpeg').set('Cache-Control', 'public, max-age=86400').send(image);
};

export function createApp(deps: AppDependencies): Express {
  const app = express();
  const indexable = deps.indexable ?? false;
  app.set('trust proxy', deps.trustProxy ?? false);

  // § 7.5 — supervision de la disponibilité, hors redirection HTTPS : les sondes internes parlent HTTP.
  app.get('/api/health', async (_req, res) => {
    try {
      await deps.checkHealth?.();
      res.set('Cache-Control', 'no-store').json({ status: 'ok', version: deps.version ?? 'dev', uptimeS: Math.round(process.uptime()) });
    } catch (error) {
      logger.error('Sonde de disponibilité en échec', error);
      res.status(503).set('Cache-Control', 'no-store').json({ status: 'indisponible' });
    }
  });

  if (deps.forceHttps) {
    app.use((req, res, next) => {
      if (req.secure) return next();
      res.redirect(308, new URL(req.originalUrl, deps.appUrl).href);
    });
  }

  // ENF-5.1 — en-têtes de sécurité et politique de sécurité de contenu restrictive.
  app.use(helmet());
  if (!indexable) {
    app.use((_req, res, next) => {
      res.set('X-Robots-Tag', 'noindex, nofollow');
      next();
    });
  }
  // ENF-2.1 — compression des réponses textuelles (HTML, JSON, JS, CSS, SVG).
  app.use(compression());

  // Les images portent un nom unique : elles sont immuables et mises en cache longtemps.
  app.use('/media', express.static(deps.mediaDir, { index: false, maxAge: '365d', immutable: true }));
  app.use('/media', (_req, res) => {
    res.status(404).end();
  });

  const api = express.Router();
  api.use(express.json({ limit: '64kb' }));
  api.use(cookieParser());
  api.use(sameOrigin(deps.appUrl));
  // Avant toute identification : une vue de page ne lit ni ne dépose aucun cookie (ENF-6.4).
  api.use(telemetryRouter(deps.audience));
  api.use(currentUser(deps.sessions, deps.users));
  api.use(playerIdentity(deps.secureCookies ?? false));
  api.use('/auth', authRouter(deps.auth, deps.sessions));
  api.use('/me', meRouter(deps.auth, deps.records, deps.sessions));
  api.use('/admin', adminRouter(deps.admin, deps.audience));
  api.use('/categories', categoriesRouter(deps.categories, deps.media));
  api.use('/credits', creditsRouter(deps.categories));
  // ENF-1.3 — limitation du débit d'ouverture de parties.
  api.post(
    '/games',
    rateLimit({
      windowMs: 60_000,
      max: 30,
      key: (req) => `${req.ip}:${req.res?.locals.player?.key}`,
      message: 'Trop de parties ouvertes en peu de temps. Patientez une minute.',
    }),
  );
  api.use('/games', gamesRouter(deps.games));
  api.use(() => {
    throw new HttpError(404, 'route_introuvable', 'Point d’entrée inconnu.');
  });
  app.use('/api', api);

  // ENF-7 — référencement et partage social.
  const seo = new SeoService(deps.categories, deps.media);
  const social = new SocialImages(deps.categories, deps.media);
  app.get('/robots.txt', (_req, res) => {
    res.type('text/plain').send(robotsTxt(deps.appUrl, indexable));
  });
  app.get('/sitemap.xml', async (_req, res) => {
    res.type('application/xml').send(await seo.sitemap(deps.appUrl));
  });
  app.get('/og/recto.jpg', async (_req, res) => {
    sendImage(res, await social.site());
  });
  app.get(/^\/og\/categorie\/([a-z0-9-]+)\.jpg$/, async (req, res) => {
    const image = await social.category(String(req.params[0]));
    if (!image) throw new HttpError(404, 'categorie_introuvable', 'Catégorie introuvable.');
    sendImage(res, image);
  });

  const webDistDir = deps.webDistDir;
  const templateFile = webDistDir ? path.join(webDistDir, 'index.html') : null;
  if (webDistDir && templateFile && existsSync(templateFile)) {
    const template = readFileSync(templateFile, 'utf8');
    app.use(
      express.static(webDistDir, {
        index: false,
        // Fichiers produits par Vite, au nom haché : immuables. Les autres sont revalidés.
        setHeaders: (res, file) => {
          if (file.includes(`${path.sep}assets${path.sep}`)) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        },
      }),
    );
    app.get(/^\/(?!api\/|media\/|og\/).*/, async (req, res) => {
      const page = await seo.describe(req.path);
      res
        .status(page.status)
        .type('html')
        .set('Cache-Control', 'no-cache')
        .send(renderPage(template, page, deps.appUrl, indexable));
    });
  }

  app.use(errorHandler);
  return app;
}
