import { randomBytes } from 'node:crypto';
import type { RequestHandler } from 'express';

export const GUEST_COOKIE = 'recto_gid';
const GUEST_ID = /^[A-Za-z0-9_-]{22}$/;
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

/**
 * Identifie le joueur invité par un cookie opaque, pour que deux parties
 * consécutives d'un même joueur ne présentent pas le même tirage (EF-1.8).
 * Le lot 3 substituera l'identifiant du compte quand le joueur est connecté.
 */
export function playerIdentity(secureCookie: boolean): RequestHandler {
  return (req, res, next) => {
    let guestId: unknown = req.cookies?.[GUEST_COOKIE];
    if (typeof guestId !== 'string' || !GUEST_ID.test(guestId)) {
      guestId = randomBytes(16).toString('base64url');
      res.cookie(GUEST_COOKIE, guestId, {
        httpOnly: true,
        sameSite: 'lax',
        secure: secureCookie,
        maxAge: ONE_YEAR_MS,
        path: '/api',
      });
    }
    res.locals.playerKey = `invite:${guestId as string}`;
    next();
  };
}
