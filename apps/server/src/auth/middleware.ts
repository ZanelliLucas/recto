import type { RequestHandler, Response } from 'express';
import { HttpError } from '../http/httpError';
import { SESSION_COOKIE, type SessionManager } from './sessions';
import type { SqlUserRepository, UserRecord } from './userRepository';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Locals {
      /** Compte connecté, s'il y en a un. */
      user?: UserRecord;
      /** Identifiant opaque du navigateur invité (cookie). */
      guestId?: string;
      /** Joueur au sens du jeu : clé de tirage et compte éventuel. */
      player?: { key: string; userId: string | null };
    }
  }
}

/** Reconnaît le compte connecté ; une session révoquée ou invalide est effacée. */
export function currentUser(sessions: SessionManager, users: SqlUserRepository): RequestHandler {
  return async (req, res, next) => {
    const token: unknown = req.cookies?.[SESSION_COOKIE];
    if (token) {
      const claims = await sessions.read(token);
      const user = claims ? await users.findById(claims.userId) : undefined;
      if (user && claims && user.tokenVersion === claims.version) res.locals.user = user;
      else sessions.close(res);
    }
    next();
  };
}

export const requireUser: RequestHandler = (_req, res, next) => {
  if (!res.locals.user) throw new HttpError(401, 'non_authentifie', 'Connexion requise.');
  next();
};

/** EF-7.5 — back-office réservé au rôle administrateur. */
export const requireAdmin: RequestHandler = (_req, res, next) => {
  if (!res.locals.user) throw new HttpError(401, 'non_authentifie', 'Connexion requise.');
  if (res.locals.user.role !== 'admin') throw new HttpError(403, 'acces_refuse', 'Accès réservé aux administrateurs.');
  next();
};

export function userOf(res: Response): UserRecord {
  const { user } = res.locals;
  if (!user) throw new HttpError(401, 'non_authentifie', 'Connexion requise.');
  return user;
}
