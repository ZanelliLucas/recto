import { Router } from 'express';
import { z } from 'zod';
import type { AudienceService } from '../audience/audienceService';
import { rateLimit } from '../http/rateLimit';
import { parseBody } from '../http/validate';
import { logger } from '../logger';

/** Robots et outils d'analyse : leurs visites ne sont pas de l'audience. */
const AUTOMATED = /bot|crawl|spider|slurp|facebookexternalhit|preview|headless|lighthouse|pingdom|uptime/i;

const pageViewSchema = z.object({ path: z.string().min(1).max(300) });

const clientErrorSchema = z.object({
  message: z.string().max(500),
  stack: z.string().max(4000).optional(),
  path: z.string().max(300),
});

/** ENF-6.4 et § 7.5 — mesure d'audience sans cookie, erreurs survenues dans le navigateur. */
export function telemetryRouter(audience: AudienceService): Router {
  const router = Router();

  router.post(
    '/audience',
    rateLimit({ windowMs: 60_000, max: 60, key: (req) => `audience:${req.ip}`, message: 'Trop de requêtes.' }),
    async (req, res) => {
      const { path } = parseBody(pageViewSchema, req.body);
      if (!AUTOMATED.test(req.get('user-agent') ?? '')) await audience.record(path);
      res.status(204).end();
    },
  );

  router.post(
    '/client-errors',
    rateLimit({ windowMs: 60_000, max: 10, key: (req) => `client-errors:${req.ip}`, message: 'Trop de requêtes.' }),
    (req, res) => {
      const report = parseBody(clientErrorSchema, req.body);
      // Seul le gabarit de la page est journalisé : les paramètres peuvent porter un jeton.
      logger.warn('Erreur dans le navigateur', {
        message: report.message,
        stack: report.stack,
        path: report.path.split(/[?#]/)[0],
        userAgent: req.get('user-agent')?.slice(0, 200),
      });
      res.status(204).end();
    },
  );

  return router;
}
