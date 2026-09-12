import type { RequestHandler } from 'express';
import { HttpError } from './httpError';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Défense en profondeur contre les requêtes intersites, en plus de SameSite : une
 * requête d'écriture qui annonce une origine étrangère est refusée. Sont admises
 * l'origine publique du site (APP_URL) et l'hôte effectivement joint, y compris
 * derrière un proxy (serveur de développement, plateforme d'hébergement).
 */
export function sameOrigin(appUrl: string): RequestHandler {
  const allowed = new URL(appUrl).origin;
  return (req, _res, next) => {
    const origin = req.headers.origin;
    if (SAFE_METHODS.has(req.method) || !origin || origin === allowed) return next();
    let host: string | null = null;
    try {
      host = new URL(origin).host;
    } catch {
      host = null;
    }
    const forwarded = req.headers['x-forwarded-host'];
    const hosts = [req.headers.host, ...(Array.isArray(forwarded) ? forwarded : [forwarded])];
    if (host === null || !hosts.includes(host)) {
      throw new HttpError(403, 'origine_refusee', 'Requête d’une origine non autorisée.');
    }
    next();
  };
}
