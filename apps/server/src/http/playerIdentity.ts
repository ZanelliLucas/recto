import { randomBytes } from 'node:crypto';
import type { RequestHandler } from 'express';

export const GUEST_COOKIE = 'recto_gid';
const GUEST_ID = /^[A-Za-z0-9_-]{22}$/;
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

export const guestKey = (guestId: string) => `invite:${guestId}`;

/**
 * Identifie le joueur : le compte connecté, sinon le navigateur invité (cookie opaque).
 * La clé sert au renouvellement du tirage (EF-1.8) ; le cookie invité permet aussi de
 * rattacher à un compte les parties jouées avant l'inscription (EF-4.4).
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
    const id = guestId as string;
    const { user } = res.locals;
    res.locals.guestId = id;
    res.locals.player = user ? { key: `compte:${user.id}`, userId: user.id } : { key: guestKey(id), userId: null };
    next();
  };
}
